import { useState, useEffect } from 'react';
import type { Story, Task, Member, Sprint } from "@/types";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    User,
    Tag,
    Flag,
    Calendar as CalendarIcon,
    Clock,
    AlertTriangle,
    Percent,
    Plus,
    Trash2,
    Pencil,
    CheckCircle2,
    Circle,
    History as HistoryIcon,
    Trash,
    GitBranch
} from 'lucide-react';

interface Props {
    story: Story | null;
    open: boolean;
    onClose: () => void;
    onSave: (updatedStory: any) => void;
    onDelete?: () => void;
    members: Member[];
    currentUser?: { id: number, role: string, displayName: string };
    sprintId?: number;
    projectId?: number;
    sprints?: Sprint[];
}

export default function StoryDetailsDrawer({
    story,
    open,
    onClose,
    onSave,
    onDelete,
    members,
    currentUser,
    sprintId,
    projectId,
    sprints = []
}: Props) {
    const { toast } = useToast();

    // Story Edit State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<Story['status']>('not_started');
    const [priority, setPriority] = useState('medium');
    const [assignedTo, setAssignedTo] = useState<number | null>(null);
    const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);
    const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);
    const [riskCountermeasure, setRiskCountermeasure] = useState('');
    const [progress, setProgress] = useState(0);
    const [storySprintId, setStorySprintId] = useState<number>(-1);

    // Permission Logic
    const isAdmin = currentUser?.role === 'admin';
    const isDeveloper = currentUser?.role === 'developer';
    const isExternal = currentUser?.role === 'external';
    const canEdit = isAdmin || isDeveloper; // Admin and Developer can edit, External cannot

    // Tab State
    const [activeTab, setActiveTab] = useState('details');

    // Tasks State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isAddingTask, setIsAddingTask] = useState(false);

    // New Task Form
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState<number | null>(null);
    const [newTaskPriority, setNewTaskPriority] = useState('中');
    const [newTaskEstimatedHours, setNewTaskEstimatedHours] = useState<number | undefined>(undefined);

    // Batch Add Tasks State
    const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
    const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [taskSearch, setTaskSearch] = useState('');

    // History State
    const [history, setHistory] = useState<any[]>([]);

    // Initialize story edit state when dialog opens
    useEffect(() => {
        if (story && open) {
            setTitle(story.title || '');
            setDescription((story as any).description || '');
            setStatus(story.status || 'not_started');
            setPriority(story.priority || 'medium');
            setAssignedTo(story.assigned_to_user?.id || null);
            setPlannedDate(story.planned_completion_date ? new Date(story.planned_completion_date) : undefined);
            setEstimatedHours(story.estimated_hours || undefined);
            setRiskCountermeasure(story.risk_and_countermeasure || '');
            setProgress(story.progress || 0);
            setStorySprintId(sprintId || -1);

            // Fetch History
            fetch(`/api/workbench/story/${story.id}/history`)
                .then(res => res.json())
                .then(data => setHistory(data))
                .catch(err => console.error('Error fetching history:', err));
        }
        setActiveTab('details');
    }, [story, open, sprintId]);

    // Fetch tasks for this story
    useEffect(() => {
        if (!story || !open || !sprintId || !projectId) {
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
        if (!isAddTaskDialogOpen || !story || !projectId || !sprintId) {
            setAvailableTasks([]);
            return;
        }

        fetch(`/api/workbench/tasks/available?projectId=${projectId}&sprintId=${sprintId}&storyId=${story.id}&search=${taskSearch}`)
            .then(res => res.json())
            .then(data => setAvailableTasks(data))
            .catch(err => console.error('Error fetching available tasks:', err));
    }, [isAddTaskDialogOpen, projectId, sprintId, story, taskSearch]);

    const handleSprintChange = async (newSprintId: string) => {
        if (!story || !projectId) return;

        const toSprintId = parseInt(newSprintId);
        const fromSprintId = storySprintId;

        if (toSprintId === fromSprintId) return;

        try {
            const res = await fetch('/api/workbench/story/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId: story.id,
                    fromSprintId,
                    toSprintId,
                    projectId
                })
            });

            if (!res.ok) {
                throw new Error('Failed to move story');
            }

            setStorySprintId(toSprintId);
            toast({ title: "关键节点移动成功" });
        } catch (err) {
            console.error('Error moving story:', err);
            toast({ title: "移动失败，请重试", variant: "destructive" });
        }
    };

    const handleAddTask = async () => {
        if (!newTaskTitle || !story || !sprintId || !projectId) return;

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
                    assignedTo: newTaskAssignee,
                    estimated_hours: newTaskEstimatedHours || null
                })
            });

            if (res.ok) {
                // Reset form
                setNewTaskTitle('');
                setNewTaskDesc('');
                setNewTaskAssignee(null);
                setNewTaskPriority('中');
                setNewTaskEstimatedHours(undefined);
                setIsAddingTask(false);

                // Refresh tasks
                const boardRes = await fetch(`/api/workbench/board?sprintId=${sprintId}&projectId=${projectId}`);
                const boardData = await boardRes.json();
                const storyTasks = boardData.tasks.filter((t: Task) => t.story_id === story.id);
                setTasks(storyTasks);

                toast({ title: "任务创建成功" });
            } else {
                toast({ title: "创建失败", variant: "destructive" });
            }
        } catch (err) {
            console.error('Error adding task:', err);
            toast({ title: "创建失败", variant: "destructive" });
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
                toast({ title: "任务已删除" });
            } else {
                toast({ title: "删除失败", variant: "destructive" });
            }
        } catch (err) {
            console.error('Error deleting task:', err);
            toast({ title: "删除失败", variant: "destructive" });
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
            } else {
                toast({ title: "状态更新失败", variant: "destructive" });
            }
        } catch (err) {
            console.error('Error updating task status:', err);
            toast({ title: "状态更新失败", variant: "destructive" });
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
            } else {
                toast({ title: "分配失败", variant: "destructive" });
            }
        } catch (err) {
            console.error('Error assigning task:', err);
            toast({ title: "分配失败", variant: "destructive" });
        }
    };

    const handleEditTask = (task: Task) => {
        // Navigate to task detail with new format: TASK-{id}-{snapshot_id}
        const url = task.snapshot_id
            ? `/dashboard/workbench/TASK-${task.id}-${task.snapshot_id}`
            : `/dashboard/workbench/TASK-${task.id}`;
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleBatchAddTasks = async () => {
        if (selectedTaskIds.length === 0 || !story || !sprintId || !projectId) return;

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

                toast({ title: `成功添加 ${selectedTaskIds.length} 个任务！` });
            } else {
                toast({ title: "部分任务添加失败，请重试", variant: "destructive" });
            }
        } catch (err) {
            console.error('Error batch adding tasks:', err);
            toast({ title: "添加任务失败，请重试", variant: "destructive" });
        }
    };

    const handleDeleteStory = async () => {
        if (!story || !sprintId || !projectId) return;

        if (!confirm(`确定要从当前迭代中删除关键节点"${story.title}"吗？\n\n注意：这将同时删除该节点下的所有任务。`)) {
            return;
        }

        try {
            const res = await fetch('/api/workbench/story/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId,
                    projectId,
                    storyId: story.id
                })
            });

            if (res.ok) {
                toast({ title: "删除成功" });
                if (onDelete) {
                    onDelete(); // 触发父组件刷新
                }
                onClose();
            } else {
                toast({ title: "删除失败，请重试", variant: "destructive" });
            }
        } catch (err) {
            console.error('Error deleting story:', err);
            toast({ title: "删除失败，请重试", variant: "destructive" });
        }
    };

    const handleSave = () => {
        if (!story) return;
        onSave({
            storyId: story.id,
            sprintId,
            projectId,
            title,
            description,
            status,
            priority,
            assignedTo,
            planned_completion_date: plannedDate?.toISOString().split('T')[0] || null,
            estimated_hours: estimatedHours || null,
            risk_and_countermeasure: riskCountermeasure,
            progress
        });
        onClose();
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'in_progress':
                return <Clock className="w-4 h-4 text-orange-500" />;
            default:
                return <Circle className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getPriorityBadge = (priority?: string) => {
        if (!priority) return null;
        const config = {
            '高': 'bg-red-100 text-red-700 border-red-200',
            '中': 'bg-blue-100 text-blue-700 border-blue-200',
            '低': 'bg-green-100 text-green-700 border-green-200'
        };
        return (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config[priority as keyof typeof config])}>
                {priority}
            </Badge>
        );
    };

    if (!story) return null;

    return (
        <>
            <Sheet open={open} onOpenChange={onClose}>
                <SheetContent className="sm:max-w-[600px] w-full border-l shadow-xl p-0 flex flex-col bg-white">
                    <SheetHeader className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold">关键计划节点</h2>

                        <nav className="flex gap-6 -mb-4">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={cn(
                                    "pb-3 text-sm font-medium transition-all border-b-2",
                                    activeTab === 'details' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                详情
                            </button>
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={cn(
                                    "pb-3 text-sm font-medium transition-all border-b-2 flex items-center gap-1.5",
                                    activeTab === 'tasks' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                任务
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10">
                                    {tasks.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={cn(
                                    "pb-3 text-sm font-medium transition-all border-b-2",
                                    activeTab === 'history' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                历史记录
                            </button>
                        </nav>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                        {activeTab === 'details' && (
                            <>
                                {/* Story Title */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-normal text-muted-foreground">节点标题</Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        disabled={!canEdit}
                                        className="text-base font-medium"
                                        placeholder="关键节点名称"
                                        autoFocus={false}
                                    />
                                </div>

                                {/* Status & Priority */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                            <Flag className="w-3.5 h-3.5" /> 状态
                                        </Label>
                                        <Select value={status} onValueChange={(val: any) => setStatus(val)} disabled={!canEdit}>
                                            <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="not_started">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                                                        <span>未开始</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="in_progress">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                                                        <span>进行中</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="completed">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                        <span>已完成</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                            <Tag className="w-3.5 h-3.5" /> 优先级
                                        </Label>
                                        <Select value={priority} onValueChange={setPriority} disabled={!canEdit}>
                                            <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
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

                                {/* Assignee & Planned Date */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                            <User className="w-3.5 h-3.5" /> 负责人
                                        </Label>
                                        <Select value={assignedTo?.toString() || "none"} onValueChange={(val) => setAssignedTo(val === "none" ? null : parseInt(val))} disabled={!canEdit}>
                                            <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2">
                                                <div className="flex items-center gap-2">
                                                    {assignedTo ? (
                                                        <Avatar className="w-5 h-5">
                                                            <AvatarImage src={`https://i.pravatar.cc/150?u=${assignedTo}`} />
                                                            <AvatarFallback className="text-[9px]">{members.find(m => m.id === assignedTo)?.display_name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                    ) : <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-3 h-3 text-slate-400" /></div>}
                                                    <span className="text-sm font-medium">{assignedTo ? members.find(m => m.id === assignedTo)?.display_name : "未分配"}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">未分配</SelectItem>
                                                {members.map(m => (
                                                    <SelectItem key={m.id} value={m.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="w-5 h-5">
                                                                <AvatarImage src={m.avatar_url} />
                                                                <AvatarFallback>{m.display_name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            {m.display_name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                            <CalendarIcon className="w-3.5 h-3.5" /> 计划完成日期
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"ghost"}
                                                    disabled={!canEdit}
                                                    className={cn(
                                                        "w-full justify-start text-left font-medium h-9 px-2 -ml-2 hover:bg-secondary/50",
                                                        !plannedDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    {plannedDate ? format(plannedDate, "PPP", { locale: zhCN }) : <span>设置日期</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={plannedDate}
                                                    onSelect={setPlannedDate}
                                                    initialFocus
                                                    locale={zhCN}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Sprint Selection & Estimated Hours */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                            <GitBranch className="w-3.5 h-3.5" /> 所属迭代
                                        </Label>
                                        <Select value={storySprintId.toString()} onValueChange={handleSprintChange} disabled={!canEdit}>
                                            <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="-1">
                                                    <div className="flex items-center gap-2">
                                                        <span>📋 Backlog</span>
                                                    </div>
                                                </SelectItem>
                                                {sprints.filter(s => s.id !== -1).map(s => (
                                                    <SelectItem key={s.id} value={s.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{s.name}</span>
                                                            {s.status === 'active' && <span className="text-[10px] text-emerald-600">●</span>}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="story-estimated-hours" className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5" /> 预估工时（小时）
                                        </Label>
                                        <Input
                                            id="story-estimated-hours"
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={estimatedHours || ''}
                                            onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                                            placeholder="例如: 8.5"
                                            disabled={!canEdit}
                                            className="h-9"
                                        />
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="space-y-3 pt-2 border-t">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                            <Percent className="w-3.5 h-3.5" /> 进度
                                        </Label>
                                        <span className="text-xs text-muted-foreground">{progress}%</span>
                                    </div>
                                    <Slider
                                        value={[progress]}
                                        onValueChange={(vals) => setProgress(vals[0])}
                                        max={100}
                                        step={5}
                                        disabled={!canEdit}
                                        className="w-full"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2 pt-2 border-t">
                                    <Label className="text-sm font-semibold text-foreground">描述</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        disabled={!canEdit}
                                        placeholder="添加描述..."
                                        className="min-h-[120px] border-none bg-secondary/20 focus:bg-secondary/40 focus:ring-0 resize-none p-4 text-sm"
                                    />
                                </div>

                                {/* Risk and Countermeasure */}
                                <div className="space-y-2 pt-2 border-t">
                                    <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        风险及应对措施
                                    </Label>
                                    <Textarea
                                        value={riskCountermeasure}
                                        onChange={(e) => setRiskCountermeasure(e.target.value)}
                                        disabled={!canEdit}
                                        placeholder="描述潜在风险和应对措施..."
                                        className="min-h-[100px] border-none bg-secondary/20 focus:bg-secondary/40 focus:ring-0 resize-none p-4 text-sm"
                                    />
                                </div>
                            </>
                        )}

                        {/* Tasks Tab */}
                        {activeTab === 'tasks' && (
                            <>
                                {/* Task List Header */}
                                <div className="flex items-center justify-between pb-4 border-b">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-foreground">任务列表</h3>
                                        <span className="text-xs text-muted-foreground">
                                            ({tasks.length} 个任务)
                                        </span>
                                    </div>
                                    {canEdit && (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => setIsAddTaskDialogOpen(true)}
                                                size="sm"
                                                variant="outline"
                                                className="h-8 gap-1.5 text-xs"
                                            >
                                                <HistoryIcon className="w-3.5 h-3.5" />
                                                选用历史任务
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
                                    )}
                                </div>

                                {/* Task List Content */}
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
                                                        value={newTaskEstimatedHours || ''}
                                                        onChange={(e) => setNewTaskEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                                                    disabled={!canEdit}
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
                                                            disabled={!canEdit}
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

                                                        {task.estimated_hours && (
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                                {task.estimated_hours}h
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Edit & Delete Buttons */}
                                                {canEdit && (
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditTask(task)}
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
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {tasks.length === 0 && !isAddingTask && (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            暂无任务，点击上方按钮添加任务
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* History Tab */}
                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                {history.length > 0 ? (
                                    <div className="space-y-4">
                                        {history.map((h, i) => (
                                            <div key={i} className="flex gap-4 items-start">
                                                <div className="w-2 h-2 mt-2 rounded-full bg-primary/40 flex-shrink-0" />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm font-medium">Sprint {h.sprint_number} 更新</span>
                                                        <span className="text-xs text-muted-foreground">{format(new Date(h.start_date), 'M/d', { locale: zhCN })}</span>
                                                    </div>
                                                    <div className="bg-secondary/30 p-3 rounded-md text-sm">
                                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                            <span>进度: {h.progress}%</span>
                                                            <span>状态: {h.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground text-sm">
                                        暂无历史记录
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
                        {canEdit && activeTab === 'details' && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteStory}
                                className="gap-2"
                            >
                                <Trash className="w-4 h-4" />
                                删除节点
                            </Button>
                        )}
                        <div className="flex-1" />
                        {activeTab === 'details' && (
                            canEdit ? (
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={onClose} size="sm">取消</Button>
                                    <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">保存修改</Button>
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground self-center">仅查看</span>
                            )
                        )}
                        {activeTab === 'tasks' && (
                            <Button variant="outline" onClick={onClose} size="sm">关闭</Button>
                        )}
                        {activeTab === 'history' && (
                            <Button variant="outline" onClick={onClose} size="sm">关闭</Button>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

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
                                                {task.estimated_hours && (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        {task.estimated_hours}h
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
        </>
    );
}
