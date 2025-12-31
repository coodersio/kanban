import { useState } from 'react';
import type { Project, Sprint, Member, Story, Task } from '@/types';
import { Button } from "@/components/ui/button";
import { Plus, Layout, LayoutGrid, List } from 'lucide-react';
import ProjectSidebar from '../../components/ProjectSidebar';
import KanbanBoard from '../../components/KanbanBoard';
import ListView from '../../components/ListView';

interface BoardAreaProps {
    // Projects sidebar
    projects: Project[];
    selectedProjectId: number | null;
    selectedSprintId: string;
    onProjectSelect: (projectId: number) => void;
    onAddProjectClick?: () => void;
    onEditProjectClick?: (project: Project) => void;
    isExternal: boolean;

    // Board data
    members: Member[];
    sprints: Sprint[];
    filterMemberId: number | null;
    refreshTrigger: number;

    // Handlers
    onAddTask: (storyId: number | null) => void;
    onEditTask: (task: Task) => void;
    onEditStory: (story: Story) => void;
    onStoryMove: () => void;

    // For ListView selection tracking
    lastSelectedTaskId: number | null;
    lastSelectedStoryId: number | null;
}

export function BoardArea({
    projects,
    selectedProjectId,
    selectedSprintId,
    onProjectSelect,
    onAddProjectClick,
    onEditProjectClick,
    isExternal,
    members,
    sprints,
    filterMemberId,
    refreshTrigger,
    onAddTask,
    onEditTask,
    onEditStory,
    onStoryMove,
    lastSelectedTaskId,
    lastSelectedStoryId
}: BoardAreaProps) {
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    return (
        <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 flex flex-col min-h-0 flex-shrink-0 border-r bg-background z-10">
                <div className="flex items-center justify-between px-4 py-4 border-b">
                    <h3 className="text-sm font-bold text-foreground">项目列表</h3>
                    {!isExternal && onAddProjectClick && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onAddProjectClick}
                            className="w-7 h-7 hover:bg-muted/50 text-muted-foreground hover:text-foreground rounded-md"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ProjectSidebar
                        projects={projects}
                        selectedId={selectedProjectId}
                        onSelect={onProjectSelect}
                        onAddClick={!isExternal ? onAddProjectClick : undefined}
                        onEditClick={!isExternal ? onEditProjectClick : undefined}
                    />
                </div>
            </aside>

            {/* Main Content - Board */}
            <main className="flex-1 min-h-0 bg-slate-50/50 flex flex-col relative overflow-hidden">
                {selectedProjectId && (
                    <div className="px-6 py-3 border-b bg-background/50 backdrop-blur-sm flex items-center justify-between">
                        <h2 className="text-lg font-bold text-foreground tracking-tight">
                            {selectedProject?.name}
                        </h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('kanban')}
                                className="h-8 px-3 text-xs"
                            >
                                <LayoutGrid className="w-4 h-4 mr-2" />
                                看板视图
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className="h-8 px-3 text-xs"
                            >
                                <List className="w-4 h-4 mr-2" />
                                列表视图
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-hidden relative">
                    {selectedSprintId && selectedProjectId ? (
                        viewMode === 'kanban' ? (
                            <KanbanBoard
                                key={`${selectedSprintId}-${selectedProjectId}-${filterMemberId}-${refreshTrigger}`}
                                sprintId={selectedSprintId}
                                projectId={selectedProjectId}
                                filterMemberId={filterMemberId}
                                members={members}
                                onAddTask={onAddTask}
                                onEditTask={onEditTask}
                                onEditStory={onEditStory}
                                sprints={sprints}
                                onStoryMove={onStoryMove}
                            />
                        ) : (
                            <ListView
                                key={`${selectedSprintId}-${selectedProjectId}-${filterMemberId}-${refreshTrigger}`}
                                sprintId={selectedSprintId}
                                projectId={selectedProjectId}
                                filterMemberId={filterMemberId}
                                members={members}
                                onEditTask={onEditTask}
                                onEditStory={onEditStory}
                                lastSelectedTaskId={lastSelectedTaskId}
                                lastSelectedStoryId={lastSelectedStoryId}
                            />
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                            <Layout className="w-12 h-12 opacity-10" />
                            <div className="text-sm font-medium">请选择一个项目</div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
