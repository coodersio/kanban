import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Story, Task, Member } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StoryCardProps {
    story: Story;
    onClick?: (story: Story) => void;
    isOverlay?: boolean;
    sprintId?: string;
    projectId?: number;
    members?: Member[];
    onTaskUpdate?: () => void;
}

export default function StoryCard({
    story,
    onClick,
    isOverlay,
    sprintId,
    projectId,
    members = [],
    onTaskUpdate
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

    const getProgressColor = () => {
        if (!story.progress) return 'bg-slate-200';
        if (story.progress >= 80) return 'bg-status-completed';
        if (story.progress >= 40) return 'bg-status-in-progress';
        return 'bg-status-review';
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
            Must: 'bg-red-100 text-red-700 border-red-200',
            Should: 'bg-blue-100 text-blue-700 border-blue-200',
            Could: 'bg-green-100 text-green-700 border-green-200'
        };
        return (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config[priority as keyof typeof config])}>
                {priority}
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
                    <h4 className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
                        {story.title}
                    </h4>
                    {story.assigned_to_user && (
                        <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarImage src={story.assigned_to_user.avatar_url} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                {story.assigned_to_user.display_name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    )}
                </div>

                {/* Progress Bar */}
                {story.progress !== undefined && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>进度</span>
                            <span className="font-semibold">{story.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn("h-full transition-all", getProgressColor())}
                                style={{ width: `${story.progress}%` }}
                            />
                        </div>
                    </div>
                )}

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
                                <span className={cn(
                                    "text-xs flex-1 min-w-0 truncate",
                                    task.status === 'completed' && "line-through text-muted-foreground"
                                )}>
                                    {task.title}
                                </span>

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
