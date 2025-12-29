import { useDroppable } from '@dnd-kit/core';
import { Task, Story } from "@/types";
import TaskCard from "./TaskCard";
import { cn } from "@/lib/utils";
import { ChevronDown, MoreHorizontal, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function KanbanColumn({ id, status, tasks, title, onAddTask, onEditTask }: { id: string, status: string, tasks: Task[], title: string, onAddTask?: () => void, onEditTask?: (task: Task) => void }) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    const statusIcons: Record<string, any> = {
        'not_started': <div className="w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center text-[10px] font-black mr-2">N</div>,
        'in_progress': <div className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black mr-2">P</div>,
        'completed': <div className="w-5 h-5 rounded-md bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-black mr-2">D</div>
    };

    return (
        <div className="flex flex-col h-full min-w-0">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-1 text-slate-900">
                <div className="flex items-center">
                    {statusIcons[status]}
                    <span className="text-sm font-black uppercase tracking-tight">{title}</span>
                    <span className="ml-2 text-[10px] font-black bg-slate-100 text-slate-400 w-5 h-5 rounded-full flex items-center justify-center">
                        {tasks.length}
                    </span>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-300 hover:text-slate-600">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
            </div>

            {/* Column Body (Droppable) */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 min-h-[150px] rounded-2xl p-2 transition-all duration-300 space-y-4",
                    isOver ? "bg-primary/5 ring-2 ring-primary/20 ring-inset" : "bg-transparent"
                )}
            >
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={onEditTask} />
                ))}

                {/* Inline Add Task Button */}
                <Button
                    variant="ghost"
                    onClick={onAddTask}
                    className="w-full h-12 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 hover:text-primary hover:border-primary/50 hover:bg-primary/5 group transition-all"
                >
                    <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">添加任务</span>
                </Button>
            </div>
        </div>
    );
}

export default function StoryRow({ story, tasks, onAddTask, onEditTask, onEditStory }: { story: Story, tasks: Task[], onAddTask: () => void, onEditTask?: (task: Task) => void, onEditStory?: (story: Story) => void }) {
    return (
        <div className="mb-12 last:mb-0 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Story Header */}
            <div className="flex items-center gap-3 mb-6 group cursor-pointer w-fit">
                <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                <div className="flex items-center gap-2 group/title" onClick={() => onEditStory?.(story)}>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">
                        {story.title}
                    </h4>
                    <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover/title:opacity-100 text-slate-300 hover:text-primary transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                </div>
                {story.assigned_to_user && (
                    <Avatar className="w-6 h-6 border border-white shadow-sm ml-1">
                        <AvatarImage src={story.assigned_to_user.avatar_url} />
                        <AvatarFallback className="text-[8px]">{story.assigned_to_user.display_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                )}
                {story.id !== 0 && (
                    <div className="px-2 py-0.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                        {tasks.length}
                    </div>
                )}
            </div>

            {/* Kanban Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <KanbanColumn
                    id={`${story.id}::not_started`}
                    status="not_started"
                    title="未开始"
                    tasks={tasks.filter(t => t.status === 'not_started' || !t.status)}
                    onAddTask={onAddTask}
                    onEditTask={onEditTask}
                />
                <KanbanColumn
                    id={`${story.id}::in_progress`}
                    status="in_progress"
                    title="进行中"
                    tasks={tasks.filter(t => t.status === 'in_progress')}
                    onAddTask={onAddTask}
                    onEditTask={onEditTask}
                />
                <KanbanColumn
                    id={`${story.id}::completed`}
                    status="completed"
                    title="已完成"
                    tasks={tasks.filter(t => t.status === 'completed')}
                    onAddTask={onAddTask}
                    onEditTask={onEditTask}
                />
            </div>
        </div>
    );
}
