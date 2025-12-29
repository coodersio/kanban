import { useState, useEffect } from 'react';
import type { Sprint } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, Play, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

export default function SprintsPage() {
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Sprint | null>(null);
    const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '', status: 'planning' });

    const fetchData = async () => {
        const res = await fetch('/api/sprints');
        if (res.ok) setSprints(await res.json());
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingItem ? `/api/sprints/${editingItem.id}` : '/api/sprints';
        const method = editingItem ? 'PUT' : 'POST';

        // For POST (create), don't send status (backend sets it to 'planned')
        // For PUT (update), include status
        const payload = editingItem
            ? formData
            : { name: formData.name, start_date: formData.start_date, end_date: formData.end_date };

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        setIsOpen(false);
        setEditingItem(null);
        setFormData({ name: '', start_date: '', end_date: '', status: 'planning' });
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
                    <DialogTrigger asChild>
                        <Button
                            onClick={() => {
                                setEditingItem(null);
                                setFormData({ name: '', start_date: '', end_date: '', status: 'planning' });
                            }}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            新建迭代
                        </Button>
                    </DialogTrigger>
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
                                    placeholder="例如: Sprint 58"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start">开始日期 *</Label>
                                    <Input
                                        type="date"
                                        id="start"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end">结束日期 *</Label>
                                    <Input
                                        type="date"
                                        id="end"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
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
                                            {format(new Date(sprint.start_date), 'yyyy-MM-dd')} 至 {format(new Date(sprint.end_date), 'yyyy-MM-dd')}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {sprint.status !== 'active' && (
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
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => openEdit(sprint)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(sprint.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
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
