import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Monday.com inspired status colors
const STATUS_COLORS: Record<string, string> = {
    'not_started': 'bg-slate-400', // Gray/Default
    'in_progress': 'bg-orange-400', // Working on it (Orange)
    'completed': 'bg-emerald-400', // Done (Green)
    'blocked': 'bg-red-400', // Stuck (Red)
    'review': 'bg-blue-400' // Review (Blue)
};

const PriorityDot = ({ priority }: { priority?: string }) => {
    if (!priority) return null;
    const colors: Record<string, string> = {
        'Must': 'bg-red-500',
        'Should': 'bg-yellow-500',
        'Could': 'bg-blue-300',
        'Tiny': 'bg-slate-300',
        'Medium': 'bg-slate-400',
        'Huge': 'bg-purple-500'
    };
    return (
        <div className={cn("w-2 h-2 rounded-full", colors[priority] || "bg-slate-300")} title={priority} />
    );
};

export default function TaskCard({ task, isOverlay, onClick }: { task: Task, isOverlay?: boolean, onClick?: (task: Task) => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        disabled: isOverlay
    });

    const style = transform && !isOverlay ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
    } : undefined;

    const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS['not_started'];

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => {
                if (isOverlay || isDragging) return;
                onClick?.(task);
            }}
            className={cn(
                "group relative bg-white border border-border/60 hover:border-primary/50 transition-all rounded-md cursor-grab active:cursor-grabbing shadow-sm",
                isDragging && "opacity-80 scale-105 shadow-xl ring-2 ring-primary/20 bg-background rotate-2"
            )}
        >
            <div className="flex flex-col h-full">
                {/* Status Bar (Monday style) */}
                <div className={cn("h-1.5 w-full rounded-t-md", statusColor)} />

                <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                            <h5 className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors truncate">
                                {task.title}
                            </h5>
                            {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                    {task.description}
                                </p>
                            )}
                        </div>
                        <Avatar className="w-6 h-6 border border-border shrink-0">
                            <AvatarImage src={task.assigned_to_user?.avatar_url} />
                            <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                                {task.assigned_to_user?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-2">
                            {task.priority && <PriorityDot priority={task.priority} />}
                            {task.size && <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded">{task.size}</span>}
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono">#{task.id}</div>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
}
