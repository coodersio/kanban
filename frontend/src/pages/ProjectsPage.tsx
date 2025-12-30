import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Briefcase, Search as SearchIcon, AlertTriangle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import StoriesManager from "./components/StoriesManager";
import { usePermissions, Permission } from '@/hooks/usePermissions';

interface Project {
    id: number;
    name: string;
    description: string;
    department_id: number;
    project_type_id: number;
    department_name?: string;
    project_type_name?: string;
    owner_id?: number;
    owner_name?: string;
    source?: string;
}

interface Option {
    id: number;
    name: string;
}

export default function ProjectsPage() {
    const { hasPermission } = usePermissions();
    const [projects, setProjects] = useState<Project[]>([]);
    const [departments, setDepartments] = useState<Option[]>([]);
    const [types, setTypes] = useState<Option[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        name: '', description: '', department_id: '', project_type_id: '', owner_id: '0', source: ''
    });

    // Delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [deleteImpact, setDeleteImpact] = useState<any>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const fetchProjects = async () => {
        const res = await fetch('/api/projects');
        if (res.ok) setProjects(await res.json());
    };

    const fetchOptions = async () => {
        const [dRes, tRes, uRes] = await Promise.all([
            fetch('/api/departments'),
            fetch('/api/project-types'),
            fetch('/api/users')
        ]);
        if (dRes.ok) setDepartments(await dRes.json());
        if (tRes.ok) setTypes(await tRes.json());
        if (uRes.ok) {
            const userData = await uRes.json();
            setUsers(userData.filter((u: any) => u.role !== 'external'));
        }
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
        setFormData({ name: '', description: '', department_id: '', project_type_id: '', owner_id: '0', source: '' });
        fetchProjects();
    };

    const handleDeleteClick = async (project: Project) => {
        try {
            const res = await fetch(`/api/projects/${project.id}/delete-impact`);
            if (res.ok) {
                const impact = await res.json();
                setProjectToDelete(project);
                setDeleteImpact(impact);
                setDeleteConfirmText('');
                setDeleteDialogOpen(true);
            } else {
                alert('获取删除影响信息失败');
            }
        } catch (err) {
            console.error('Error fetching delete impact:', err);
            alert('获取删除影响信息失败');
        }
    };

    const handleConfirmDelete = async () => {
        if (!projectToDelete || deleteConfirmText !== 'DELETE') return;

        try {
            const res = await fetch(`/api/projects/${projectToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('删除成功');
                setDeleteDialogOpen(false);
                setProjectToDelete(null);
                setDeleteImpact(null);
                setDeleteConfirmText('');
                if (selectedProject?.id === projectToDelete.id) {
                    setSelectedProject(null);
                }
                fetchProjects();
            } else {
                alert('删除失败，请重试');
            }
        } catch (err) {
            console.error('Error deleting project:', err);
            alert('删除失败，请重试');
        }
    };

    const openEdit = (item: Project) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description || '',
            department_id: item.department_id?.toString() || '',
            project_type_id: item.project_type_id?.toString() || '',
            owner_id: item.owner_id?.toString() || '0',
            source: item.source || ''
        });
        setIsOpen(true);
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            {/* Left Panel: Projects List */}
            <div className="w-[400px] border-r flex flex-col bg-muted/30">
                <div className="p-6 border-b bg-background">
                    <h2 className="text-xl font-semibold">项目与关键节点</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        选择项目管理关键节点
                    </p>
                </div>

                {hasPermission(Permission.CREATE_PROJECT) && (
                    <div className="p-4 border-b">
                        <Button
                            onClick={() => {
                                setEditingItem(null);
                                setFormData({ name: '', description: '', department_id: '', project_type_id: '', owner_id: '0', source: '' });
                                setIsOpen(true);
                            }}
                            className="w-full gap-2"
                            size="sm"
                        >
                            <Plus className="w-4 h-4" />
                            新建项目
                        </Button>
                    </div>
                )}

                <div className="p-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="搜索项目..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredProjects.map((proj) => (
                        <div
                            key={proj.id}
                            onClick={() => setSelectedProject(proj)}
                            className={cn(
                                "p-4 rounded-lg border cursor-pointer transition-all",
                                selectedProject?.id === proj.id
                                    ? "bg-primary/10 border-primary shadow-sm"
                                    : "bg-background hover:bg-muted/50 border-border"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                    selectedProject?.id === proj.id ? "bg-primary/20" : "bg-muted"
                                )}>
                                    <Briefcase className={cn(
                                        "w-5 h-5",
                                        selectedProject?.id === proj.id ? "text-primary" : "text-muted-foreground"
                                    )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold text-sm line-clamp-1">{proj.name}</h3>
                                        <div className="flex gap-1">
                                            {hasPermission(Permission.EDIT_PROJECT) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEdit(proj);
                                                    }}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </Button>
                                            )}
                                            {hasPermission(Permission.DELETE_PROJECT) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(proj);
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {proj.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                            {proj.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {proj.department_name && (
                                            <Badge variant="outline" className="text-[10px]">
                                                {proj.department_name}
                                            </Badge>
                                        )}
                                        {proj.project_type_name && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                {proj.project_type_name}
                                            </Badge>
                                        )}
                                        {proj.source && (
                                            <Badge variant="default" className="text-[10px]">
                                                {proj.source}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredProjects.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Briefcase className="w-12 h-12 text-muted-foreground/20 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {searchQuery ? '没有找到匹配的项目' : '暂无项目'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Stories Manager */}
            <div className="flex-1 flex flex-col bg-background">
                {selectedProject ? (
                    <StoriesManager
                        project={selectedProject}
                        onUpdate={fetchProjects}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <Briefcase className="w-16 h-16 text-muted-foreground/20 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">选择一个项目</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            在左侧选择一个项目来管理其关键节点和任务
                        </p>
                    </div>
                )}
            </div>

            {/* Project Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                                placeholder="例如：通用标检上位机"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">项目描述</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="简要描述项目内容..."
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="department">所属部门</Label>
                                <Select
                                    value={formData.department_id}
                                    onValueChange={(v) => setFormData({ ...formData, department_id: v })}
                                >
                                    <SelectTrigger id="department">
                                        <SelectValue placeholder="选择部门" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(d => (
                                            <SelectItem key={d.id} value={d.id.toString()}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">项目类型</Label>
                                <Select
                                    value={formData.project_type_id}
                                    onValueChange={(v) => setFormData({ ...formData, project_type_id: v })}
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder="选择类型" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {types.map(t => (
                                            <SelectItem key={t.id} value={t.id.toString()}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="owner">项目负责人</Label>
                            <Select
                                value={formData.owner_id}
                                onValueChange={(v) => setFormData({ ...formData, owner_id: v })}
                            >
                                <SelectTrigger id="owner">
                                    <SelectValue placeholder="选择负责人" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">未分配</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id.toString()}>
                                            {u.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="source">需求来源/项目对接人</Label>
                            <Input
                                id="source"
                                value={formData.source}
                                onChange={e => setFormData({ ...formData, source: e.target.value })}
                                placeholder="例如：张三 / XX部门"
                            />
                        </div>
                        <DialogFooter>
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            警告：即将彻底删除项目
                        </DialogTitle>
                        <DialogDescription className="text-left space-y-3 pt-4">
                            {projectToDelete && deleteImpact && (
                                <>
                                    <div className="p-3 bg-muted rounded-lg">
                                        <div className="font-medium">项目：{projectToDelete.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            ID: #{projectToDelete.id}
                                        </div>
                                        {projectToDelete.description && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {projectToDelete.description}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="font-semibold">将会删除：</p>
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                            <li>该项目本身</li>
                                            <li>{deleteImpact.story_count || 0} 个关键节点</li>
                                            <li>{deleteImpact.task_count || 0} 个关联的任务</li>
                                            {deleteImpact.sprint_count > 0 && (
                                                <li>从 {deleteImpact.sprint_count} 个迭代中移除：
                                                    <div className="ml-6 mt-1 text-xs text-muted-foreground">
                                                        {deleteImpact.sprints?.join(', ')}
                                                    </div>
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                        <p className="text-sm font-semibold text-destructive">
                                            ⚠️ 此操作不可恢复！
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-text-project" className="text-sm font-medium">
                                            请输入 <code className="px-1 py-0.5 bg-muted rounded">DELETE</code> 确认删除：
                                        </Label>
                                        <Input
                                            id="confirm-text-project"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            placeholder="输入 DELETE"
                                            className="font-mono"
                                        />
                                    </div>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setProjectToDelete(null);
                                setDeleteImpact(null);
                                setDeleteConfirmText('');
                            }}
                        >
                            取消
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={deleteConfirmText !== 'DELETE'}
                        >
                            确认删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
