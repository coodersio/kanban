import { useState, useEffect } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import type { Story, Task, Project } from '@/types';

// Custom Hooks
import { useWorkbenchState } from '@/hooks/useWorkbenchState';
import { useDialogState } from '@/hooks/useDialogState';
import { useMemberFilter } from '@/hooks/useMemberFilter';
import { useViewPreference } from '@/hooks/useViewPreference';

// Components
import { WorkbenchHeader } from './Workbench/components/WorkbenchHeader';
import { BoardArea } from './Workbench/components/BoardArea';
import { PriorityListView } from './Workbench/components/PriorityListView';
import { StoryDialog } from './Workbench/components/StoryDialog';
import { TaskDialog } from './Workbench/components/TaskDialog';
import { ProjectDialog } from './Workbench/components/ProjectDialog';
import TaskDetailsDrawer from './components/TaskDetailsDrawer';
import StoryDetailsDrawer from './components/StoryDetailsDrawer';

export default function Workbench() {
    const { currentUser } = useOutletContext<{ currentUser: { id: number, role: string, displayName: string } }>();
    const isExternal = currentUser?.role === 'external';

    const location = useLocation();
    const navigate = useNavigate();

    // Use custom hooks
    const { filterMemberId, setFilterMemberId } = useMemberFilter();

    const {
        sprints,
        projects,
        members,
        departments,
        projectTypes,
        selectedSprintId,
        selectedProjectId,
        refreshTrigger,
        setSelectedProjectId,
        setProjects,
        triggerRefresh,
        handleSprintChange
    } = useWorkbenchState(filterMemberId);

    const dialogState = useDialogState();
    const { viewMode, setViewMode } = useViewPreference();

    // Additional state for stories (needed for task dialog)
    const [stories, setStories] = useState<Story[]>([]);

    // Drawer state for task/story editing
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedStoryForEdit, setSelectedStoryForEdit] = useState<Story | null>(null);
    const [lastSelectedTaskId, setLastSelectedTaskId] = useState<number | null>(null);
    const [lastSelectedStoryId, setLastSelectedStoryId] = useState<number | null>(null);

    // Project editing state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    // Initial story ID for task dialog (when adding task from story)
    const [initialTaskStoryId, setInitialTaskStoryId] = useState<number | null>(null);

    // Fetch stories for current sprint/project
    useEffect(() => {
        if (!selectedSprintId || !selectedProjectId) {
            setStories([]);
            return;
        }
        fetch(`/api/workbench/board?sprintId=${selectedSprintId}&projectId=${selectedProjectId}`)
            .then(res => res.json())
            .then(data => setStories(data.stories))
            .catch(err => console.error(err));
    }, [selectedSprintId, selectedProjectId, refreshTrigger]);

    // URL synchronization - Open drawers based on URL
    useEffect(() => {
        const pathMatch = location.pathname.match(/\/(STORY|TASK|PROJECT)-(\d+)(?:-(\d+))?$/);

        if (pathMatch) {
            const [, type, refId, snapshotId] = pathMatch;
            const id = snapshotId ? parseInt(snapshotId) : parseInt(refId);

            if (type === 'PROJECT') {
                fetch(`/api/workbench/sprint-project/${id}`)
                    .then(res => res.json())
                    .then(project => {
                        if (project.sprint_id && project.sprint_id.toString() !== selectedSprintId) {
                            handleSprintChange(project.sprint_id.toString());
                        }
                        if (selectedProjectId !== project.id) {
                            setSelectedProjectId(project.id);
                        }
                    })
                    .catch(err => {
                        console.error('Error fetching project snapshot:', err);
                        navigate('/dashboard/workbench');
                    });
            } else if (type === 'STORY') {
                fetch(`/api/workbench/sprint-story/${id}`)
                    .then(res => res.json())
                    .then(story => {
                        if (story.sprint_id && story.sprint_id.toString() !== selectedSprintId) {
                            handleSprintChange(story.sprint_id.toString());
                        }
                        if (story.project_id && selectedProjectId !== story.project_id) {
                            setSelectedProjectId(story.project_id);
                        }
                        setSelectedStoryForEdit(story);
                        setLastSelectedStoryId(story.id);
                        setLastSelectedTaskId(null);
                        dialogState.setIsStoryDrawerOpen(true);
                    })
                    .catch(err => {
                        console.error('Error fetching story snapshot:', err);
                        navigate('/dashboard/workbench');
                    });
            } else if (type === 'TASK') {
                fetch(`/api/workbench/sprint-task/${id}`)
                    .then(res => res.json())
                    .then(task => {
                        if (task.sprint_id && task.sprint_id.toString() !== selectedSprintId) {
                            handleSprintChange(task.sprint_id.toString());
                        }
                        if (task.project_id && selectedProjectId !== task.project_id) {
                            setSelectedProjectId(task.project_id);
                        }
                        setSelectedTask(task);
                        setLastSelectedTaskId(task.id);
                        setLastSelectedStoryId(null);
                        dialogState.setIsDrawerOpen(true);
                    })
                    .catch(err => {
                        console.error('Error fetching task snapshot:', err);
                        navigate('/dashboard/workbench');
                    });
            }
        } else {
            dialogState.closeAllDrawers();
        }
    }, [location.pathname, navigate]);

    // === Story Handlers ===
    const handleCreateStory = async (data: {
        title: string;
        description: string;
        assignedTo: number | null;
        priority: string;
        plannedDate: Date | undefined;
        sprintId: string;
    }) => {
        if (!data.title || !data.sprintId || !selectedProjectId) return;
        try {
            const res = await fetch('/api/workbench/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId: data.sprintId,
                    projectId: selectedProjectId,
                    title: data.title,
                    description: data.description,
                    assignedTo: data.assignedTo,
                    priority: data.priority,
                    planned_completion_date: data.plannedDate?.toISOString().split('T')[0] || null
                })
            });
            if (res.ok) {
                dialogState.closeStoryDialog();
                triggerRefresh();
            }
        } catch (err) {
            console.error('Error adding story:', err);
        }
    };

    const handleReuseStory = async (storyIds: number[], assignedTo: number | null) => {
        if (storyIds.length === 0 || !selectedSprintId || !selectedProjectId) return;
        try {
            const promises = storyIds.map(storyId =>
                fetch('/api/workbench/story/reuse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sprintId: selectedSprintId,
                        projectId: selectedProjectId,
                        storyId,
                        assignedTo
                    })
                })
            );
            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.ok);
            if (allSuccess) {
                dialogState.closeStoryDialog();
                triggerRefresh();
            } else {
                alert('部分节点添加失败，请重试');
            }
        } catch (err) {
            console.error('Error reusing stories:', err);
            alert('添加节点失败，请重试');
        }
    };

    const handleUpdateStory = async (updatedStory: any) => {
        try {
            const res = await fetch('/api/workbench/story/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedStory)
            });
            if (res.ok) {
                triggerRefresh();
            }
        } catch (err) {
            console.error('Error updating story:', err);
        }
    };

    const handleDeleteStory = () => {
        triggerRefresh();
    };

    // === Task Handlers ===
    const handleCreateTask = async (data: {
        title: string;
        description: string;
        assignedTo: number | null;
        priority: string;
        estimatedHours: number | undefined;
        storyId: number | null;
        sprintId: string;
    }) => {
        if (!data.title || !data.sprintId || !selectedProjectId) return;
        try {
            const res = await fetch('/api/workbench/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId: data.sprintId,
                    projectId: selectedProjectId,
                    storyId: data.storyId,
                    title: data.title,
                    description: data.description,
                    priority: data.priority,
                    estimatedHours: data.estimatedHours,
                    assignedTo: data.assignedTo
                })
            });
            if (res.ok) {
                dialogState.closeTaskDialog();
                triggerRefresh();
            }
        } catch (err) {
            console.error('Error adding task:', err);
        }
    };

    const handleReuseTask = async (taskIds: number[], storyId: number | null, assignedTo: number | null) => {
        if (taskIds.length === 0 || !selectedSprintId || !selectedProjectId) return;
        try {
            const promises = taskIds.map(taskId =>
                fetch('/api/workbench/task/reuse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sprintId: selectedSprintId,
                        projectId: selectedProjectId,
                        storyId,
                        taskId,
                        assignedTo
                    })
                })
            );
            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.ok);
            if (allSuccess) {
                dialogState.closeTaskDialog();
                triggerRefresh();
            } else {
                alert('部分任务添加失败，请重试');
            }
        } catch (err) {
            console.error('Error reusing tasks:', err);
            alert('添加任务失败，请重试');
        }
    };

    const handleUpdateTask = async (updatedTask: any) => {
        try {
            const res = await fetch('/api/workbench/task/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTask)
            });
            if (res.ok) {
                triggerRefresh();
            }
        } catch (err) {
            console.error('Error updating task:', err);
        }
    };

    const handleDeleteTask = () => {
        triggerRefresh();
    };

    // === Project Handlers ===
    const handleSaveProject = async (data: {
        name: string;
        description: string;
        departmentId: number | null;
        projectTypeId: number | null;
        ownerId: number | null;
        source: string;
        priority: string;
        notes: string;
        projectId?: number | null;
    }) => {
        if (!data.name) return;
        try {
            const body = {
                sprintId: selectedSprintId,
                projectId: data.projectId,
                name: data.name,
                description: data.description,
                department_id: data.departmentId,
                project_type_id: data.projectTypeId,
                owner_id: data.ownerId,
                source: data.source,
                priority: data.priority,
                notes: data.notes
            };

            const url = isEditMode ? '/api/workbench/project/update' : '/api/projects';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const newProjOrMsg = await res.json();
                const shouldClearFilter = !isEditMode
                    && filterMemberId !== null
                    && (!data.ownerId || data.ownerId !== filterMemberId);
                if (shouldClearFilter) {
                    setFilterMemberId(null);
                }
                dialogState.closeProjectDialog();
                setIsEditMode(false);
                setEditingProject(null);

                // Refresh project list
                fetch(`/api/workbench/sprint/${selectedSprintId}/projects`)
                    .then(r => r.json())
                    .then(data => {
                        setProjects(data);
                        if (!isEditMode && newProjOrMsg.id) {
                            const newProject = data.find((p: Project) => p.id === newProjOrMsg.id);
                            if (newProject?.snapshot_id) {
                                const params = new URLSearchParams();
                                params.set('sprint', selectedSprintId);
                                navigate(`/dashboard/workbench/PROJECT-${newProject.id}-${newProject.snapshot_id}?${params.toString()}`);
                            }
                        }
                    });
            }
        } catch (err) {
            console.error('Error saving project:', err);
        }
    };

    const handleReuseProject = async (projectIds: number[], priority: string, notes: string) => {
        if (projectIds.length === 0 || !selectedSprintId) return;
        try {
            const promises = projectIds.map(projectId =>
                fetch('/api/workbench/sprint/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sprintId: selectedSprintId,
                        projectId,
                        priority,
                        notes
                    })
                })
            );
            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.ok);
            if (allSuccess) {
                dialogState.closeProjectDialog();
                // Refresh project list
                fetch(`/api/workbench/sprint/${selectedSprintId}/projects`)
                    .then(r => r.json())
                    .then(data => {
                        setProjects(data);
                        if (projectIds.length > 0) {
                            const project = data.find((p: Project) => p.id === projectIds[0]);
                            const params = new URLSearchParams();
                            params.set('sprint', selectedSprintId);
                            if (project?.snapshot_id) {
                                navigate(`/dashboard/workbench/PROJECT-${project.id}-${project.snapshot_id}?${params.toString()}`);
                            }
                        }
                    });
            } else {
                alert('部分项目添加失败，请重试');
            }
        } catch (err) {
            console.error('Error reusing projects:', err);
            alert('添加项目失败，请重试');
        }
    };

    const handleDeleteProjectFromSprint = async () => {
        if (!editingProject || !selectedSprintId) return;
        if (!confirm('确定要从当前迭代中删除该项目吗？这将删除该项目在本迭代的所有快照数据。')) {
            return;
        }

        try {
            const res = await fetch('/api/workbench/sprint/project/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId: selectedSprintId,
                    projectId: editingProject.id
                })
            });

            if (res.ok) {
                dialogState.closeProjectDialog();
                setIsEditMode(false);
                setEditingProject(null);
                // Refresh project list
                fetch(`/api/workbench/sprint/${selectedSprintId}/projects`)
                    .then(r => r.json())
                    .then(data => {
                        setProjects(data);
                        if (selectedProjectId === editingProject.id) {
                            if (data.length > 0 && data[0].snapshot_id) {
                                const params = new URLSearchParams();
                                params.set('sprint', selectedSprintId);
                                navigate(`/dashboard/workbench/PROJECT-${data[0].id}-${data[0].snapshot_id}?${params.toString()}`);
                            } else {
                                const params = new URLSearchParams();
                                params.set('sprint', selectedSprintId);
                                navigate(`/dashboard/workbench?${params.toString()}`);
                            }
                        }
                    });
            } else {
                alert('删除失败，请重试');
            }
        } catch (err) {
            console.error('Error deleting project from sprint:', err);
            alert('删除失败，请重试');
        }
    };

    // === Dialog/Drawer Openers ===
    const openAddStoryDialog = () => {
        dialogState.openStoryDialog();
    };

    const openAddTaskDialog = (storyId: number | null = null) => {
        setInitialTaskStoryId(storyId);
        dialogState.openTaskDialog();
    };

    const openAddProjectDialog = () => {
        setIsEditMode(false);
        setEditingProject(null);
        dialogState.openProjectDialog();
    };

    const openEditProjectDialog = (project: Project) => {
        setIsEditMode(true);
        setEditingProject(project);
        dialogState.openProjectDialog();
    };

    const openEditTask = (task: Task) => {
        if (task.snapshot_id) {
            navigate(`/dashboard/workbench/TASK-${task.id}-${task.snapshot_id}`);
        } else {
            navigate(`/dashboard/workbench/TASK-${task.id}`);
        }
    };

    const openEditStory = (story: Story) => {
        if (story.id === 0) return; // Can't edit "Uncategorized"
        if (story.snapshot_id) {
            navigate(`/dashboard/workbench/STORY-${story.id}-${story.snapshot_id}`);
        } else {
            navigate(`/dashboard/workbench/STORY-${story.id}`);
        }
    };

    const handleProjectSelect = (projectId: number) => {
        const project = projects.find(p => p.id === projectId);
        setSelectedProjectId(projectId);
        const params = new URLSearchParams();
        params.set('sprint', selectedSprintId);
        if (project?.snapshot_id) {
            navigate(`/dashboard/workbench/PROJECT-${project.id}-${project.snapshot_id}?${params.toString()}`);
        } else {
            console.warn('Project snapshot_id not found, using project id as fallback', project);
            navigate(`/dashboard/workbench/PROJECT-${projectId}?${params.toString()}`);
        }
    };

    const handleSprintChangeWithCloseDrawers = (newSprintId: string) => {
        handleSprintChange(newSprintId);
        dialogState.closeAllDrawers();
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <WorkbenchHeader
                sprints={sprints}
                selectedSprintId={selectedSprintId}
                onSprintChange={handleSprintChangeWithCloseDrawers}
                members={members}
                filterMemberId={filterMemberId}
                onMemberFilterChange={setFilterMemberId}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onAddStory={openAddStoryDialog}
                onAddTask={() => openAddTaskDialog()}
                isExternal={isExternal}
            />

            {/* Main Content Area - Switch between views */}
            {viewMode === 'kanban' ? (
                <BoardArea
                    projects={projects}
                    selectedProjectId={selectedProjectId}
                    selectedSprintId={selectedSprintId}
                    onProjectSelect={handleProjectSelect}
                    onAddProjectClick={openAddProjectDialog}
                    onEditProjectClick={openEditProjectDialog}
                    isExternal={isExternal}
                    members={members}
                    sprints={sprints}
                    filterMemberId={filterMemberId}
                    refreshTrigger={refreshTrigger}
                    onAddTask={openAddTaskDialog}
                    onEditTask={openEditTask}
                    onEditStory={openEditStory}
                    onStoryMove={triggerRefresh}
                    lastSelectedTaskId={lastSelectedTaskId}
                    lastSelectedStoryId={lastSelectedStoryId}
                />
            ) : (
                <PriorityListView
                    selectedSprintId={selectedSprintId}
                    filterMemberId={filterMemberId}
                    onStoryClick={openEditStory}
                    onStoryStatusChange={triggerRefresh}
                />
            )}

            {/* Dialogs */}
            <StoryDialog
                open={dialogState.isStoryDialogOpen}
                onOpenChange={dialogState.setIsStoryDialogOpen}
                activeTab={dialogState.activeStoryTab}
                onTabChange={dialogState.setActiveStoryTab}
                onCreateStory={handleCreateStory}
                onReuseStory={handleReuseStory}
                sprints={sprints}
                members={members}
                selectedSprintId={selectedSprintId}
                selectedProjectId={selectedProjectId}
            />

            <TaskDialog
                open={dialogState.isTaskDialogOpen}
                onOpenChange={dialogState.setIsTaskDialogOpen}
                activeTab={dialogState.activeTaskTab}
                onTabChange={dialogState.setActiveTaskTab}
                onCreateTask={handleCreateTask}
                onReuseTask={handleReuseTask}
                sprints={sprints}
                members={members}
                stories={stories}
                selectedSprintId={selectedSprintId}
                selectedProjectId={selectedProjectId}
                initialStoryId={initialTaskStoryId}
            />

            <ProjectDialog
                open={dialogState.isProjectDialogOpen}
                onOpenChange={dialogState.setIsProjectDialogOpen}
                activeTab={dialogState.activeProjectTab}
                onTabChange={dialogState.setActiveProjectTab}
                isEditMode={isEditMode}
                onSaveProject={handleSaveProject}
                onReuseProject={handleReuseProject}
                onDeleteProject={handleDeleteProjectFromSprint}
                sprints={sprints}
                members={members}
                departments={departments}
                projectTypes={projectTypes}
                selectedSprintId={selectedSprintId}
                editingProject={editingProject}
            />

            {/* Drawers */}
            <TaskDetailsDrawer
                task={selectedTask}
                open={dialogState.isDrawerOpen}
                onClose={() => navigate('/dashboard/workbench')}
                onSave={handleUpdateTask}
                onDelete={handleDeleteTask}
                members={members}
                currentUser={currentUser}
                sprintId={selectedSprintId ? parseInt(selectedSprintId) : undefined}
                projectId={selectedProjectId || undefined}
                sprints={sprints}
            />

            <StoryDetailsDrawer
                story={selectedStoryForEdit}
                open={dialogState.isStoryDrawerOpen}
                onClose={() => navigate('/dashboard/workbench')}
                onSave={handleUpdateStory}
                onDelete={handleDeleteStory}
                members={members}
                currentUser={currentUser}
                sprintId={selectedSprintId ? parseInt(selectedSprintId) : undefined}
                projectId={selectedProjectId || undefined}
                sprints={sprints}
            />
        </div>
    );
}
