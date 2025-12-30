import { useDroppable } from '@dnd-kit/core';
import { Task, Story } from "@/types";
import TaskCard from "./TaskCard";
import { cn } from "@/lib/utils";
import { ChevronDown, MoreHorizontal, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import EntityHandler from './EntityHandler';

// Monday.com style status headers
const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
    'not_started': { label: 'Not Started', color: 'bg-slate-400', bg: 'bg-slate-50' },
    'in_progress': { label: 'Working on it', color: 'bg-orange-400', bg: 'bg-orange-50/30' },
    'completed': { label: 'Done', color: 'bg-emerald-400', bg: 'bg-emerald-50/30' },
    'blocked': { label: 'Stuck', color: 'bg-red-400', bg: 'bg-red-50/30' }
};

function KanbanColumn({ id, status, tasks, onAddTask, onEditTask }: { id: string, status: string, tasks: Task[], onAddTask?: () => void, onEditTask?: (task: Task) => void }) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    const config = STATUS_CONFIG[status] || STATUS_CONFIG['not_started'];

    return (
        <div className="flex flex-col h-full min-w-0">
            {/* Column Header - Monday Style: Text matches status color */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", config.color)} />
                    <span className="text-sm font-medium text-slate-700">{config.label}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                        {tasks.length}
                    </span>
                </div>
            </div>

            {/* Column Body (Droppable) */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 min-h-[100px] rounded-lg transition-all duration-300 space-y-3 p-1",
                    isOver ? "bg-accent/50 ring-2 ring-primary/10" : ""
                )}
            >
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={onEditTask} />
                ))}

                {/* Inline Add Task Button */}
                <Button
                    variant="ghost"
                    onClick={onAddTask}
                    className="w-full h-9 border border-dashed border-slate-200 rounded-md text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 group"
                >
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    <span className="text-xs font-normal">Add Task</span>
                </Button>
            </div>
        </div>
    );
}

export default function StoryRow({ story, tasks, onAddTask, onEditTask, onEditStory }: { story: Story, tasks: Task[], onAddTask: () => void, onEditTask?: (task: Task) => void, onEditStory?: (story: Story) => void }) {
    // Generate a consistent color for the group line based on ID
    const groupColors = ["bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500"];
    const groupColor = groupColors[story.id % groupColors.length] || "bg-blue-500";

    return (
        <div className="mb-8 last:mb-0">
            {/* Story Header (Group Header) */}
            <div className="flex items-center gap-2 mb-4 group cursor-pointer w-full">
                <div className="flex items-center gap-2 flex-1 relative">
                    {/* Colored Line Indicator */}
                    <div className={cn("w-1.5 h-6 rounded-r-md absolute -left-6 md:-left-6", groupColor)} />

                    <ChevronDown className="w-4 h-4 text-slate-400" />

                    <div className="flex items-center gap-3 group/title" onClick={() => onEditStory?.(story)}>
                        <h4 className={cn("text-lg font-semibold tracking-tight transition-colors",
                            story.id === 0 ? "text-slate-500" : "text-foreground group-hover:text-primary"
                        )}>
                            {story.id !== 0 && <EntityHandler type="STORY" id={story.id} snapshotId={story.snapshot_id} />} {story.title}
                        </h4>
                        {story.id !== 0 && (
                            <Button variant="ghost" size="icon" className="w-5 h-5 opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-primary">
                                <Pencil className="w-3 h-3" />
                            </Button>
                        )}
                    </div>

                    {story.assigned_to_user && (
                        <Avatar className="w-5 h-5 border border-white shadow-sm">
                            <AvatarImage src={story.assigned_to_user.avatar_url} />
                            <AvatarFallback className="text-[9px]">{story.assigned_to_user.display_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}

                    <div className="text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-secondary rounded-full">
                        {tasks.length} items
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                        Collapse
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Kanban Columns Grid */}
            {/* Using a cleaner grid with less gap to match the compact nature of monday.com */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-2">
                <KanbanColumn
                    id={`${story.id}::not_started`}
                    status="not_started"
                    tasks={tasks.filter(t => t.status === 'not_started' || !t.status)}
                    onAddTask={onAddTask}
                    onEditTask={onEditTask}
                />
                <KanbanColumn
                    id={`${story.id}::in_progress`}
                    status="in_progress"
                    tasks={tasks.filter(t => t.status === 'in_progress')}
                    onAddTask={onAddTask}
                    onEditTask={onEditTask}
                />
                <KanbanColumn
                    id={`${story.id}::completed`}
                    status="completed"
                    tasks={tasks.filter(t => t.status === 'completed')}
                    onAddTask={onAddTask}
                    onEditTask={onEditTask}
                />
            </div>
        </div>
    );
}
