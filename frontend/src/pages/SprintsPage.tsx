import { useState, useEffect } from 'react';
import type { Sprint } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, Play, Download } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { usePermissions, Permission } from '@/hooks/usePermissions';

export default function SprintsPage() {
    const { hasPermission } = usePermissions();
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Sprint | null>(null);
    const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '', status: 'planning' });
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [availableProjects, setAvailableProjects] = useState<any[]>([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);

    const fetchData = async () => {
        const res = await fetch('/api/sprints');
        if (res.ok) setSprints(await res.json());
    };

    const fetchActiveProjects = async () => {
        try {
            // Find current active sprint
            const activeSprint = sprints.find(s => s.status === 'active');

            if (activeSprint) {
                // Fetch projects for the active sprint
                const res = await fetch(`/api/workbench/sprint/${activeSprint.id}/projects`);
                if (res.ok) {
                    const projects = await res.json();
                    // Filter projects that are actually in the sprint (have priority/notes)
                    const activeProjects = projects.filter((p: any) => p.priority !== null || p.notes !== null);
                    setAvailableProjects(activeProjects);
                    // Select all by default
                    setSelectedProjectIds(activeProjects.map((p: any) => p.id));
                }
            } else {
                // If no active sprint, fetch all projects
                const res = await fetch('/api/projects');
                if (res.ok) {
                    const allProjects = await res.json();
                    setAvailableProjects(allProjects);
                    // Select all by default
                    setSelectedProjectIds(allProjects.map((p: any) => p.id));
                }
            }
        } catch (err) {
            console.error('Error fetching active projects:', err);
            setAvailableProjects([]);
            setSelectedProjectIds([]);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate dates for new sprint
        if (!editingItem && (!startDate || !endDate)) {
            alert('请选择开始和结束日期');
            return;
        }

        const url = editingItem ? `/api/sprints/${editingItem.id}` : '/api/sprints';
        const method = editingItem ? 'PUT' : 'POST';

        // For POST (create), don't send status (backend sets it to 'planned')
        // For PUT (update), include status
        const payload = editingItem
            ? formData
            : {
                name: formData.name,
                start_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
                end_date: endDate ? format(endDate, 'yyyy-MM-dd') : '',
                projectIds: selectedProjectIds
            };

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        setIsOpen(false);
        setEditingItem(null);
        setFormData({ name: '', start_date: '', end_date: '', status: 'planning' });
        setStartDate(undefined);
        setEndDate(undefined);
        setAvailableProjects([]);
        setSelectedProjectIds([]);
        fetchData();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除该迭代吗？')) return;
        await fetch(`/api/sprints/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const handleActivate = async (id: number) => {
        await fetch(`/api/sprints/${id}/activate`, { method: 'POST' });
        fetchData();
    };

    const handleExportSummary = async (sprintId: number) => {
        try {
            // Use new weekly report API
            const res = await fetch(`/api/reports/weekly?sprintId=${sprintId}&reportType=summary`);

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                // Extract filename from Content-Disposition header
                const disposition = res.headers.get('Content-Disposition');
                let filename = `周报-汇总-${new Date().toISOString().split('T')[0]}.xlsx`;
                if (disposition) {
                    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
                    }
                }

                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                alert('导出失败，请重试');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('导出失败，请重试');
        }
    };

    const handleExportPersonal = async (sprintId: number) => {
        try {
            const userRes = await fetch('/api/auth/me');
            const userData = await userRes.json();

            if (!userData.user || !userData.user.id) {
                alert('请先登录');
                return;
            }

            // Use personal report API
            const res = await fetch(`/api/reports/personal?sprintId=${sprintId}&userId=${userData.user.id}`);

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                // Extract filename from Content-Disposition header
                const disposition = res.headers.get('Content-Disposition');
                let filename = `周报-个人-${new Date().toISOString().split('T')[0]}.xlsx`;
                if (disposition) {
                    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
                    }
                }

                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                alert('导出失败，请重试');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('导出失败，请重试');
        }
    };

    const openEdit = (item: Sprint) => {
        setEditingItem(item);
        try {
            const start = item.start_date ? new Date(item.start_date).toISOString().split('T')[0] : '';
            const end = item.end_date ? new Date(item.end_date).toISOString().split('T')[0] : '';
            setFormData({ name: item.name, start_date: start, end_date: end, status: item.status });
            setIsOpen(true);
        } catch (e) {
            console.error(e);
        }
    };

    const getStatusBadge = (status: string) => {
        const config = {
            planning: { label: '计划中', className: 'bg-slate-100 text-slate-700 border-slate-200' },
            active: { label: '进行中', className: 'bg-blue-100 text-blue-700 border-blue-200' },
            closed: { label: '已完成', className: 'bg-green-100 text-green-700 border-green-200' }
        };
        const { label, className } = config[status as keyof typeof config] || config.planning;
        return <Badge variant="outline" className={cn('font-normal', className)}>{label}</Badge>;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">迭代列表</h2>
                    <p className="text-sm text-muted-foreground mt-1">管理项目迭代周期和时间线</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    {hasPermission(Permission.CREATE_SPRINT) && (
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => {
                                    setEditingItem(null);
                                    setFormData({ name: '', start_date: '', end_date: '', status: 'planning' });
                                    setStartDate(undefined);
                                    setEndDate(undefined);
                                    fetchActiveProjects();
                                }}
                                className="gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                新建迭代
                            </Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? '编辑迭代' : '新建迭代'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">迭代名称 *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="例如：W-52"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>开始日期 *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !startDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {startDate ? format(startDate, "PPP", { locale: zhCN }) : <span>选择开始日期</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={startDate}
                                                onSelect={setStartDate}
                                                initialFocus
                                                locale={zhCN}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>结束日期 *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !endDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {endDate ? format(endDate, "PPP", { locale: zhCN }) : <span>选择结束日期</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={endDate}
                                                onSelect={setEndDate}
                                                initialFocus
                                                locale={zhCN}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            {!editingItem && availableProjects.length > 0 && (
                                <div className="space-y-2 pt-2 border-t">
                                    <Label>关联项目</Label>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3 bg-muted/20">
                                        {availableProjects.map(project => (
                                            <div key={project.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`project-${project.id}`}
                                                    checked={selectedProjectIds.includes(project.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedProjectIds([...selectedProjectIds, project.id]);
                                                        } else {
                                                            setSelectedProjectIds(selectedProjectIds.filter(id => id !== project.id));
                                                        }
                                                    }}
                                                />
                                                <label
                                                    htmlFor={`project-${project.id}`}
                                                    className="text-sm cursor-pointer flex-1"
                                                >
                                                    {project.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        已选择 {selectedProjectIds.length} 个项目
                                    </p>
                                </div>
                            )}
                            <DialogFooter className="gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    取消
                                </Button>
                                <Button type="submit">
                                    {editingItem ? '保存' : '创建'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Sprints Table */}
            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>迭代名称</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>时间周期</TableHead>
                                <TableHead className="text-right w-[180px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sprints.map((sprint) => (
                                <TableRow key={sprint.id} className="hover:bg-muted/50">
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        #{sprint.id}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <CalendarIcon className="w-4 h-4 text-primary" />
                                            </div>
                                            <span className="font-medium text-sm">{sprint.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(sprint.status)}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-3 h-3" />
                                            {sprint.start_date && sprint.end_date ? (
                                                `${format(new Date(sprint.start_date), 'yyyy-MM-dd', { locale: zhCN })} 至 ${format(new Date(sprint.end_date), 'yyyy-MM-dd', { locale: zhCN })}`
                                            ) : (
                                                '未设置日期'
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Export Dropdown - 不显示给Backlog，根据权限控制 */}
                                            {sprint.id !== -1 && (hasPermission(Permission.EXPORT_SUMMARY_REPORT) || hasPermission(Permission.EXPORT_PERSONAL_REPORT)) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-1.5"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            导出
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {hasPermission(Permission.EXPORT_SUMMARY_REPORT) && (
                                                            <DropdownMenuItem onClick={() => handleExportSummary(sprint.id)}>
                                                                汇总周报
                                                            </DropdownMenuItem>
                                                        )}
                                                        {hasPermission(Permission.EXPORT_PERSONAL_REPORT) && (
                                                            <DropdownMenuItem onClick={() => handleExportPersonal(sprint.id)}>
                                                                个人周报
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}

                                            {/* 激活按钮 - 不显示给Backlog，仅Admin */}
                                            {sprint.id !== -1 && sprint.status !== 'active' && hasPermission(Permission.ACTIVATE_SPRINT) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1.5"
                                                    onClick={() => handleActivate(sprint.id)}
                                                >
                                                    <Play className="w-3 h-3" />
                                                    激活
                                                </Button>
                                            )}

                                            {/* 编辑按钮 - 不显示给Backlog，仅Admin */}
                                            {sprint.id !== -1 && hasPermission(Permission.EDIT_SPRINT) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => openEdit(sprint)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            )}

                                            {/* 删除按钮 - 不显示给Backlog，仅Admin */}
                                            {sprint.id !== -1 && hasPermission(Permission.DELETE_SPRINT) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDelete(sprint.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {sprints.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <CalendarIcon className="w-8 h-8 opacity-20" />
                                            <p className="text-sm">暂无迭代数据</p>
                                            <p className="text-xs">创建第一个迭代开始管理任务</p>
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
