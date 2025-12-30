import type { Task, Member } from "@/types";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskRowProps {
    task: Task;
    members: Member[];
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
        '高': { label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
        '中': { label: '中', className: 'bg-blue-100 text-blue-700 border-blue-200' },
        '低': { label: '低', className: 'bg-green-100 text-green-700 border-green-200' }
    };

    const priorityConfig = config[priority as keyof typeof config];
    if (!priorityConfig) return null;

    return (
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priorityConfig.className)}>
            {priorityConfig.label}
        </Badge>
    );
};

export default function TaskRow({ task, members, onEditTask }: TaskRowProps) {
    const statusConfig = getStatusBadge(task.status);

    return (
        <TableRow
            className="bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onEditTask(task)}
        >
            {/* Empty cell for expand column */}
            <TableCell className="w-10" />

            {/* Title - indented */}
            <TableCell className="pl-12">
                <span className={cn(
                    "text-sm",
                    task.status === 'completed' && "line-through text-muted-foreground"
                )}>
                    <span className="text-muted-foreground font-normal">[TASK-{task.id}]</span> {task.title}
                </span>
            </TableCell>

            {/* Status */}
            <TableCell>
                <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
                    {statusConfig.label}
                </Badge>
            </TableCell>

            {/* Priority */}
            <TableCell>
                {getPriorityBadge(task.priority)}
            </TableCell>

            {/* Assignee */}
            <TableCell>
                {task.assigned_to_user ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                            <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColor(task.assigned_to_user.id))}>
                                {task.assigned_to_user.display_name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{task.assigned_to_user.display_name}</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">未分配</span>
                )}
            </TableCell>

            {/* Progress */}
            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${task.progress || 0}%` }}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground min-w-[3ch]">
                        {task.progress || 0}%
                    </span>
                </div>
            </TableCell>

            {/* Planned Date */}
            <TableCell className="text-xs text-muted-foreground">
                {task.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : '-'}
            </TableCell>

            {/* Risk */}
            <TableCell className="text-center">
                {task.risk_and_countermeasure && (
                    <AlertTriangle className="w-4 h-4 text-orange-500 inline-block" title={task.risk_and_countermeasure} />
                )}
            </TableCell>
        </TableRow>
    );
}
