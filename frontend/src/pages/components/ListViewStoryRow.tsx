import { Fragment } from 'react';
import type { Story, Task, Member } from "@/types";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight, ChevronDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import TaskRow from './TaskRow';

interface ListViewStoryRowProps {
    story: Story;
    isExpanded: boolean;
    onToggleExpand: () => void;
    tasks: Task[];
    members: Member[];
    onEditStory: (story: Story) => void;
    onEditTask: (task: Task) => void;
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
    onEditTask
}: ListViewStoryRowProps) {
    const statusConfig = getStatusBadge(story.status);

    return (
        <Fragment>
            {/* Story Row */}
            <TableRow className="border-b-2 hover:bg-muted/30 transition-colors">
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
                <TableCell
                    className="cursor-pointer"
                    onClick={() => onEditStory(story)}
                >
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">
                            <span className="text-muted-foreground font-normal">[STORY-{story.id}]</span> {story.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            ({story.task_count || 0} 个任务)
                        </span>
                    </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                    <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
                        {statusConfig.label}
                    </Badge>
                </TableCell>

                {/* Priority */}
                <TableCell>
                    {getPriorityBadge(story.priority)}
                </TableCell>

                {/* Assignee */}
                <TableCell>
                    {story.assigned_to_user ? (
                        <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                                <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColor(story.assigned_to_user.id))}>
                                    {story.assigned_to_user.display_name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{story.assigned_to_user.display_name}</span>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">未分配</span>
                    )}
                </TableCell>

                {/* Progress */}
                <TableCell>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-[100px]">
                            <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${story.progress || 0}%` }}
                            />
                        </div>
                        <span className="text-xs text-muted-foreground min-w-[3ch]">
                            {story.progress || 0}%
                        </span>
                    </div>
                </TableCell>

                {/* Planned Date */}
                <TableCell className="text-xs text-muted-foreground">
                    {story.planned_completion_date ? new Date(story.planned_completion_date).toLocaleDateString('zh-CN') : '-'}
                </TableCell>

                {/* Risk */}
                <TableCell className="text-center">
                    {story.risk_and_countermeasure && (
                        <AlertTriangle className="w-4 h-4 text-orange-500 inline-block" title={story.risk_and_countermeasure} />
                    )}
                </TableCell>
            </TableRow>

            {/* Task Rows (when expanded) */}
            {isExpanded && tasks.map(task => (
                <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    onEditTask={onEditTask}
                />
            ))}
        </Fragment>
    );
}
