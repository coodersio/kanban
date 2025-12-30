import { useState, useEffect, useMemo } from 'react';
import type { BoardData, Story, Task, Member, Sprint } from "@/types";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronUp, ChevronDown } from "lucide-react";
import ListViewStoryRow from './ListViewStoryRow';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

interface ListViewProps {
    sprintId: string;
    projectId: number;
    filterMemberId?: number | null;
    members?: Member[];
    onEditTask?: (task: Task) => void;
    onEditStory?: (story: Story) => void;
    sprints?: Sprint[];
    onStoryMove?: () => void;
    lastSelectedTaskId?: number | null;
    lastSelectedStoryId?: number | null;
}

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

export default function ListView({
    sprintId,
    projectId,
    filterMemberId,
    members,
    onEditTask,
    onEditStory,
    lastSelectedTaskId,
    lastSelectedStoryId,
}: ListViewProps) {
    const [data, setData] = useState<BoardData>({ stories: [], tasks: [], members: [] });
    const [expandedStories, setExpandedStories] = useState<Set<number>>(new Set());
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    const fetchData = () => {
        let url = `/api/workbench/board?sprintId=${sprintId}&projectId=${projectId}`;
        if (filterMemberId) url += `&memberId=${filterMemberId}`;

        fetch(url)
            .then(res => res.json())
            .then(data => setData(data))
            .catch(err => console.error('Error fetching board data:', err));
    };

    useEffect(() => {
        fetchData();
    }, [sprintId, projectId, filterMemberId]);

    const handleDataChange = () => {
        fetchData(); // Re-fetch data after inline edit
    };

    // Auto-expand all stories when data loads
    useEffect(() => {
        if (data.stories.length > 0) {
            setExpandedStories(new Set(data.stories.map(s => s.id)));
        }
    }, [data.stories]);

    const handleToggleExpand = (storyId: number) => {
        const newExpanded = new Set(expandedStories);
        if (newExpanded.has(storyId)) {
            newExpanded.delete(storyId);
        } else {
            newExpanded.add(storyId);
        }
        setExpandedStories(newExpanded);
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedStories = useMemo(() => {
        if (!sortConfig) return data.stories;

        return [...data.stories].sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];

            // Handle null/undefined
            if (aValue == null) return 1;
            if (bValue == null) return -1;

            // Type-specific comparison
            if (sortConfig.key === 'planned_completion_date') {
                const aTime = new Date(aValue).getTime();
                const bTime = new Date(bValue).getTime();
                return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
            }

            // String/number comparison
            const comparison = aValue > bValue ? 1 : -1;
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [data.stories, sortConfig]);

    const handleStoryDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = sortedStories.findIndex(s => s.id === active.id);
        const newIndex = sortedStories.findIndex(s => s.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistically update UI
        const reordered = arrayMove(sortedStories, oldIndex, newIndex);
        setData(prev => ({ ...prev, stories: reordered }));

        // Update backend
        const orders = reordered.map((s, idx) => ({ id: s.id, order: idx + 1 }));
        fetch('/api/workbench/stories/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sprintId, projectId, orders })
        }).catch(err => {
            console.error('Error reordering stories:', err);
            // Revert on error
            fetchData();
        });
    };

    const SortableHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort(sortKey)}
        >
            <div className="flex items-center gap-2">
                <span>{label}</span>
                {sortConfig?.key === sortKey && (
                    sortConfig.direction === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )
                )}
            </div>
        </TableHead>
    );

    return (
        <div className="h-full overflow-y-auto overflow-x-hidden px-6 py-4">
            {data.stories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                    <span className="text-sm">暂无关键节点</span>
                </div>
            ) : (
                <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleStoryDragEnd}
                >
                    <div className="overflow-x-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead className="w-10"></TableHead>
                                    <SortableHeader label="标题" sortKey="title" />
                                    <SortableHeader label="状态" sortKey="status" />
                                    <SortableHeader label="优先级" sortKey="priority" />
                                    <SortableHeader label="负责人" sortKey="assigned_to_user" />
                                    <SortableHeader label="计划完成日期" sortKey="planned_completion_date" />
                                </TableRow>
                            </TableHeader>
                            <SortableContext
                                items={sortedStories.map(s => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <TableBody>
                                    {sortedStories.map(story => {
                                        const storyTasks = data.tasks.filter(t => t.story_id === story.id);
                                        return (
                                            <ListViewStoryRow
                                                key={story.id}
                                                story={story}
                                                isExpanded={expandedStories.has(story.id)}
                                                onToggleExpand={() => handleToggleExpand(story.id)}
                                                tasks={storyTasks}
                                                members={members || data.members}
                                                onEditStory={onEditStory || (() => {})}
                                                onEditTask={onEditTask || (() => {})}
                                                sprintId={sprintId}
                                                projectId={projectId}
                                                onDataChange={handleDataChange}
                                                lastSelectedTaskId={lastSelectedTaskId}
                                                lastSelectedStoryId={lastSelectedStoryId}
                                            />
                                        );
                                    })}
                                </TableBody>
                            </SortableContext>
                        </Table>
                    </div>
                </DndContext>
            )}
        </div>
    );
}
