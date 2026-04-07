import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import { BarChart3, CalendarRange, Copy, RefreshCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Member, ParticipationStatsRow, ParticipationStatsSummary, Sprint } from '@/types';

type CurrentUser = {
    id: number;
    role: string;
    displayName: string;
};

const EMPTY_SUMMARY: ParticipationStatsSummary = {
    projectCount: 0,
    milestoneCount: 0,
    memberCount: 0
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

function statusBadgeClass(status: ParticipationStatsRow['status']) {
    switch (status) {
        case 'completed':
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'in_progress':
            return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'on_hold':
            return 'bg-rose-100 text-rose-700 border-rose-200';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
}

function formatCompletedAt(value: string | null) {
    if (!value) return '—';
    return format(new Date(value), 'yyyy-MM-dd');
}

export default function ParticipationStatsPage() {
    const { currentUser } = useOutletContext<{ currentUser: CurrentUser | null }>();
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedSprintIds, setSelectedSprintIds] = useState<number[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
    const [rows, setRows] = useState<ParticipationStatsRow[]>([]);
    const [summary, setSummary] = useState<ParticipationStatsSummary>(EMPTY_SUMMARY);
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
            setSummary(EMPTY_SUMMARY);
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
            setSummary(data.summary || EMPTY_SUMMARY);
        } catch (fetchError) {
            console.error('Error fetching participation stats:', fetchError);
            setRows([]);
            setSummary(EMPTY_SUMMARY);
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
        if (rows.length === 0) {
            setCopyMessage('当前没有可复制的数据');
            return;
        }

        const header = ['项目名称', '迭代', '关键节点', '成员', '角色', '状态', '完成时间'];
        const body = rows.map((row) => [
            row.projectName,
            row.sprintName,
            row.storyTitle,
            row.memberName,
            row.role,
            statusLabel(row.status),
            row.completedAt ? formatCompletedAt(row.completedAt) : ''
        ]);

        const tsv = [header, ...body]
            .map((line) => line.join('\t'))
            .join('\n');

        try {
            await navigator.clipboard.writeText(tsv);
            setCopyMessage(`已复制 ${rows.length} 条记录，可直接粘贴到 Excel`);
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
                            <Button variant="outline" onClick={copyToExcel} disabled={rows.length === 0}>
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
                        <div className="text-3xl font-semibold">{summary.projectCount}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">关键节点数</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{summary.milestoneCount}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">成员数</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold">{summary.memberCount}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>项目名称</TableHead>
                                <TableHead>迭代</TableHead>
                                <TableHead>关键节点</TableHead>
                                <TableHead>成员</TableHead>
                                <TableHead>角色</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>完成时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={`${row.sprintId}-${row.projectId}-${row.storyId}-${row.memberId}`} className="hover:bg-muted/40">
                                    <TableCell className="font-medium text-foreground">{row.projectName}</TableCell>
                                    <TableCell>{row.sprintName}</TableCell>
                                    <TableCell>{row.storyTitle}</TableCell>
                                    <TableCell>{row.memberName}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'font-normal',
                                                row.role === '负责人'
                                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                    : 'bg-blue-100 text-blue-700 border-blue-200'
                                            )}
                                        >
                                            {row.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn('font-normal', statusBadgeClass(row.status))}>
                                            {statusLabel(row.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatCompletedAt(row.completedAt)}</TableCell>
                                </TableRow>
                            ))}
                            {!querying && rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
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
