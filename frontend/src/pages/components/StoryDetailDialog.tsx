import { useState, useEffect } from 'react';
import type { Story, Task, Member } from "@/types";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
    Plus,
    Trash2,
    Pencil,
    CheckCircle2,
    Circle,
    Clock,
    User,
    ChevronDown,
    ChevronUp,
    History
} from 'lucide-react';

interface StoryDetailDialogProps {
    open: boolean;
    onClose: () => void;
    story: Story | null;
    sprintId: string;
    projectId: number;
    members: Member[];
    onUpdate: () => void;
    onEditTask?: (task: Task) => void;
}

export default function StoryDetailDialog({
    open,
    onClose,
    story,
    sprintId,
    projectId,
    members,
    onUpdate,
    onEditTask
}: StoryDetailDialogProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isTaskListExpanded, setIsTaskListExpanded] = useState(true);
    const [isAddingTask, setIsAddingTask] = useState(false);

    // Story Edit State
    const [editedTitle, setEditedTitle] = useState('');
    const [editedAssignee, setEditedAssignee] = useState<number | null>(null);
    const [editedPriority, setEditedPriority] = useState<string>('medium');

    // New Task Form
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState<number | null>(null);
    const [newTaskPriority, setNewTaskPriority] = useState('中');
    const [newTaskSize, setNewTaskSize] = useState('');

    // Batch Add Tasks State
    const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
    const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [taskSearch, setTaskSearch] = useState('');

    // Initialize story edit state when dialog opens
    useEffect(() => {
        if (story && open) {
            setEditedTitle(story.title);
            setEditedAssignee(story.assigned_to_user?.id || null);
            setEditedPriority(story.priority || 'medium');
        }
    }, [story, open]);

    // Fetch tasks for this story
    useEffect(() => {
        if (!story || !open) {
            setTasks([]);
            return;
        }

        fetch(`/api/workbench/board?sprintId=${sprintId}&projectId=${projectId}`)
            .then(res => res.json())
            .then(data => {
                const storyTasks = data.tasks.filter((t: Task) => t.story_id === story.id);
                setTasks(storyTasks);
            })
            .catch(err => console.error('Error fetching tasks:', err));
    }, [story, sprintId, projectId, open]);

    // Fetch available tasks when batch add dialog opens
    useEffect(() => {
        if (!isAddTaskDialogOpen || !story) {
            setAvailableTasks([]);
            return;
        }

        fetch(`/api/workbench/tasks/available?projectId=${projectId}&sprintId=${sprintId}&storyId=${story.id}&search=${taskSearch}`)
            .then(res => res.json())
            .then(data => setAvailableTasks(data))
            .catch(err => console.error('Error fetching available tasks:', err));
    }, [isAddTaskDialogOpen, projectId, sprintId, story, taskSearch]);

    const handleAddTask = async () => {
        if (!newTaskTitle || !story) return;

        try {
            const res = await fetch('/api/workbench/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId,
                    projectId,
                    storyId: story.id,
                    title: newTaskTitle,
                    description: newTaskDesc,
                    priority: newTaskPriority,
                    size: newTaskSize,
                    assignedTo: newTaskAssignee
                })
            });

            if (res.ok) {
                // Reset form
                setNewTaskTitle('');
                setNewTaskDesc('');
                setNewTaskAssignee(null);
                setNewTaskPriority('中');
                setNewTaskSize('');
                setIsAddingTask(false);

                // Refresh tasks
                const boardRes = await fetch(`/api/workbench/board?sprintId=${sprintId}&projectId=${projectId}`);
                const boardData = await boardRes.json();
                const storyTasks = boardData.tasks.filter((t: Task) => t.story_id === story.id);
                setTasks(storyTasks);

                onUpdate();
            }
        } catch (err) {
            console.error('Error adding task:', err);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('确定要删除这个任务吗？')) return;

        try {
            const res = await fetch(`/api/workbench/task/${taskId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setTasks(tasks.filter(t => t.id !== taskId));
                onUpdate();
            }
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    };

    const handleToggleTaskStatus = async (task: Task) => {
        let newStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';

        if (task.status === 'not_started') newStatus = 'in_progress';
        else if (task.status === 'in_progress') newStatus = 'completed';
        else newStatus = 'not_started';

        try {
            const res = await fetch('/api/workbench/task/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId,
                    projectId,
                    taskId: task.id,
                    status: newStatus,
                    storyId: story?.id
                })
            });

            if (res.ok) {
                setTasks(tasks.map(t =>
                    t.id === task.id ? { ...t, status: newStatus } : t
                ));
                onUpdate();
            }
        } catch (err) {
            console.error('Error updating task status:', err);
        }
    };

    const handleAssignTask = async (taskId: number, userId: number | null) => {
        try {
            const res = await fetch('/api/workbench/task/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId,
                    projectId,
                    taskId,
                    assignedTo: userId
                })
            });

            if (res.ok) {
                const member = members.find(m => m.id === userId);
                setTasks(tasks.map(t =>
                    t.id === taskId ? { ...t, assigned_to_user: member } : t
                ));
                onUpdate();
            }
        } catch (err) {
            console.error('Error assigning task:', err);
        }
    };

    const handleUpdateStoryTitle = async (newTitle: string) => {
        if (!story || !newTitle.trim() || newTitle === story.title) return;

        try {
            const res = await fetch('/api/workbench/story', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId,
                    projectId,
                    storyId: story.id,
                    title: newTitle,
                    assignedTo: story.assigned_to_user?.id || null
                })
            });

            if (res.ok) {
                onUpdate();
            }
        } catch (err) {
            console.error('Error updating story title:', err);
        }
    };

    const handleUpdateStoryAssignee = async (userId: number | null) => {
        if (!story) return;

        try {
            const res = await fetch('/api/workbench/story', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId,
                    projectId,
                    storyId: story.id,
                    title: story.title,
                    assignedTo: userId,
                    priority: story.priority || 'medium'
                })
            });

            if (res.ok) {
                setEditedAssignee(userId);
                onUpdate();
            }
        } catch (err) {
            console.error('Error updating story assignee:', err);
        }
    };

    const handleUpdateStoryPriority = async (priority: string) => {
        if (!story) return;

        try {
            const res = await fetch('/api/workbench/story', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId,
                    projectId,
                    storyId: story.id,
                    title: story.title,
                    assignedTo: story.assigned_to_user?.id || null,
                    priority: priority
                })
            });

            if (res.ok) {
                setEditedPriority(priority);
                onUpdate();
            }
        } catch (err) {
            console.error('Error updating story priority:', err);
        }
    };

    const handleBatchAddTasks = async () => {
        if (selectedTaskIds.length === 0 || !story) return;

        try {
            const promises = selectedTaskIds.map(taskId =>
                fetch('/api/workbench/task/reuse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sprintId,
                        projectId,
                        storyId: story.id,
                        taskId,
                        assignedTo: null
                    })
                })
            );

            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.ok);

            if (allSuccess) {
                setIsAddTaskDialogOpen(false);
                setSelectedTaskIds([]);
                setTaskSearch('');

                // Refresh tasks
                const boardRes = await fetch(`/api/workbench/board?sprintId=${sprintId}&projectId=${projectId}`);
                const boardData = await boardRes.json();
                const storyTasks = boardData.tasks.filter((t: Task) => t.story_id === story.id);
                setTasks(storyTasks);

                onUpdate();
                alert(`成功添加 ${selectedTaskIds.length} 个任务！`);
            } else {
                alert('部分任务添加失败，请重试');
            }
        } catch (err) {
            console.error('Error batch adding tasks:', err);
            alert('添加任务失败，请重试');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-4 h-4 text-status-completed" />;
            case 'in_progress':
                return <Clock className="w-4 h-4 text-status-in-progress" />;
            default:
                return <Circle className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getPriorityBadge = (priority?: string) => {
        if (!priority) return null;
        const config = {
            高: 'bg-red-100 text-red-700 border-red-200',
            中: 'bg-blue-100 text-blue-700 border-blue-200',
            低: 'bg-green-100 text-green-700 border-green-200'
        };
        return (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config[priority as keyof typeof config])}>
                {priority}
            </Badge>
        );
    };

    if (!story) return null;

    return (
        <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <SheetContent
                side="right"
                className="w-[600px] sm:w-[600px] max-w-[85vw] overflow-hidden flex flex-col p-0"
            >
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                    <SheetTitle className="text-lg font-semibold">编辑关键节点计划</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto space-y-6 px-6 py-4">
                    {/* Story Info */}
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">标题</Label>
                            <Input
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onBlur={() => handleUpdateStoryTitle(editedTitle)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                    }
                                }}
                                className="text-base"
                                placeholder="节点标题"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">负责人:</span>
                                <Select
                                    value={editedAssignee?.toString() || '0'}
                                    onValueChange={(v) => handleUpdateStoryAssignee(v === '0' ? null : parseInt(v))}
                                >
                                    <SelectTrigger className="h-8 w-[140px] text-xs border-dashed">
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
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">优先级:</span>
                                <Select
                                    value={editedPriority}
                                    onValueChange={handleUpdateStoryPriority}
                                >
                                    <SelectTrigger className="h-8 w-[100px] text-xs border-dashed">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="high">高</SelectItem>
                                        <SelectItem value="medium">中</SelectItem>
                                        <SelectItem value="low">低</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">进度:</span>
                            <span className="font-semibold">{story.progress || 0}%</span>
                        </div>
                    </div>

                    {/* Task List Section */}
                    <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setIsTaskListExpanded(!isTaskListExpanded)}
                                className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                            >
                                {isTaskListExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                任务列表 ({tasks.length})
                            </button>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setIsAddTaskDialogOpen(true)}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-xs"
                                >
                                    <History className="w-3.5 h-3.5" />
                                    从历史任务中添加
                                </Button>
                                <Button
                                    onClick={() => setIsAddingTask(true)}
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    添加任务
                                </Button>
                            </div>
                        </div>

                        {isTaskListExpanded && (
                            <div className="space-y-2">
                                {/* Add Task Form */}
                                {isAddingTask && (
                                    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                                        <div className="grid gap-2">
                                            <Label className="text-xs">任务标题 *</Label>
                                            <Input
                                                placeholder="输入任务标题..."
                                                value={newTaskTitle}
                                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="grid gap-2">
                                                <Label className="text-xs">负责人</Label>
                                                <Select value={newTaskAssignee?.toString() || '0'} onValueChange={(v) => setNewTaskAssignee(v === '0' ? null : parseInt(v))}>
                                                    <SelectTrigger className="h-9 text-xs">
                                                        <SelectValue placeholder="选择" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">待定</SelectItem>
                                                        {members.map(m => (
                                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                                {m.display_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="text-xs">优先级</Label>
                                                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                                                    <SelectTrigger className="h-9 text-xs">
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
                                                <Label className="text-xs">工时（小时）</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    placeholder="例如：8"
                                                    value={newTaskSize}
                                                    onChange={(e) => setNewTaskSize(e.target.value)}
                                                    className="h-9 text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs">任务描述</Label>
                                            <Textarea
                                                placeholder="输入任务描述..."
                                                value={newTaskDesc}
                                                onChange={(e) => setNewTaskDesc(e.target.value)}
                                                className="min-h-[60px] text-sm"
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsAddingTask(false)}
                                                className="h-8 text-xs"
                                            >
                                                取消
                                            </Button>
                                            <Button
                                                onClick={handleAddTask}
                                                size="sm"
                                                className="h-8 text-xs"
                                            >
                                                创建任务
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Task List */}
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Status Toggle */}
                                            <button
                                                onClick={() => handleToggleTaskStatus(task)}
                                                className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                                            >
                                                {getStatusIcon(task.status)}
                                            </button>

                                            {/* Task Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        task.status === 'completed' && "line-through text-muted-foreground"
                                                    )}>
                                                        {task.title}
                                                    </span>
                                                    {getPriorityBadge(task.priority)}
                                                </div>
                                                {task.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                                        {task.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    {/* Assignee Selector */}
                                                    <Select
                                                        value={task.assigned_to_user?.id.toString() || '0'}
                                                        onValueChange={(v) => handleAssignTask(task.id, v === '0' ? null : parseInt(v))}
                                                    >
                                                        <SelectTrigger className="h-7 w-[140px] text-xs">
                                                            <div className="flex items-center gap-1.5">
                                                                <User className="w-3 h-3" />
                                                                <SelectValue placeholder="分配给..." />
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0" className="text-xs">待分配</SelectItem>
                                                            {members.map(m => (
                                                                <SelectItem key={m.id} value={m.id.toString()} className="text-xs">
                                                                    {m.display_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    {task.size && (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                            {task.size}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Edit & Delete Buttons */}
                                            <div className="flex gap-1 flex-shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onEditTask?.(task)}
                                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {tasks.length === 0 && !isAddingTask && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        暂无任务，点击上方按钮添加任务
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>

            {/* Batch Add Tasks Dialog */}
            <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">从历史任务中添加</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">搜索任务</Label>
                            <Input
                                placeholder="输入关键词搜索..."
                                value={taskSearch}
                                onChange={(e) => setTaskSearch(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">选择任务（可多选）</Label>
                                {selectedTaskIds.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        已选 {selectedTaskIds.length} 项
                                    </span>
                                )}
                            </div>
                            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                                {availableTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-md cursor-pointer hover:bg-muted/50 border-b last:border-b-0",
                                            selectedTaskIds.includes(task.id) && "bg-primary/10"
                                        )}
                                        onClick={() => {
                                            setSelectedTaskIds(prev =>
                                                prev.includes(task.id)
                                                    ? prev.filter(id => id !== task.id)
                                                    : [...prev, task.id]
                                            );
                                        }}
                                    >
                                        <Checkbox
                                            checked={selectedTaskIds.includes(task.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedTaskIds(prev =>
                                                    checked ? [...prev, task.id] : prev.filter(id => id !== task.id)
                                                );
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm">{task.title}</span>
                                                {task.priority && getPriorityBadge(task.priority)}
                                            </div>
                                            {task.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {task.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                {task.size && (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        {task.size}
                                                    </Badge>
                                                )}
                                                {task.assigned_to_user && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {task.assigned_to_user.display_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {availableTasks.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        没有可用的任务
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={handleBatchAddTasks} disabled={selectedTaskIds.length === 0}>
                            添加任务 {selectedTaskIds.length > 0 && `(${selectedTaskIds.length})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}
