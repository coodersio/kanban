import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { BoardData, Story } from "@/types";
import StoryCard from '@/pages/components/StoryCard';
import StoryDetailDialog from '@/pages/components/StoryDetailDialog';
import { cn } from "@/lib/utils";
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Monday.com style status column
const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
    'not_started': { label: '未开始', color: 'bg-slate-400', bg: 'bg-slate-50/30' },
    'in_progress': { label: '进行中', color: 'bg-orange-400', bg: 'bg-orange-50/30' },
    'completed': { label: '已完成', color: 'bg-emerald-400', bg: 'bg-emerald-50/30' }
};

function KanbanColumn({
    id,
    status,
    stories,
    onStoryClick,
    sprintId,
    projectId,
    members,
    onTaskUpdate
}: {
    id: string,
    status: string,
    stories: Story[],
    onStoryClick: (story: Story) => void,
    sprintId: string,
    projectId: number,
    members: any[],
    onTaskUpdate: () => void
}) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['not_started'];

    return (
        <div className="flex flex-col h-full min-w-0">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", config.color)} />
                    <span className="text-sm font-semibold text-slate-700">{config.label}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                        {stories.length}
                    </span>
                </div>
            </div>

            {/* Column Body (Droppable) */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 min-h-[400px] rounded-lg transition-all duration-300 space-y-3 p-2",
                    config.bg,
                    isOver && "ring-2 ring-primary/20 bg-primary/5"
                )}
            >
                {stories.map(story => (
                    <StoryCard
                        key={story.id}
                        story={story}
                        onClick={onStoryClick}
                        sprintId={sprintId}
                        projectId={projectId}
                        members={members}
                        onTaskUpdate={onTaskUpdate}
                    />
                ))}

                {stories.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        暂无需求
                    </div>
                )}
            </div>
        </div>
    );
}

export default function KanbanBoard({
    sprintId,
    projectId,
    onAddTask,
    onEditTask,
    onEditStory,
    filterMemberId
}: {
    sprintId: string,
    projectId: number,
    onAddTask?: (id: number | null) => void,
    onEditTask?: (task: any) => void,
    onEditStory?: (story: Story) => void,
    filterMemberId?: number | null
}) {
    const [data, setData] = useState<BoardData>({ stories: [], tasks: [], members: [] });
    const [activeId, setActiveId] = useState<number | null>(null);
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchData = () => {
        let url = `/api/workbench/board?sprintId=${sprintId}&projectId=${projectId}`;
        if (filterMemberId) url += `&memberId=${filterMemberId}`;

        fetch(url)
            .then(res => res.json())
            .then(boardData => {
                setData(boardData);
            })
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
        const storyId = active.id as number;

        // Extract status from drop zone ID (format: "column::status")
        const newStatus = overId.replace('column::', '');

        if (!newStatus || !['not_started', 'in_progress', 'completed'].includes(newStatus)) {
            return;
        }

        const oldStory = data.stories.find((s: Story) => s.id === storyId);

        if (oldStory && oldStory.status !== newStatus) {
            // Optimistic update
            const newStories = data.stories.map((s: Story) =>
                s.id === storyId ? { ...s, status: newStatus } : s
            );
            setData(prev => ({ ...prev, stories: newStories }));

            // Update backend
            try {
                await fetch('/api/workbench/story/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sprintId,
                        projectId,
                        storyId,
                        status: newStatus
                    })
                });
                // Refresh data to get updated progress
                fetchData();
            } catch (err) {
                console.error('Error updating story status:', err);
                // Revert on error
                setData(prev => ({ ...prev, stories: data.stories }));
            }
        }
    };

    const handleStoryClick = (story: Story) => {
        setSelectedStory(story);
        setIsDetailOpen(true);
    };

    const activeStory = activeId ? data.stories.find((s: Story) => s.id === activeId) : null;

    // Group stories by status
    const notStartedStories = data.stories.filter((s: Story) => s.status === 'not_started' || !s.status);
    const inProgressStories = data.stories.filter((s: Story) => s.status === 'in_progress');
    const completedStories = data.stories.filter((s: Story) => s.status === 'completed');

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="h-full overflow-y-auto px-6 py-4">
                    {/* Three Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                        <KanbanColumn
                            id="column::not_started"
                            status="not_started"
                            stories={notStartedStories}
                            onStoryClick={handleStoryClick}
                            sprintId={sprintId}
                            projectId={projectId}
                            members={data.members}
                            onTaskUpdate={fetchData}
                        />
                        <KanbanColumn
                            id="column::in_progress"
                            status="in_progress"
                            stories={inProgressStories}
                            onStoryClick={handleStoryClick}
                            sprintId={sprintId}
                            projectId={projectId}
                            members={data.members}
                            onTaskUpdate={fetchData}
                        />
                        <KanbanColumn
                            id="column::completed"
                            status="completed"
                            stories={completedStories}
                            onStoryClick={handleStoryClick}
                            sprintId={sprintId}
                            projectId={projectId}
                            members={data.members}
                            onTaskUpdate={fetchData}
                        />
                    </div>

                    {data.stories.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center py-20 opacity-50 text-sm text-muted-foreground">
                            <p className="mb-4">暂无需求</p>
                            {onEditStory && (
                                <Button onClick={() => onEditStory({} as Story)} size="sm" variant="outline">
                                    <Plus className="w-4 h-4 mr-2" />
                                    添加需求
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeId && activeStory ? (
                        <div className="opacity-90 cursor-grabbing pointer-events-none">
                            <StoryCard
                                story={activeStory}
                                isOverlay
                                sprintId={sprintId}
                                projectId={projectId}
                                members={data.members}
                                onTaskUpdate={fetchData}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Story Detail Dialog */}
            <StoryDetailDialog
                open={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedStory(null);
                }}
                story={selectedStory}
                sprintId={sprintId}
                projectId={projectId}
                members={data.members}
                onUpdate={fetchData}
            />
        </>
    );
}
