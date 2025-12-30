import { Fragment } from 'react';
import type { Story, Task, Member } from "@/types";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight, ChevronDown, AlertTriangle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import TaskRow from './TaskRow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import EntityHandler from './EntityHandler';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ListViewStoryRowProps {
    story: Story;
    isExpanded: boolean;
    onToggleExpand: () => void;
    tasks: Task[];
    members: Member[];
    onEditStory: (story: Story) => void;
    onEditTask: (task: Task) => void;
    sprintId: string;
    projectId: number;
    onDataChange?: () => void;
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

// Get status badge configuration
const getStatusBadge = (status: string) => {
    const config = {
        'not_started': { label: '未开始', className: 'bg-slate-100 text-slate-700 border-slate-200' },
        'in_progress': { label: '进行中', className: 'bg-orange-100 text-orange-700 border-orange-200' },
        'completed': { label: '已完成', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    };
    return config[status as keyof typeof config] || config['not_started'];
};

// Get priority badge configuration
const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;

    const config = {
        'high': { label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
        'medium': { label: '中', className: 'bg-orange-100 text-orange-700 border-orange-200' },
        'low': { label: '低', className: 'bg-blue-100 text-blue-700 border-blue-200' }
    };

    const priorityConfig = config[priority as keyof typeof config];
    if (!priorityConfig) return null;

    return (
        <Badge variant="outline" className={cn('text-xs px-2 py-0.5', priorityConfig.className)}>
            {priorityConfig.label}
        </Badge>
    );
};

export default function ListViewStoryRow({
    story,
    isExpanded,
    onToggleExpand,
    tasks,
    members,
    onEditStory,
    onEditTask,
    sprintId,
    projectId,
    onDataChange
}: ListViewStoryRowProps) {
    const { toast } = useToast();
    const statusConfig = getStatusBadge(story.status);

    // Sortable hook
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: story.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    const getNextStatus = (current: string): 'not_started' | 'in_progress' | 'completed' => {
        if (current === 'not_started') return 'in_progress';
        if (current === 'in_progress') return 'completed';
        return 'not_started';
    };

    const handleStatusClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextStatus = getNextStatus(story.status);

        try {
            const res = await fetch('/api/workbench/story/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId,
                    storyId: story.id,
                    status: nextStatus,
                    projectId
                })
            });

            if (res.ok) {
                onDataChange?.();
            } else {
                toast({ title: "更新失败", variant: "destructive" });
            }
        } catch (err) {
            console.error('Error updating story status:', err);
            toast({ title: "更新失败", variant: "destructive" });
        }
    };

    const handleAssigneeChange = async (userId: string) => {
        const assignedTo = userId === '0' ? null : parseInt(userId);

        try {
            const res = await fetch('/api/workbench/story/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId,
                    storyId: story.id,
                    assignedTo,
                    projectId
                })
            });

            if (res.ok) {
                onDataChange?.();
            } else {
                toast({ title: "分配失败", variant: "destructive" });
            }
        } catch (err) {
            console.error('Error assigning story:', err);
            toast({ title: "分配失败", variant: "destructive" });
        }
    };

    return (
        <Fragment>
            {/* Story Row */}
            <TableRow
                ref={setNodeRef}
                style={style}
                className="border-b-2 hover:bg-muted/30 transition-colors"
            >
                {/* Drag Handle */}
                <TableCell className="w-10">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 hover:bg-muted rounded transition-colors cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                </TableCell>

                {/* Expand Button */}
                <TableCell className="w-10">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className="p-1 hover:bg-muted rounded transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>
                </TableCell>

                {/* Title */}
                <TableCell>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold flex items-center gap-2">
                            <EntityHandler type="STORY" id={story.id} />
                            {story.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            ({story.task_count || 0} 个任务)
                        </span>
                    </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                    <button
                        onClick={handleStatusClick}
                        className="inline-flex transition-all hover:scale-105 hover:shadow-sm"
                    >
                        <Badge variant="outline" className={cn('text-xs cursor-pointer', statusConfig.className)}>
                            {statusConfig.label}
                        </Badge>
                    </button>
                </TableCell>

                {/* Priority */}
                <TableCell>
                    {getPriorityBadge(story.priority)}
                </TableCell>

                {/* Assignee */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                        value={story.assigned_to_user?.id.toString() || '0'}
                        onValueChange={handleAssigneeChange}
                    >
                        <SelectTrigger className="h-6 w-[120px] text-xs border-0 bg-transparent hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                                {story.assigned_to_user ? (
                                    <>
                                        <Avatar className="w-4 h-4">
                                            <AvatarFallback className={cn("text-[8px] font-semibold", getAvatarColor(story.assigned_to_user.id))}>
                                                {story.assigned_to_user.display_name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs">{story.assigned_to_user.display_name}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-muted-foreground">未分配</span>
                                )}
                            </div>
                        </SelectTrigger>
                        <SelectContent onClick={(e) => e.stopPropagation()}>
                            <SelectItem value="0" className="text-xs">未分配</SelectItem>
                            {members.map(m => (
                                <SelectItem key={m.id} value={m.id.toString()} className="text-xs">
                                    {m.display_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TableCell>

                {/* Planned Date */}
                <TableCell className="text-xs text-muted-foreground">
                    {story.planned_completion_date ? new Date(story.planned_completion_date).toLocaleDateString('zh-CN') : '-'}
                </TableCell>
            </TableRow>

            {/* Task Rows (when expanded) */}
            {isExpanded && tasks.map(task => (
                <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    onEditTask={onEditTask}
                    sprintId={sprintId}
                    projectId={projectId}
                    onDataChange={onDataChange}
                />
            ))}
        </Fragment>
    );
}
