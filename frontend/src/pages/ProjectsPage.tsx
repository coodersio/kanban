import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Briefcase, Filter, Search as SearchIcon } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface Project {
    id: number;
    name: string;
    description: string;
    department_id: number;
    project_type_id: number;
    department_name?: string;
    project_type_name?: string;
}

interface Option {
    id: number;
    name: string;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [departments, setDepartments] = useState<Option[]>([]);
    const [types, setTypes] = useState<Option[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        name: '', description: '', department_id: '', project_type_id: ''
    });

    const fetchProjects = async () => {
        const res = await fetch('/api/projects');
        if (res.ok) setProjects(await res.json());
    };

    const fetchOptions = async () => {
        const [dRes, tRes] = await Promise.all([
            fetch('/api/departments'),
            fetch('/api/project-types')
        ]);
        if (dRes.ok) setDepartments(await dRes.json());
        if (tRes.ok) setTypes(await tRes.json());
    };

    useEffect(() => {
        fetchProjects();
        fetchOptions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingItem ? `/api/projects/${editingItem.id}` : '/api/projects';
        const method = editingItem ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        setIsOpen(false);
        setEditingItem(null);
        setFormData({ name: '', description: '', department_id: '', project_type_id: '' });
        fetchProjects();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除该项目吗？')) return;
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        fetchProjects();
    };

    const openEdit = (item: Project) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description || '',
            department_id: item.department_id?.toString() || '',
            project_type_id: item.project_type_id?.toString() || ''
        });
        setIsOpen(true);
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">项目列表</h2>
                    <p className="text-sm text-muted-foreground mt-1">管理所有项目及其基本信息</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button
                            onClick={() => {
                                setEditingItem(null);
                                setFormData({ name: '', description: '', department_id: '', project_type_id: '' });
                            }}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            新建项目
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? '编辑项目' : '新建项目'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">项目名称 *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="请输入项目名称"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">项目描述</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="请输入项目描述（可选）"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dept">所属部门</Label>
                                    <Select value={formData.department_id} onValueChange={(val) => setFormData({ ...formData, department_id: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择部门" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(d => (
                                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">项目类型</Label>
                                    <Select value={formData.project_type_id} onValueChange={(val) => setFormData({ ...formData, project_type_id: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择类型" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {types.map(t => (
                                                <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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

            {/* Toolbar */}
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="搜索项目..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Filter className="w-4 h-4" />
                            筛选
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Projects Table */}
            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>项目名称</TableHead>
                                <TableHead>所属部门</TableHead>
                                <TableHead>项目类型</TableHead>
                                <TableHead className="text-right w-[120px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProjects.map((proj) => (
                                <TableRow key={proj.id} className="hover:bg-muted/50">
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        #{proj.id}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                                <Briefcase className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{proj.name}</span>
                                                {proj.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5 max-w-md">
                                                        {proj.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{proj.department_name || '-'}</span>
                                    </TableCell>
                                    <TableCell>
                                        {proj.project_type_name && (
                                            <Badge variant="secondary" className="font-normal">
                                                {proj.project_type_name}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => openEdit(proj)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(proj.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredProjects.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <Briefcase className="w-8 h-8 opacity-20" />
                                            <p className="text-sm">暂无项目数据</p>
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
