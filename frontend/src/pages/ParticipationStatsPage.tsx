import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import { BarChart3, CalendarRange, Copy, RefreshCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Member, ParticipationStatsRow, Sprint } from '@/types';

type CurrentUser = {
    id: number;
    role: string;
    displayName: string;
};

type ProjectMember = {
    memberId: number;
    memberName: string;
    role: '负责人' | '参与人';
};

type ProjectMilestone = {
    storyId: number;
    storyTitle: string;
    status: ParticipationStatsRow['status'];
    completedAt: string | null;
    sprintSortValue: number;
};

type ProjectGroup = {
    projectId: number;
    projectName: string;
    sprints: Array<{ id: number; name: string; sortValue: number }>;
    members: ProjectMember[];
    milestones: ProjectMilestone[];
};

function statusLabel(status: ParticipationStatsRow['status']) {
    switch (status) {
        case 'completed':
            return '已完成';
        case 'in_progress':
            return '进行中';
        case 'on_hold':
            return '暂停';
        default:
            return '未开始';
    }
}

function formatCompletedAt(value: string | null) {
    if (!value) return '—';
    return format(new Date(value), 'yyyy-MM-dd');
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeTsvCell(value: string) {
    if (!/["\t\n]/.test(value)) return value;
    return `"${value.replace(/"/g, '""')}"`;
}

function getSprintSortValue(sprintName: string, sprintId: number) {
    const match = sprintName.match(/(\d+)/);
    return match ? Number.parseInt(match[1], 10) : sprintId;
}

export default function ParticipationStatsPage() {
    const { currentUser } = useOutletContext<{ currentUser: CurrentUser | null }>();
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedSprintIds, setSelectedSprintIds] = useState<number[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
    const [rows, setRows] = useState<ParticipationStatsRow[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [filtersReady, setFiltersReady] = useState(false);
    const [querying, setQuerying] = useState(false);
    const [copyMessage, setCopyMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const isExternal = currentUser?.role === 'external';

    useEffect(() => {
        if (!currentUser) return;

        const fetchFilters = async () => {
            try {
                setLoadingFilters(true);
                setError(null);

                const [sprintRes, memberRes] = await Promise.all([
                    fetch('/api/sprints'),
                    fetch('/api/users')
                ]);

                if (!sprintRes.ok || !memberRes.ok) {
                    throw new Error('筛选数据加载失败');
                }

                const sprintData: Sprint[] = await sprintRes.json();
                const memberData: Member[] = await memberRes.json();

                const availableSprints = sprintData.filter((sprint) => sprint.id > 0);
                const availableMembers = isExternal
                    ? memberData.filter((member) => member.id === currentUser.id)
                    : memberData.filter((member) => member.role !== 'external');

                setSprints(availableSprints);
                setMembers(availableMembers);
                setSelectedSprintIds([]);
                setSelectedMemberIds(availableMembers.map((member) => member.id));
                setFiltersReady(true);
            } catch (fetchError) {
                console.error('Error fetching participation stats filters:', fetchError);
                setError('筛选条件加载失败，请刷新页面重试');
            } finally {
                setLoadingFilters(false);
            }
        };

        fetchFilters();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser || !filtersReady) return;

        if (selectedSprintIds.length === 0 || selectedMemberIds.length === 0) {
            setRows([]);
            setError(null);
            setCopyMessage('');
            return;
        }

        fetchStats(selectedSprintIds, selectedMemberIds);
    }, [currentUser, filtersReady, selectedSprintIds, selectedMemberIds]);

    const sprintAllSelected = sprints.length > 0 && selectedSprintIds.length === sprints.length;
    const memberAllSelected = members.length > 0 && selectedMemberIds.length === members.length;

    const selectedSprintText = useMemo(() => {
        if (selectedSprintIds.length === 0) return '已选：未选择';
        if (sprintAllSelected) return '已选：全部迭代';
        return `已选：${sprints
            .filter((sprint) => selectedSprintIds.includes(sprint.id))
            .map((sprint) => sprint.name)
            .join(', ')}`;
    }, [selectedSprintIds, sprints, sprintAllSelected]);

    const selectedMemberText = useMemo(() => {
        if (selectedMemberIds.length === 0) return '已选：未选择';
        if (memberAllSelected) return '已选：全部成员';
        return `已选：${members
            .filter((member) => selectedMemberIds.includes(member.id))
            .map((member) => member.display_name)
            .join(', ')}`;
    }, [selectedMemberIds, members, memberAllSelected]);

    const projectGroups = useMemo<ProjectGroup[]>(() => {
        const groups = new Map<number, {
            projectId: number;
            projectName: string;
            sprints: Map<number, { id: number; name: string; sortValue: number }>;
            members: Map<number, ProjectMember>;
            milestones: Map<number, ProjectMilestone>;
        }>();

        rows.forEach((row) => {
            const sprintSortValue = getSprintSortValue(row.sprintName, row.sprintId);
            let group = groups.get(row.projectId);

            if (!group) {
                group = {
                    projectId: row.projectId,
                    projectName: row.projectName,
                    sprints: new Map(),
                    members: new Map(),
                    milestones: new Map()
                };
                groups.set(row.projectId, group);
            }

            group.sprints.set(row.sprintId, {
                id: row.sprintId,
                name: row.sprintName,
                sortValue: sprintSortValue
            });

            const currentMember = group.members.get(row.memberId);
            if (!currentMember || row.role === '负责人') {
                group.members.set(row.memberId, {
                    memberId: row.memberId,
                    memberName: row.memberName,
                    role: row.role === '负责人' ? '负责人' : currentMember?.role ?? '参与人'
                });
            }

            const currentMilestone = group.milestones.get(row.storyId);
            if (!currentMilestone || sprintSortValue > currentMilestone.sprintSortValue) {
                group.milestones.set(row.storyId, {
                    storyId: row.storyId,
                    storyTitle: row.storyTitle,
                    status: row.status,
                    completedAt: row.completedAt,
                    sprintSortValue
                });
            }
        });

        return Array.from(groups.values()).map((group) => ({
            projectId: group.projectId,
            projectName: group.projectName,
            sprints: Array.from(group.sprints.values())
                .sort((a, b) => a.sortValue - b.sortValue),
            members: Array.from(group.members.values())
                .sort((a, b) => a.memberName.localeCompare(b.memberName, 'zh-CN')),
            milestones: Array.from(group.milestones.values())
                .sort((a, b) => {
                    const aPending = !a.completedAt;
                    const bPending = !b.completedAt;

                    if (aPending && !bPending) return -1;
                    if (!aPending && bPending) return 1;

                    if (a.completedAt && b.completedAt) {
                        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
                    }

                    return b.sprintSortValue - a.sprintSortValue || a.storyTitle.localeCompare(b.storyTitle, 'zh-CN');
                })
        }));
    }, [rows]);

    const displaySummary = useMemo(() => ({
        projectCount: projectGroups.length,
        milestoneCount: projectGroups.reduce((sum, group) => sum + group.milestones.length, 0),
        memberCount: new Set(
            projectGroups.flatMap((group) => group.members.map((member) => member.memberId))
        ).size
    }), [projectGroups]);

    async function fetchStats(sprintIds: number[], memberIds: number[]) {
        try {
            setQuerying(true);
            setError(null);
            setCopyMessage('');

            const params = new URLSearchParams();
            if (sprintIds.length > 0) {
                params.set('sprintIds', sprintIds.join(','));
            }
            if (memberIds.length > 0) {
                params.set('memberIds', memberIds.join(','));
            }

            const res = await fetch(`/api/participation-stats?${params.toString()}`);
            if (!res.ok) {
                throw new Error('统计数据加载失败');
            }

            const data = await res.json();
            setRows(data.rows || []);
        } catch (fetchError) {
            console.error('Error fetching participation stats:', fetchError);
            setRows([]);
            setError('统计数据加载失败，请稍后重试');
        } finally {
            setQuerying(false);
        }
    }

    function toggleSelection(
        id: number,
        selectedIds: number[],
        allIds: number[],
        setter: (ids: number[]) => void
    ) {
        const nextIds = selectedIds.includes(id)
            ? selectedIds.filter((item) => item !== id)
            : [...selectedIds, id];

        setter(nextIds);
    }

    function toggleAllSelection(
        selectedIds: number[],
        allIds: number[],
        setter: (ids: number[]) => void
    ) {
        setter(selectedIds.length === allIds.length ? [] : allIds);
    }

    function resetFilters() {
        setSelectedSprintIds([]);
        setSelectedMemberIds(members.map((member) => member.id));
    }

    async function copyToExcel() {
        if (projectGroups.length === 0) {
            setCopyMessage('当前没有可复制的数据');
            return;
        }

        const header = ['项目名称', '关键节点', '参与迭代', '成员'];
        const body = projectGroups.map((project) => {
            const milestoneLines = project.milestones
                .map((milestone, index) => `${index + 1}）${milestone.storyTitle} | ${statusLabel(milestone.status)} | ${formatCompletedAt(milestone.completedAt)}`);

            return {
                projectName: project.projectName,
                milestonesText: milestoneLines.join('\n'),
                milestonesHtml: milestoneLines.map((line) => `<div>${escapeHtml(line)}</div>`).join(''),
                sprints: project.sprints.map((sprint) => sprint.name).join(', '),
                members: project.members.map((member) => `${member.memberName}(${member.role})`).join('，')
            };
        });

        const tsv = [
            header.map(escapeTsvCell),
            ...body.map((row) => [
                escapeTsvCell(row.projectName),
                escapeTsvCell(row.milestonesText),
                escapeTsvCell(row.sprints),
                escapeTsvCell(row.members)
            ])
        ]
            .map((line) => line.join('\t'))
            .join('\n');

        const html = `
            <table>
                <thead>
                    <tr>${header.map((title) => `<th>${escapeHtml(title)}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${body.map((row) => `
                        <tr>
                            <td>${escapeHtml(row.projectName)}</td>
                            <td>${row.milestonesHtml}</td>
                            <td>${escapeHtml(row.sprints)}</td>
                            <td>${escapeHtml(row.members)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        try {
            if (navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
                const clipboardItem = new ClipboardItem({
                    'text/plain': new Blob([tsv], { type: 'text/plain' }),
                    'text/html': new Blob([html], { type: 'text/html' })
                });
                await navigator.clipboard.write([clipboardItem]);
            } else {
                await navigator.clipboard.writeText(tsv);
            }
            setCopyMessage(`已复制 ${projectGroups.length} 条项目记录，可直接粘贴到 Excel`);
        } catch (copyError) {
            console.error('Error copying participation stats:', copyError);
            setCopyMessage('复制失败，请检查浏览器剪贴板权限');
        }
    }

    if (!currentUser || loadingFilters) {
        return (
            <div className="p-6 flex items-center justify-center h-96 text-muted-foreground">
                加载中...
            </div>
        );
    }

    const emptyStateMessage = error
        || (selectedSprintIds.length === 0 && selectedMemberIds.length === 0
            ? '请选择至少一个迭代和一个成员'
            : selectedSprintIds.length === 0
                ? '请选择至少一个迭代'
                : selectedMemberIds.length === 0
                    ? '请选择至少一个成员'
                    : '当前筛选条件下暂无数据');

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold text-foreground">参与项目统计</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            统计多个迭代中，指定成员参与的项目、关键节点和完成时间
                        </p>
                    </div>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardContent className="pt-6 space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <CalendarRange className="w-4 h-4 text-primary" />
                            迭代
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto pb-1">
                            <div className="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant={sprintAllSelected ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleAllSelection(
                                    selectedSprintIds,
                                    sprints.map((sprint) => sprint.id),
                                    setSelectedSprintIds
                                )}
                            >
                                全部
                            </Button>
                            {sprints.map((sprint) => (
                                <Button
                                    key={sprint.id}
                                    type="button"
                                    variant={selectedSprintIds.includes(sprint.id) ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleSelection(
                                        sprint.id,
                                        selectedSprintIds,
                                        sprints.map((item) => item.id),
                                        setSelectedSprintIds
                                    )}
                                >
                                    {sprint.name}
                                </Button>
                            ))}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                {selectedSprintText}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Users className="w-4 h-4 text-primary" />
                            成员
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto pb-1">
                            <div className="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant={memberAllSelected ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleAllSelection(
                                    selectedMemberIds,
                                    members.map((member) => member.id),
                                    setSelectedMemberIds
                                )}
                            >
                                全部
                            </Button>
                            {members.map((member) => (
                                <Button
                                    key={member.id}
                                    type="button"
                                    variant={selectedMemberIds.includes(member.id) ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleSelection(
                                        member.id,
                                        selectedMemberIds,
                                        members.map((item) => item.id),
                                        setSelectedMemberIds
                                    )}
                                >
                                    {member.display_name}
                                </Button>
                            ))}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                {selectedMemberText}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={resetFilters} disabled={querying}>
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                清空筛选
                            </Button>
                            <Button variant="outline" onClick={copyToExcel} disabled={projectGroups.length === 0}>
                                <Copy className="w-4 h-4 mr-2" />
                                复制到 Excel
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {copyMessage || '复制为制表符文本，粘贴到 Excel 可自动分列'}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">项目数</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{displaySummary.projectCount}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">关键节点数</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{displaySummary.milestoneCount}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">成员数</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{displaySummary.memberCount}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>项目名称</TableHead>
                                <TableHead>关键节点</TableHead>
                                <TableHead>参与迭代</TableHead>
                                <TableHead>成员</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projectGroups.map((project) => (
                                <TableRow key={project.projectId} className="hover:bg-muted/40">
                                    <TableCell className="font-medium text-foreground align-top">
                                        {project.projectName}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="space-y-2 py-1 text-sm leading-6 text-foreground">
                                            {project.milestones.map((milestone, index) => (
                                                <div key={milestone.storyId}>
                                                    <span className="font-semibold text-primary">{index + 1}）</span>
                                                    <span className="ml-1">{milestone.storyTitle}</span>
                                                    <span className="text-muted-foreground"> | </span>
                                                    <span>{statusLabel(milestone.status)}</span>
                                                    <span className="text-muted-foreground"> | </span>
                                                    <span>{formatCompletedAt(milestone.completedAt)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        {project.sprints.map((sprint) => sprint.name).join(', ')}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="flex flex-wrap gap-2">
                                            {project.members.map((member) => (
                                                <span
                                                    key={member.memberId}
                                                    className={
                                                        member.role === '负责人'
                                                            ? 'inline-flex rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700'
                                                            : 'inline-flex rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700'
                                                    }
                                                >
                                                    {member.memberName} / {member.role}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!querying && projectGroups.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <BarChart3 className="w-8 h-8 opacity-20" />
                                            <p className="text-sm">{emptyStateMessage}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
