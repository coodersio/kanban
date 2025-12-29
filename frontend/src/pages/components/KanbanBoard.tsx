import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { BoardData, Task, Story } from "@/types";
import StoryRow from '@/pages/components/StoryRow';
import TaskCard from '@/pages/components/TaskCard';

export default function KanbanBoard({ sprintId, projectId, onAddTask, onEditTask, onEditStory, filterMemberId }: { sprintId: string, projectId: number, onAddTask: (id: number | null) => void, onEditTask?: (task: Task) => void, onEditStory?: (story: Story) => void, filterMemberId?: number | null }) {
    const [data, setData] = useState<BoardData>({ stories: [], tasks: [], members: [] });
    const [activeId, setActiveId] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchData = () => {
        let url = `/api/workbench/board?sprintId=${sprintId}&projectId=${projectId}`;
        if (filterMemberId) url += `&memberId=${filterMemberId}`;
        fetch(url)
            .then(res => res.json())
            .then(setData)
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchData();
    }, [sprintId, projectId, filterMemberId]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as number);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const overId = String(over.id);
        let newStatus = '';
        let targetStoryId = 0;

        if (overId.includes('::')) {
            const parts = overId.split('::');
            targetStoryId = parseInt(parts[0]);
            newStatus = parts[1];
        } else {
            const overTask = data.tasks.find((t: Task) => t.id === parseInt(overId));
            if (overTask) {
                newStatus = overTask.status;
                targetStoryId = overTask.story_id || 0;
            }
        }

        if (newStatus && (newStatus === 'not_started' || newStatus === 'in_progress' || newStatus === 'completed')) {
            const taskId = active.id as number;
            const oldTask = data.tasks.find((t: Task) => t.id === taskId);

            if (oldTask && (oldTask.status !== newStatus || oldTask.story_id !== targetStoryId)) {
                const newTasks = data.tasks.map((t: Task) =>
                    t.id === taskId ? { ...t, status: newStatus as any, story_id: targetStoryId } : t
                );
                setData(prev => ({ ...prev, tasks: newTasks }));

                await fetch('/api/workbench/task/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sprintId,
                        projectId,
                        taskId,
                        status: newStatus,
                        storyId: targetStoryId
                    })
                });
            }
        }
    };

    const activeTask = activeId ? data.tasks.find((t: Task) => t.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full overflow-y-auto px-4 py-4">
                {data.stories.map((story: Story) => (
                    <StoryRow
                        key={story.id}
                        story={story}
                        tasks={data.tasks.filter((t: Task) => t.story_id === story.id)}
                        onAddTask={() => onAddTask(story.id)}
                        onEditTask={onEditTask}
                        onEditStory={onEditStory}
                    />
                ))}

                {/* Orphaned Tasks (No Story) */}
                {data.tasks.some((t: Task) => !t.story_id) && (
                    <StoryRow
                        key="orphan"
                        story={{ id: 0, title: '未归类任务', status: 'active', task_count: data.tasks.filter((t: Task) => !t.story_id).length }}
                        tasks={data.tasks.filter((t: Task) => !t.story_id)}
                        onAddTask={() => onAddTask(null)}
                        onEditTask={onEditTask}
                        onEditStory={onEditStory}
                    />
                )}

                {data.stories.length === 0 && data.tasks.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-50 text-sm text-muted-foreground">
                        暂无内容
                    </div>
                )}
            </div>

            <DragOverlay dropAnimation={null}>
                {activeId && activeTask ? (
                    <div className="opacity-90 rotate-2 cursor-grabbing scale-105 pointer-events-none">
                        <TaskCard task={activeTask} isOverlay />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
