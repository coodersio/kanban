import { useState, useEffect } from 'react';
import type { Sprint, Member, Project, Department, ProjectType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Helper function to convert priority between number and string
const normalizePriority = (priority: string | number | undefined): string => {
    if (typeof priority === 'string') return priority;
    if (typeof priority === 'number') {
        if (priority <= 1) return '高';
        if (priority <= 2) return '中';
        return '低';
    }
    return '中'; // default
};

interface ProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activeTab: 'create' | 'reuse';
    onTabChange: (tab: 'create' | 'reuse') => void;
    isEditMode: boolean;

    // For create/edit mode
    onSaveProject: (data: {
        name: string;
        description: string;
        departmentId: number | null;
        projectTypeId: number | null;
        ownerId: number | null;
        source: string;
        priority: string;
        notes: string;
        projectId?: number | null;
    }) => Promise<void>;

    // For reuse mode
    onReuseProject: (projectIds: number[], priority: string, notes: string) => Promise<void>;

    // For delete
    onDeleteProject?: () => Promise<void>;

    // Data
    sprints: Sprint[];
    members: Member[];
    departments: Department[];
    projectTypes: ProjectType[];
    selectedSprintId: string;

    // For edit mode
    editingProject?: Project | null;
}

export function ProjectDialog({
    open,
    onOpenChange,
    activeTab,
    onTabChange,
    isEditMode,
    onSaveProject,
    onReuseProject,
    onDeleteProject,
    sprints,
    members,
    departments,
    projectTypes,
    selectedSprintId,
    editingProject
}: ProjectDialogProps) {
    // Create/Edit mode state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [projectTypeId, setProjectTypeId] = useState<number | null>(null);
    const [ownerId, setOwnerId] = useState<number | null>(null);
    const [source, setSource] = useState('');
    const [priority, setPriority] = useState('中');
    const [notes, setNotes] = useState('');

    // Reuse mode state
    const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
    const [selectedReuseIds, setSelectedReuseIds] = useState<number[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');

    // Prevent duplicate submission
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load editing project data
    useEffect(() => {
        if (isEditMode && editingProject) {
            setName(editingProject.name);
            setDescription(editingProject.description);
            setDepartmentId(editingProject.department_id || null);
            setProjectTypeId(editingProject.project_type_id || null);
            setOwnerId(editingProject.owner_id || null);
            setSource(editingProject.source || '');
            setPriority(normalizePriority(editingProject.priority));
            setNotes(editingProject.notes || '');
        }
    }, [isEditMode, editingProject]);

    // Fetch available projects for reuse
    useEffect(() => {
        if (open && activeTab === 'reuse' && selectedSprintId) {
            fetch(`/api/workbench/projects/available?sprintId=${selectedSprintId}&search=`)
                .then(res => res.json())
                .then(data => setAvailableProjects(data))
                .catch(err => console.error('Error fetching available projects:', err));
        }
    }, [open, activeTab, selectedSprintId]);

    const resetForm = () => {
        setName('');
        setDescription('');
        setDepartmentId(null);
        setProjectTypeId(null);
        setOwnerId(null);
        setSource('');
        setPriority('中');
        setNotes('');
        setSelectedReuseIds([]);
        setSearchKeyword('');
    };

    // Filter projects by search keyword
    const filteredProjects = availableProjects.filter(p => {
        if (!searchKeyword.trim()) return true;
        const keyword = searchKeyword.toLowerCase();
        const name = (p.name || p.software_name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(keyword) || desc.includes(keyword);
    });

    const handleSave = async () => {
        if (!name || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSaveProject({
                name,
                description,
                departmentId,
                projectTypeId,
                ownerId,
                source,
                priority,
                notes,
                projectId: isEditMode && editingProject ? editingProject.id : null
            });
            resetForm();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReuse = async () => {
        if (selectedReuseIds.length === 0 || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onReuseProject(selectedReuseIds, priority, notes);
            resetForm();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {isEditMode ? '编辑项目' : '创建项目'}
                    </DialogTitle>
                </DialogHeader>

                <nav className="flex gap-4 border-b mb-4">
                    <button
                        onClick={() => onTabChange('create')}
                        className={cn(
                            "pb-2 text-sm font-medium transition-all border-b-2",
                            activeTab === 'create'
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        创建新项目
                    </button>
                    <button
                        onClick={() => onTabChange('reuse')}
                        className={cn(
                            "pb-2 text-sm font-medium transition-all border-b-2",
                            activeTab === 'reuse'
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        选用历史项目
                    </button>
                </nav>

                {activeTab === 'create' ? (
                    <div className="space-y-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="project-name" className="text-sm font-medium">项目名称</Label>
                            <Input
                                id="project-name"
                                placeholder="例如：通用标检平台"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="project-desc" className="text-sm font-medium">项目描述</Label>
                            <Textarea
                                id="project-desc"
                                placeholder="输入项目描述..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">所属部门</Label>
                            <Select value={departmentId?.toString() || ''} onValueChange={(v) => setDepartmentId(parseInt(v))}>
                                <SelectTrigger>
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
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">项目类型</Label>
                            <Select value={projectTypeId?.toString() || ''} onValueChange={(v) => setProjectTypeId(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择类型" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectTypes.map(t => (
                                        <SelectItem key={t.id} value={t.id.toString()}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">项目负责人</Label>
                            <Select value={ownerId?.toString() || '0'} onValueChange={(v) => setOwnerId(v === '0' ? null : parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择项目负责人" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">未分配</SelectItem>
                                    {members.filter(m => m.role !== 'external').map(m => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="project-source" className="text-sm font-medium">需求来源/项目对接人</Label>
                            <Input
                                id="project-source"
                                placeholder="例如：张三 / XX部门"
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">迭代优先级</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择优先级" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="高">高</SelectItem>
                                        <SelectItem value="中">中</SelectItem>
                                        <SelectItem value="低">低</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">迭代备注</Label>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="例如：本迭代关口"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {/* Search input */}
                        <div className="grid gap-2">
                            <Input
                                placeholder="搜索项目名称..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">选择项目（可多选）</Label>
                                {selectedReuseIds.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        已选 {selectedReuseIds.length} 项
                                    </span>
                                )}
                            </div>
                            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                                {filteredProjects.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground text-center">
                                        {searchKeyword ? '没有匹配的项目' : '没有可用的项目'}
                                    </div>
                                ) : (
                                    <div className="space-y-1 p-2">
                                        {filteredProjects.map(p => (
                                            <div
                                                key={p.id}
                                                className={cn(
                                                    "flex items-start gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50",
                                                    selectedReuseIds.includes(p.id) && "bg-primary/10"
                                                )}
                                                onClick={() => {
                                                    setSelectedReuseIds(prev =>
                                                        prev.includes(p.id)
                                                            ? prev.filter(id => id !== p.id)
                                                            : [...prev, p.id]
                                                    );
                                                }}
                                            >
                                                <Checkbox
                                                    checked={selectedReuseIds.includes(p.id)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedReuseIds(prev =>
                                                            checked
                                                                ? [...prev, p.id]
                                                                : prev.filter(id => id !== p.id)
                                                        );
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{p.name || p.software_name}</div>
                                                    {p.description && (
                                                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                            {p.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">迭代优先级</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择优先级" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="高">高</SelectItem>
                                        <SelectItem value="中">中</SelectItem>
                                        <SelectItem value="低">低</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">迭代备注</Label>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="例如：本迭代关口"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <div className="flex w-full items-center justify-between">
                        {/* Left side: Delete button (only when editing) */}
                        <div>
                            {isEditMode && activeTab === 'create' && onDeleteProject && (
                                <Button
                                    variant="destructive"
                                    onClick={onDeleteProject}
                                    type="button"
                                >
                                    删除
                                </Button>
                            )}
                        </div>
                        {/* Right side: Cancel and Save/Reuse buttons */}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>取消</Button>
                            {activeTab === 'create' ? (
                                <Button onClick={handleSave} disabled={!name || isSubmitting}>
                                    {isSubmitting ? '提交中...' : (isEditMode ? '保存修改' : '创建项目')}
                                </Button>
                            ) : (
                                <Button onClick={handleReuse} disabled={selectedReuseIds.length === 0 || isSubmitting}>
                                    {isSubmitting ? '提交中...' : `选用项目${selectedReuseIds.length > 0 ? ` (${selectedReuseIds.length})` : ''}`}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
