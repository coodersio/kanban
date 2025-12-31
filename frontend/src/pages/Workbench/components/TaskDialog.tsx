import { useState, useEffect } from 'react';
import type { Sprint, Member, Story, Task } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface TaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activeTab: 'create' | 'reuse';
    onTabChange: (tab: 'create' | 'reuse') => void;

    // For create mode
    onCreateTask: (data: {
        title: string;
        description: string;
        assignedTo: number | null;
        priority: string;
        estimatedHours: number | undefined;
        storyId: number | null;
        sprintId: string;
    }) => Promise<void>;

    // For reuse mode
    onReuseTask: (taskIds: number[], storyId: number | null, assignedTo: number | null) => Promise<void>;

    // Data
    sprints: Sprint[];
    members: Member[];
    stories: Story[];
    selectedSprintId: string;
    selectedProjectId: number | null;
    initialStoryId?: number | null;
}

export function TaskDialog({
    open,
    onOpenChange,
    activeTab,
    onTabChange,
    onCreateTask,
    onReuseTask,
    sprints,
    members,
    stories,
    selectedSprintId,
    selectedProjectId,
    initialStoryId = null
}: TaskDialogProps) {
    // Create mode state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState<number | null>(null);
    const [priority, setPriority] = useState('中');
    const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);
    const [storyId, setStoryId] = useState<number | null>(initialStoryId);
    const [createSprintId, setCreateSprintId] = useState('');

    // Reuse mode state
    const [reuseSearch, setReuseSearch] = useState('');
    const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
    const [selectedReuseIds, setSelectedReuseIds] = useState<number[]>([]);

    // Update storyId when initialStoryId changes
    useEffect(() => {
        setStoryId(initialStoryId);
    }, [initialStoryId]);

    // Fetch available tasks for reuse
    useEffect(() => {
        if (open && activeTab === 'reuse' && selectedProjectId && selectedSprintId) {
            fetch(`/api/workbench/tasks/available?projectId=${selectedProjectId}&sprintId=${selectedSprintId}&storyId=${storyId || '0'}&search=${reuseSearch}`)
                .then(res => res.json())
                .then(data => setAvailableTasks(data))
                .catch(err => console.error('Error fetching available tasks:', err));
        }
    }, [open, activeTab, reuseSearch, selectedProjectId, selectedSprintId, storyId]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setAssignedTo(null);
        setPriority('中');
        setEstimatedHours(undefined);
        setStoryId(initialStoryId);
        setCreateSprintId('');
        setSelectedReuseIds([]);
        setReuseSearch('');
    };

    const handleCreate = async () => {
        if (!title) return;
        await onCreateTask({
            title,
            description,
            assignedTo,
            priority,
            estimatedHours,
            storyId,
            sprintId: createSprintId || selectedSprintId
        });
        resetForm();
    };

    const handleReuse = async () => {
        if (selectedReuseIds.length === 0) return;
        await onReuseTask(selectedReuseIds, storyId, assignedTo);
        resetForm();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">添加任务</DialogTitle>
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
                        新建任务
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
                        选用历史任务
                    </button>
                </nav>

                {activeTab === 'create' ? (
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="task-title" className="text-sm font-medium">任务标题</Label>
                            <Input
                                id="task-title"
                                placeholder="例如：设计登录表单"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">负责人</Label>
                            <Select value={assignedTo?.toString() || '0'} onValueChange={(v) => setAssignedTo(v === '0' ? null : parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择负责人" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">未分配</SelectItem>
                                    {members.map(m => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">关联关键节点</Label>
                            <Select value={storyId?.toString() || '0'} onValueChange={(v) => setStoryId(v === '0' ? null : parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择关联关键节点" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">无关联关键节点</SelectItem>
                                    {stories.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">所属迭代</Label>
                            <Select value={createSprintId || selectedSprintId} onValueChange={setCreateSprintId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择迭代" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-1">Backlog</SelectItem>
                                    {sprints.filter(s => s.id !== -1).map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">优先级</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="高">高</SelectItem>
                                        <SelectItem value="中">中</SelectItem>
                                        <SelectItem value="低">低</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">预估工时（小时）</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder="请输入预估工时"
                                    value={estimatedHours ?? ''}
                                    onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="task-desc" className="text-sm font-medium">任务描述</Label>
                            <Textarea
                                id="task-desc"
                                placeholder="输入任务描述..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">搜索已有任务</Label>
                            <Input
                                placeholder="输入关键词搜索..."
                                value={reuseSearch}
                                onChange={(e) => setReuseSearch(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">关联关键节点</Label>
                            <Select value={storyId?.toString() || '0'} onValueChange={(v) => setStoryId(v === '0' ? null : parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择关联关键节点" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">查看所有任务</SelectItem>
                                    {stories.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">选择任务（可多选）</Label>
                                {selectedReuseIds.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        已选 {selectedReuseIds.length} 项
                                    </span>
                                )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                {availableTasks.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => {
                                            setSelectedReuseIds(prev =>
                                                prev.includes(t.id)
                                                    ? prev.filter(id => id !== t.id)
                                                    : [...prev, t.id]
                                            );
                                        }}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded border transition-all cursor-pointer text-sm",
                                            selectedReuseIds.includes(t.id)
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/30 hover:bg-muted"
                                        )}
                                    >
                                        <Checkbox
                                            checked={selectedReuseIds.includes(t.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedReuseIds(prev =>
                                                    checked
                                                        ? [...prev, t.id]
                                                        : prev.filter(id => id !== t.id)
                                                );
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">{t.title || '无标题任务'}</div>
                                            {t.description && (
                                                <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.description}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {availableTasks.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        没有可复用的任务
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">负责人</Label>
                            <Select value={assignedTo?.toString() || '0'} onValueChange={(v) => setAssignedTo(v === '0' ? null : parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择负责人" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">未分配</SelectItem>
                                    {members.map(m => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                    {activeTab === 'create' ? (
                        <Button onClick={handleCreate} disabled={!title}>创建任务</Button>
                    ) : (
                        <Button onClick={handleReuse} disabled={selectedReuseIds.length === 0}>
                            选用任务 {selectedReuseIds.length > 0 && `(${selectedReuseIds.length})`}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
