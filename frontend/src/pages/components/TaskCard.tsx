import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const SizeBadge = ({ size }: { size?: string }) => {
    if (!size) return null;
    const colors: Record<string, string> = {
        'Tiny': 'bg-emerald-50 text-emerald-600',
        'Medium': 'bg-blue-50 text-blue-600',
        'Huge': 'bg-pink-50 text-pink-600',
        'Must': 'bg-red-50 text-red-600',
    };

    const labels: Record<string, string> = {
        'Tiny': '极小',
        'Medium': '适中',
        'Huge': '极大',
        'Must': '必须',
        'Should': '应该',
        'Could': '可以'
    };

    return (
        <Badge variant="secondary" className={cn("border-none text-[9px] font-black px-2 h-5 rounded-md tracking-widest", colors[size] || "bg-slate-50 text-slate-500")}>
            {labels[size] || size}
        </Badge>
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

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => {
                if (isOverlay) return;
                // Only trigger if not dragging
                if (isDragging) return;
                onClick?.(task);
            }}
            className={cn(
                "group relative bg-white border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 rounded-2xl cursor-grab active:cursor-grabbing",
                isDragging && "opacity-40 scale-105 shadow-2xl ring-2 ring-primary/20"
            )}
        >
            <CardContent className="p-5">
                {/* Card Top: Avatar & Actions */}
                <div className="flex items-start justify-between mb-4">
                    <Avatar className="w-6 h-6 border-2 border-white shadow-sm ring-1 ring-slate-100">
                        <AvatarImage src={task.assigned_to_user?.avatar_url || `https://i.pravatar.cc/150?u=${task.id}`} />
                        <AvatarFallback>{task.assigned_to_user?.display_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-300 hover:text-slate-600 -mr-2">
                        <MoreVertical className="w-4 h-4" />
                    </Button>
                </div>

                {/* Card Middle: Title & Description */}
                <div className="space-y-2 mb-4">
                    <h5 className="text-sm font-black text-slate-900 leading-snug tracking-tight group-hover:text-primary transition-colors">
                        {task.title}
                    </h5>
                    {task.description && (
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2">
                            {task.description}
                        </p>
                    )}
                </div>

                {/* Card Bottom: Badges */}
                <div className="flex flex-wrap gap-2">
                    <SizeBadge size={task.priority || (task.id % 4 === 0 ? 'Must' : undefined)} />
                    <SizeBadge size={task.size || (task.id % 3 === 0 ? 'Huge' : task.id % 2 === 0 ? 'Medium' : 'Tiny')} />
                </div>
            </CardContent>
        </Card>
    );
}
