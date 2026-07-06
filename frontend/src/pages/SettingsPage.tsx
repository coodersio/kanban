import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import type { Group } from '@/types';

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

function GroupsTab() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState<Group[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Group | null>(null);
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const fetchData = async () => {
        const res = await fetch('/api/groups');
        if (res.ok) setGroups(await res.json());
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => {
        setEditingItem(null);
        setName('');
        setError('');
        setIsOpen(true);
    };

    const openEdit = (item: Group) => {
        setEditingItem(item);
        setName(item.name);
        setError('');
        setIsOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const url = editingItem ? `/api/groups/${editingItem.id}` : '/api/groups';
        const method = editingItem ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.message === 'Group name already exists' ? '小组名称已存在' : data.message || '保存失败');
            return;
        }

        setIsOpen(false);
        setEditingItem(null);
        setName('');
        fetchData();
    };

    const handleDelete = async (group: Group) => {
        const totalUsage = (group.user_count || 0) + (group.project_count || 0) + (group.sprint_count || 0);
        if (totalUsage > 0) {
            alert('该小组仍有关联成员、项目或迭代，不能删除。');
            return;
        }
        if (!confirm(`确定要删除小组「${group.name}」吗？`)) return;

        const res = await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.message === 'Group is still in use' ? '该小组仍在使用中，不能删除。' : data.message || '删除失败');
            return;
        }
        fetchData();
    };

    const addGroupAdmin = (group: Group) => {
        navigate(`/dashboard/users?open=new&role=group_admin&groupId=${group.id}`);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">小组列表</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">超级管理员维护小组，并为小组分配小组管理员</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="w-4 h-4" />
                        添加小组
                    </Button>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? '编辑小组' : '添加小组'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="group-name">小组名称 *</Label>
                                <Input
                                    id="group-name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="请输入小组名称"
                                    maxLength={100}
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
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
                                <TableHead>小组名称</TableHead>
                                <TableHead>小组管理员</TableHead>
                                <TableHead>数据量</TableHead>
                                <TableHead className="text-right w-[260px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groups.map((group) => {
                                const totalUsage = (group.user_count || 0) + (group.project_count || 0) + (group.sprint_count || 0);
                                return (
                                    <TableRow key={group.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">{group.name}</TableCell>
                                        <TableCell>
                                            {group.group_admin_names ? (
                                                <span className="text-sm">{group.group_admin_names}</span>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground font-normal">未设置</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="secondary" className="font-normal">成员 {group.user_count || 0}</Badge>
                                                <Badge variant="secondary" className="font-normal">项目 {group.project_count || 0}</Badge>
                                                <Badge variant="secondary" className="font-normal">迭代 {group.sprint_count || 0}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1"
                                                    onClick={() => addGroupAdmin(group)}
                                                >
                                                    <UserPlus className="w-3.5 h-3.5" />
                                                    添加小组管理员
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(group)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    disabled={totalUsage > 0}
                                                    title={totalUsage > 0 ? '该小组仍有关联数据，不能删除' : '删除小组'}
                                                    onClick={() => handleDelete(group)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {groups.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <Users className="w-8 h-8 opacity-20" />
                                            <p className="text-sm">暂无小组数据</p>
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
    const { user, isAdmin } = usePermissions();
    const [activeTab, setActiveTab] = useState('departments');

    useEffect(() => {
        if (isAdmin()) setActiveTab('groups');
    }, [user?.role]);

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-foreground">系统设置</h2>
                <p className="text-sm text-muted-foreground mt-1">管理全局配置和权限基础数据</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-muted/50">
                    {isAdmin() && <TabsTrigger value="groups" className="text-sm">小组管理</TabsTrigger>}
                    <TabsTrigger value="departments" className="text-sm">部门管理</TabsTrigger>
                    <TabsTrigger value="project-types" className="text-sm">项目类型</TabsTrigger>
                </TabsList>
                {isAdmin() && (
                    <TabsContent value="groups" className="mt-6">
                        <GroupsTab />
                    </TabsContent>
                )}
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
