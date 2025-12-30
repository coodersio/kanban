import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Story, Task, Member, Sprint } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, User, MoreVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface StoryCardProps {
    story: Story;
    onClick?: (story: Story) => void;
    isOverlay?: boolean;
    sprintId?: string;
    projectId?: number;
    members?: Member[];
    onTaskUpdate?: () => void;
    onEditTask?: (task: Task) => void;
    sprints?: Sprint[];
    onStoryMove?: () => void;
}

// Generate avatar color based on user ID
const getAvatarColor = (userId: number) => {
    const colors = [
        'bg-blue-500 text-white',
        'bg-green-500 text-white',
        'bg-purple-500 text-white',
        'bg-orange-500 text-white',
        'bg-pink-500 text-white',
        'bg-cyan-500 text-white',
        'bg-amber-500 text-white',
        'bg-indigo-500 text-white',
        'bg-rose-500 text-white',
        'bg-teal-500 text-white',
        'bg-violet-500 text-white',
        'bg-fuchsia-500 text-white',
    ];
    return colors[userId % colors.length];
};

export default function StoryCard({
    story,
    onClick,
    isOverlay,
    sprintId,
    projectId,
    members = [],
    onTaskUpdate,
    onEditTask,
    sprints = [],
    onStoryMove
}: StoryCardProps) {
    const [isTasksExpanded, setIsTasksExpanded] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: story.id,
        data: story,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    // Fetch tasks when expanded
    useEffect(() => {
        if (isTasksExpanded && sprintId && projectId && tasks.length === 0) {
            setIsLoadingTasks(true);
            fetch(`/api/workbench/board?sprintId=${sprintId}&projectId=${projectId}`)
                .then(res => res.json())
                .then(data => {
                    const storyTasks = data.tasks.filter((t: Task) => t.story_id === story.id);
                    setTasks(storyTasks);
                })
                .catch(err => console.error('Error fetching tasks:', err))
                .finally(() => setIsLoadingTasks(false));
        }
    }, [isTasksExpanded, story.id, sprintId, projectId]);

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsTasksExpanded(!isTasksExpanded);
    };

    const handleTaskStatusToggle = async (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();

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
                    storyId: story.id
                })
            });

            if (res.ok) {
                setTasks(tasks.map(t =>
                    t.id === task.id ? { ...t, status: newStatus } : t
                ));
                onTaskUpdate?.();
            }
        } catch (err) {
            console.error('Error updating task status:', err);
        }
    };

    const handleAssignTask = async (taskId: number, userId: number | null, e?: any) => {
        e?.stopPropagation();

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
                onTaskUpdate?.();
            }
        } catch (err) {
            console.error('Error assigning task:', err);
        }
    };

    const handleMoveStory = async (toSprintId: number, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!sprintId || !projectId) {
            alert('Missing sprint or project information');
            return;
        }

        const fromSprintId = parseInt(sprintId);
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

            alert('Story moved successfully!');
            onStoryMove?.();
        } catch (err) {
            console.error('Error moving story:', err);
            alert('Failed to move story. Please try again.');
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

    const getPriorityBadge = (priority?: string, isStory: boolean = false) => {
        if (!priority) return null;

        // Story priorities (low, medium, high)
        const storyConfig = {
            high: { label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
            medium: { label: '中', className: 'bg-orange-100 text-orange-700 border-orange-200' },
            low: { label: '低', className: 'bg-blue-100 text-blue-700 border-blue-200' }
        };

        // Task priorities (高, 中, 低)
        const taskConfig = {
            高: { label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
            中: { label: '中', className: 'bg-blue-100 text-blue-700 border-blue-200' },
            低: { label: '低', className: 'bg-green-100 text-green-700 border-green-200' }
        };

        const config = isStory ? storyConfig : taskConfig;
        const priorityConfig = config[priority as keyof typeof config];

        if (!priorityConfig) return null;

        return (
            <Badge
                variant="outline"
                className={cn(
                    isStory ? 'text-xs px-2 py-0.5 font-medium' : 'text-[10px] px-1.5 py-0',
                    priorityConfig.className
                )}
            >
                {priorityConfig.label}
            </Badge>
        );
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "bg-card rounded-lg border border-border transition-all hover:shadow-md hover:border-primary/30",
                isDragging && !isOverlay && "opacity-50",
                isOverlay && "shadow-2xl ring-2 ring-primary/20 scale-105 rotate-2"
            )}
        >
            <div
                className="p-4 cursor-pointer"
                onClick={() => !isOverlay && onClick?.(story)}
            >
                {/* Story Title */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground line-clamp-2">
                            {story.title}
                        </h4>
                        {/* Priority Badge */}
                        {story.priority && (
                            <div className="mt-2">
                                {getPriorityBadge(story.priority, true)}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {story.assigned_to_user && (
                            <Avatar className="w-6 h-6">
                                <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColor(story.assigned_to_user.id))}>
                                    {story.assigned_to_user.display_name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        )}
                        {/* Move Menu */}
                        {!isOverlay && sprints.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-secondary">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem disabled className="text-xs font-semibold">
                                        移动到迭代
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-xs"
                                        onClick={(e) => handleMoveStory(-1, e)}
                                    >
                                        📋 Backlog
                                    </DropdownMenuItem>
                                    {sprints.filter(s => s.id !== -1).map(s => (
                                        <DropdownMenuItem
                                            key={s.id}
                                            className="text-xs"
                                            onClick={(e) => handleMoveStory(s.id, e)}
                                        >
                                            {s.name} {s.status === 'active' && '●'}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Task Count with Expand Icon */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleToggleExpand}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {isTasksExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        <span>{story.task_count || 0} 个任务</span>
                    </button>
                    {story.status === 'completed' && (
                        <Badge variant="outline" className="bg-status-completed/10 text-status-completed border-status-completed/20 text-[10px] px-1.5 py-0">
                            已完成
                        </Badge>
                    )}
                </div>
            </div>

            {/* Expanded Task List */}
            {isTasksExpanded && !isOverlay && (
                <div className="border-t border-border px-3 py-2 space-y-2 bg-muted/30">
                    {isLoadingTasks ? (
                        <div className="text-xs text-muted-foreground py-2 text-center">
                            加载中...
                        </div>
                    ) : tasks.length > 0 ? (
                        tasks.map((task) => (
                            <div
                                key={task.id}
                                className="flex items-center gap-2 py-1.5 px-2 bg-background rounded border border-border/50"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Status Toggle */}
                                <button
                                    onClick={(e) => handleTaskStatusToggle(e, task)}
                                    className="flex-shrink-0 hover:scale-110 transition-transform"
                                >
                                    {getStatusIcon(task.status)}
                                </button>

                                {/* Task Title */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTask?.(task);
                                    }}
                                    className={cn(
                                        "text-xs flex-1 min-w-0 truncate text-left hover:text-primary transition-colors",
                                        task.status === 'completed' && "line-through text-muted-foreground"
                                    )}
                                >
                                    {task.title}
                                </button>

                                {/* Priority Badge */}
                                {getPriorityBadge(task.priority)}

                                {/* Assignee */}
                                <Select
                                    value={task.assigned_to_user?.id.toString() || '0'}
                                    onValueChange={(v) => handleAssignTask(task.id, v === '0' ? null : parseInt(v))}
                                >
                                    <SelectTrigger className="h-6 w-[100px] text-[10px] border-0 bg-transparent">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            <SelectValue placeholder="待分配" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent onClick={(e) => e.stopPropagation()}>
                                        <SelectItem value="0" className="text-xs">待分配</SelectItem>
                                        {members.map(m => (
                                            <SelectItem key={m.id} value={m.id.toString()} className="text-xs">
                                                {m.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))
                    ) : (
                        <div className="text-xs text-muted-foreground py-2 text-center">
                            暂无任务
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
