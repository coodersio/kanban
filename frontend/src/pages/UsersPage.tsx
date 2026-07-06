import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, UserCircle, Shield, User as UserIcon } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { usePermissions, Permission } from '@/hooks/usePermissions';
import type { Group } from '@/types';

interface UserData {
    id: number;
    user_name: string;
    display_name: string;
    role: 'admin' | 'group_admin' | 'developer' | 'external';
    group_id?: number;
    group_name?: string;
    created_at?: string;
}

export default function UsersPage() {
    const { user: currentUser, hasPermission, isAdmin } = usePermissions();
    const [users, setUsers] = useState<UserData[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    const [formData, setFormData] = useState({
        user_name: '',
        display_name: '',
        password: '',
        role: 'developer',
        group_id: ''
    });

    const fetchUsers = async () => {
        const res = await fetch('/api/users');
        if (res.ok) setUsers(await res.json());
    };

    const fetchGroups = async () => {
        const res = await fetch('/api/groups');
        if (res.ok) {
            const data = await res.json();
            setGroups(data);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchGroups();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        const method = editingUser ? 'PUT' : 'POST';

        // For PUT (edit), don't send user_name (it's not allowed to be changed)
        // For POST (create), include user_name
        const payload = editingUser
            ? { display_name: formData.display_name, role: formData.role, password: formData.password, group_id: formData.group_id || undefined }
            : formData;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setIsOpen(false);
            setEditingUser(null);
            setFormData({ user_name: '', display_name: '', password: '', role: 'developer', group_id: '' });
            fetchUsers();
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除该成员吗？')) return;
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        fetchUsers();
    }

    const openEdit = (user: UserData) => {
        setEditingUser(user);
        setFormData({
            user_name: user.user_name,
            display_name: user.display_name,
            password: '',
            role: user.role,
            group_id: user.group_id ? String(user.group_id) : ''
        });
        setIsOpen(true);
    }

    const getRoleBadge = (role: string) => {
        const config = {
            admin: { label: '管理员', icon: Shield, className: 'bg-purple-100 text-purple-700 border-purple-200' },
            group_admin: { label: '小组管理员', icon: Shield, className: 'bg-amber-100 text-amber-700 border-amber-200' },
            developer: { label: '开发者', icon: UserIcon, className: 'bg-blue-100 text-blue-700 border-blue-200' },
            external: { label: '外部成员', icon: UserCircle, className: 'bg-slate-100 text-slate-700 border-slate-200' }
        };
        const { label, icon: Icon, className } = config[role as keyof typeof config] || config.developer;
        return (
            <Badge variant="outline" className={cn('font-normal gap-1', className)}>
                <Icon className="w-3 h-3" />
                {label}
            </Badge>
        );
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">团队成员</h2>
                    <p className="text-sm text-muted-foreground mt-1">管理团队成员及其权限</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    {hasPermission(Permission.CREATE_USER) && (
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => {
                                    setEditingUser(null);
                                    setFormData({ user_name: '', display_name: '', password: '', role: 'developer', group_id: '' });
                                }}
                                className="gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                添加成员
                            </Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingUser ? '编辑成员' : '添加新成员'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="user_name">用户名 *</Label>
                                <Input
                                    id="user_name"
                                    value={formData.user_name}
                                    onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                                    disabled={!!editingUser}
                                    placeholder="用于登录的用户名"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="display_name">显示名称 *</Label>
                                <Input
                                    id="display_name"
                                    value={formData.display_name}
                                    onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                                    placeholder="显示的姓名"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">角色</Label>
                                <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择角色" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isAdmin() && <SelectItem value="admin">管理员</SelectItem>}
                                        {isAdmin() && <SelectItem value="group_admin">小组管理员</SelectItem>}
                                        <SelectItem value="developer">开发者</SelectItem>
                                        <SelectItem value="external">外部成员</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {isAdmin() && (
                                <div className="space-y-2">
                                    <Label htmlFor="group_id">所属小组</Label>
                                    <Select value={formData.group_id} onValueChange={(val) => setFormData({ ...formData, group_id: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择小组" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {groups.map(group => (
                                                <SelectItem key={group.id} value={String(group.id)}>{group.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="password">
                                    {editingUser ? '新密码（可选）' : '密码 *'}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={editingUser ? '留空则不修改' : '请设置登录密码'}
                                    required={!editingUser}
                                />
                            </div>
                            <DialogFooter className="gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    取消
                                </Button>
                                <Button type="submit">
                                    {editingUser ? '保存' : '创建'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Users Table */}
            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[300px]">成员</TableHead>
                                <TableHead>角色</TableHead>
                                <TableHead>小组</TableHead>
                                <TableHead>加入时间</TableHead>
                                <TableHead className="text-right w-[120px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border-2 border-background ring-1 ring-border">
                                                <AvatarImage src={`https://i.pravatar.cc/150?u=${user.id}`} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                    {user.display_name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-sm">{user.display_name}</div>
                                                <div className="text-xs text-muted-foreground">@{user.user_name}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getRoleBadge(user.role)}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {user.group_name || currentUser?.groupName || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {user.created_at ? format(new Date(user.created_at), 'PPP', { locale: zhCN }) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {hasPermission(Permission.EDIT_USER) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => openEdit(user)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {hasPermission(Permission.DELETE_USER) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDelete(user.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <UserCircle className="w-8 h-8 opacity-20" />
                                            <p className="text-sm">暂无成员数据</p>
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
