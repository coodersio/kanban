import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from 'lucide-react';

// --- Types ---
interface Department {
    id: number;
    name: string;
}

interface ProjectType {
    id: number;
    name: string;
    description: string;
}

// --- Components ---

function DepartmentsTab() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Department | null>(null);
    const [name, setName] = useState('');

    const fetchData = async () => {
        const res = await fetch('/api/departments');
        if (res.ok) setDepartments(await res.json());
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingItem ? `/api/departments/${editingItem.id}` : '/api/departments';
        const method = editingItem ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        setIsOpen(false);
        setEditingItem(null);
        setName('');
        fetchData();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除这个部门吗？')) return;
        await fetch(`/api/departments/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const openEdit = (item: Department) => {
        setEditingItem(item);
        setName(item.name);
        setIsOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">部门列表</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">管理组织部门信息</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingItem(null); setName(''); }} className="gap-2">
                            <Plus className="w-4 h-4" />
                            添加部门
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? '编辑部门' : '添加新部门'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="dept-name">部门名称 *</Label>
                                <Input id="dept-name" value={name} onChange={e => setName(e.target.value)} placeholder="请输入部门名称" required />
                            </div>
                            <DialogFooter className="gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
                                <Button type="submit">{editingItem ? '保存' : '创建'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>名称</TableHead>
                                <TableHead className="text-right w-[120px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {departments.map((dept) => (
                                <TableRow key={dept.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{dept.name}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(dept)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(dept.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {departments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-32 text-center">
                                        <p className="text-sm text-muted-foreground">暂无部门数据</p>
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

function ProjectTypesTab() {
    const [types, setTypes] = useState<ProjectType[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ProjectType | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const fetchData = async () => {
        const res = await fetch('/api/project-types');
        if (res.ok) setTypes(await res.json());
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingItem ? `/api/project-types/${editingItem.id}` : '/api/project-types';
        const method = editingItem ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        setIsOpen(false);
        setEditingItem(null);
        setFormData({ name: '', description: '' });
        fetchData();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除这个项目类型吗？')) return;
        await fetch(`/api/project-types/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const openEdit = (item: ProjectType) => {
        setEditingItem(item);
        setFormData({ name: item.name, description: item.description });
        setIsOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">项目类型列表</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">管理项目分类类型</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingItem(null); setFormData({ name: '', description: '' }); }} className="gap-2">
                            <Plus className="w-4 h-4" />
                            添加类型
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? '编辑项目类型' : '添加新项目类型'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="type-name">类型名称 *</Label>
                                <Input id="type-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="请输入类型名称" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type-desc">描述</Label>
                                <Input id="type-desc" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="请输入描述" />
                            </div>
                            <DialogFooter className="gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
                                <Button type="submit">{editingItem ? '保存' : '创建'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>名称</TableHead>
                                <TableHead>描述</TableHead>
                                <TableHead className="text-right w-[120px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {types.map((type) => (
                                <TableRow key={type.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{type.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{type.description}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(type)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(type.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {types.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center">
                                        <p className="text-sm text-muted-foreground">暂无项目类型数据</p>
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

export default function SettingsPage() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-foreground">系统设置</h2>
                <p className="text-sm text-muted-foreground mt-1">管理全局配置</p>
            </div>

            <Tabs defaultValue="departments" className="w-full">
                <TabsList className="bg-muted/50">
                    <TabsTrigger value="departments" className="text-sm">部门管理</TabsTrigger>
                    <TabsTrigger value="project-types" className="text-sm">项目类型</TabsTrigger>
                </TabsList>
                <TabsContent value="departments" className="mt-6">
                    <DepartmentsTab />
                </TabsContent>
                <TabsContent value="project-types" className="mt-6">
                    <ProjectTypesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
