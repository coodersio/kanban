import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Layout, User, Settings, LayoutGrid, ArrowUpDown, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import KanbanBoard from './components/KanbanBoard';
import ProjectSidebar from './components/ProjectSidebar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sprint, Project, Member, Story, Task, Department, ProjectType } from "@/types";
import TaskDetailsDrawer from './components/TaskDetailsDrawer';
import StoryDetailsDrawer from './components/StoryDetailsDrawer';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

// Helper function to convert priority between number and string
const normalizePriority = (priority: string | number | undefined): string => {
    if (typeof priority === 'string') return priority;
    if (typeof priority === 'number') {
        // Convert old number priorities to new string format
        if (priority <= 1) return '高';
        if (priority <= 2) return '中';
        return '低';
    }
    return '中'; // default
};

export default function Workbench() {
    const { currentUser } = useOutletContext<{ currentUser: { id: number, role: string, displayName: string } }>();
    const isAdmin = currentUser?.role === 'admin';
    const isExternal = currentUser?.role === 'external';

    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [selectedSprintId, setSelectedSprintId] = useState<string>('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [stories, setStories] = useState<Story[]>([]);

    // Dialog States
    const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(false);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [targetStoryId, setTargetStoryId] = useState<number | null>(null);
    const [priority, setPriority] = useState('中');
    const [size, setSize] = useState('Medium');
    const [assignedTo, setAssignedTo] = useState<number | null>(null);
    const [storyPriority, setStoryPriority] = useState('medium');
    const [storyPlannedDate, setStoryPlannedDate] = useState<Date | undefined>(undefined);
    const [filterMemberId, setFilterMemberId] = useState<number | null>(null);
    const [createSprintId, setCreateSprintId] = useState<string>(''); // For create form sprint selection
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
    const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
    const [priorityNotes, setPriorityNotes] = useState('');
    const [projectPriority, setProjectPriority] = useState<string>('中');


    // Edit Task Drawer State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Edit Story Drawer State
    const [selectedStoryForEdit, setSelectedStoryForEdit] = useState<Story | null>(null);
    const [isStoryDrawerOpen, setIsStoryDrawerOpen] = useState(false);

    // Reuse Flow State
    const [storyReuseSearch, setStoryReuseSearch] = useState('');
    const [availableStories, setAvailableStories] = useState<Story[]>([]);
    const [selectedReuseStoryIds, setSelectedReuseStoryIds] = useState<number[]>([]);

    const [taskReuseSearch, setTaskReuseSearch] = useState('');
    const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
    const [selectedReuseTaskIds, setSelectedReuseTaskIds] = useState<number[]>([]);

    const [activeStoryTab, setActiveStoryTab] = useState('create');
    const [activeTaskTab, setActiveTaskTab] = useState('create');
    const [activeProjectTab, setActiveProjectTab] = useState('create');

    const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
    const [selectedReuseProjectIds, setSelectedReuseProjectIds] = useState<number[]>([]);

    // Sprint Manager State
    const [isSprintManagerOpen, setIsSprintManagerOpen] = useState(false);
    const [newSprintName, setNewSprintName] = useState('');
    const [newSprintStart, setNewSprintStart] = useState('');
    const [newSprintEnd, setNewSprintEnd] = useState('');

    const handleCloseSprint = async (sprintId: number) => {
        try {
            const res = await fetch(`/api/sprints/${sprintId}/close`, { method: 'POST' });
            if (res.ok) {
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            console.error('Error closing sprint:', err);
        }
    };

    const handleActivateSprint = async (sprintId: number) => {
        try {
            const res = await fetch(`/api/sprints/${sprintId}/activate`, { method: 'POST' });
            if (res.ok) {
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            console.error('Error activating sprint:', err);
        }
    };

    const handleCreateSprint = async () => {
        if (!newSprintName || !newSprintStart || !newSprintEnd) return;
        try {
            const res = await fetch('/api/sprints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newSprintName,
                    start_date: newSprintStart,
                    end_date: newSprintEnd
                })
            });
            if (res.ok) {
                setNewSprintName('');
                setNewSprintStart('');
                setNewSprintEnd('');
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            console.error('Error creating sprint:', err);
        }
    };

    // Re-fetch sprints when refreshTrigger changes
    useEffect(() => {
        fetch('/api/sprints')
            .then(res => res.json())
            .then(data => {
                setSprints(data);
                // If current selection is not in data, or it's empty, pick the active one
                const active = data.find((s: Sprint) => s.status === 'active');
                if (active && (!selectedSprintId || !data.some((s: Sprint) => s.id.toString() === selectedSprintId))) {
                    setSelectedSprintId(active.id.toString());
                } else if (!selectedSprintId && data.length > 0) { // If no sprint is selected initially, pick the first one if no active
                    setSelectedSprintId(data[0].id.toString());
                }
            });
    }, [refreshTrigger]);

    // Initial Fetch: Get Members, Departments, Project Types from DB
    useEffect(() => {
        // Fetch Real Users
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                // Filter out external users from avatar display
                const filteredData = data.filter((u: any) => u.role !== 'external');
                setMembers(filteredData.map((u: any) => ({
                    id: u.id,
                    user_name: u.user_name,
                    display_name: u.display_name,
                    avatar_url: u.avatar_url || null,
                    role: u.role
                })));
            })
            .catch(err => console.error('Error fetching users:', err));
        // Fetch Departments
        fetch('/api/departments')
            .then(res => res.json())
            .then(data => setDepartments(data))
            .catch(err => console.error('Error fetching departments:', err));

        // Fetch Project Types
        fetch('/api/project-types')
            .then(res => res.json())
            .then(data => setProjectTypes(data))
            .catch(err => console.error('Error fetching project types:', err));
    }, []);

    // Fetch Projects when Sprint Changes
    useEffect(() => {
        if (!selectedSprintId) return;
        fetch(`/api/workbench/sprint/${selectedSprintId}/projects`)
            .then(res => res.json())
            .then(data => {
                setProjects(data);
                if (data.length > 0 && !selectedProjectId) {
                    setSelectedProjectId(data[0].id);
                }
            });
    }, [selectedSprintId]);

    // Fetch Stories for the current board (for the dropdown)
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

    const handleAddStory = async () => {
        const targetSprintId = createSprintId || selectedSprintId;
        if (!newTitle || !targetSprintId || !selectedProjectId) return;
        try {
            const res = await fetch('/api/workbench/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId: targetSprintId,
                    projectId: selectedProjectId,
                    title: newTitle,
                    description: newDesc,
                    assignedTo: assignedTo,
                    priority: storyPriority,
                    planned_completion_date: storyPlannedDate?.toISOString().split('T')[0] || null
                })
            });
            if (res.ok) {
                setIsStoryDialogOpen(false);
                setNewTitle('');
                setNewDesc('');
                setAssignedTo(null);
                setStoryPriority('medium');
                setStoryPlannedDate(undefined);
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            console.error('Error adding story:', err);
        }
    };

    const handleReuseStory = async () => {
        if (selectedReuseStoryIds.length === 0 || !selectedSprintId || !selectedProjectId) return;
        try {
            // 批量添加关键节点到迭代
            const promises = selectedReuseStoryIds.map(storyId =>
                fetch('/api/workbench/story/reuse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sprintId: selectedSprintId,
                        projectId: selectedProjectId,
                        storyId: storyId,
                        assignedTo: assignedTo
                    })
                })
            );

            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.ok);

            if (allSuccess) {
                setIsStoryDialogOpen(false);
                setSelectedReuseStoryIds([]);
                setAssignedTo(null);
                setRefreshTrigger(prev => prev + 1);
            } else {
                alert('部分节点添加失败，请重试');
            }
        } catch (err) {
            console.error('Error reusing stories:', err);
            alert('添加节点失败，请重试');
        }
    };

    useEffect(() => {
        if (isStoryDialogOpen && activeStoryTab === 'reuse' && selectedProjectId && selectedSprintId) {
            fetch(`/api/workbench/stories/available?projectId=${selectedProjectId}&sprintId=${selectedSprintId}&search=${storyReuseSearch}`)
                .then(res => res.json())
                .then(data => setAvailableStories(data));
        }
    }, [isStoryDialogOpen, activeStoryTab, storyReuseSearch, selectedProjectId, selectedSprintId]);

    const handleAddTask = async () => {
        const targetSprintId = createSprintId || selectedSprintId;
        if (!newTitle || !targetSprintId || !selectedProjectId) return;
        try {
            const res = await fetch('/api/workbench/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId: targetSprintId,
                    projectId: selectedProjectId,
                    storyId: targetStoryId,
                    title: newTitle,
                    description: newDesc,
                    priority,
                    size,
                    assignedTo: assignedTo
                })
            });
            if (res.ok) {
                setIsTaskDialogOpen(false);
                setNewTitle('');
                setNewDesc('');
                setTargetStoryId(null);
                setPriority('中');
                setSize('Medium');
                setAssignedTo(null);
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            console.error('Error adding task:', err);
        }
    };

    const handleReuseTask = async () => {
        if (selectedReuseTaskIds.length === 0 || !selectedSprintId || !selectedProjectId) return;
        try {
            // 批量添加任务到迭代
            const promises = selectedReuseTaskIds.map(taskId =>
                fetch('/api/workbench/task/reuse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sprintId: selectedSprintId,
                        projectId: selectedProjectId,
                        storyId: targetStoryId,
                        taskId: taskId,
                        assignedTo: assignedTo
                    })
                })
            );

            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.ok);

            if (allSuccess) {
                setIsTaskDialogOpen(false);
                setSelectedReuseTaskIds([]);
                setTargetStoryId(null);
                setAssignedTo(null);
                setRefreshTrigger(prev => prev + 1);
            } else {
                alert('部分任务添加失败，请重试');
            }
        } catch (err) {
            console.error('Error reusing tasks:', err);
            alert('添加任务失败，请重试');
        }
    };

    useEffect(() => {
        if (isTaskDialogOpen && activeTaskTab === 'reuse' && selectedProjectId && selectedSprintId) {
            fetch(`/api/workbench/tasks/available?projectId=${selectedProjectId}&sprintId=${selectedSprintId}&storyId=${targetStoryId || '0'}&search=${taskReuseSearch}`)
                .then(res => res.json())
                .then(data => setAvailableTasks(data));
        }
    }, [isTaskDialogOpen, activeTaskTab, taskReuseSearch, selectedProjectId, selectedSprintId, targetStoryId]);

    // Fetch available projects for reuse
    useEffect(() => {
        if (isProjectDialogOpen && activeProjectTab === 'reuse' && selectedSprintId) {
            fetch(`/api/workbench/projects/available?sprintId=${selectedSprintId}&search=`)
                .then(res => res.json())
                .then(data => setAvailableProjects(data));
        }
    }, [isProjectDialogOpen, activeProjectTab, selectedSprintId]);

    const handleReuseProject = async () => {
        if (selectedReuseProjectIds.length === 0 || !selectedSprintId) return;
        try {
            // 批量添加项目到迭代
            const promises = selectedReuseProjectIds.map(projectId =>
                fetch('/api/workbench/sprint/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sprintId: selectedSprintId,
                        projectId: projectId,
                        priority: projectPriority,
                        notes: priorityNotes
                    })
                })
            );

            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res.ok);

            if (allSuccess) {
                setIsProjectDialogOpen(false);
                resetProjectForm();
                // Refresh project list
                fetch(`/api/workbench/sprint/${selectedSprintId}/projects`)
                    .then(r => r.json())
                    .then(data => {
                        setProjects(data);
                        // 选中第一个添加的项目
                        if (selectedReuseProjectIds.length > 0) {
                            setSelectedProjectId(selectedReuseProjectIds[0]);
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

    const handleSaveProject = async () => {
        if (!newTitle) return;
        try {
            const body = {
                sprintId: selectedSprintId,
                projectId: editingProjectId,
                name: newTitle,
                description: newDesc,
                department_id: selectedDeptId,
                project_type_id: selectedTypeId,
                owner_id: selectedOwnerId,
                priority: projectPriority,
                notes: priorityNotes
            };

            const url = isEditMode ? '/api/workbench/project/update' : '/api/projects';

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const newProjOrMsg = await res.json();
                setIsProjectDialogOpen(false);
                resetProjectForm();

                // Refresh project list
                fetch(`/api/workbench/sprint/${selectedSprintId}/projects`)
                    .then(r => r.json())
                    .then(data => {
                        setProjects(data);
                        if (!isEditMode && newProjOrMsg.id) {
                            setSelectedProjectId(newProjOrMsg.id);
                        }
                    });
            }
        } catch (err) {
            console.error('Error saving project:', err);
        }
    };

    const handleDeleteProjectFromSprint = async () => {
        if (!editingProjectId || !selectedSprintId) return;

        if (!confirm('确定要从当前迭代中删除该项目吗？这将删除该项目在本迭代的所有快照数据。')) {
            return;
        }

        try {
            const res = await fetch('/api/workbench/sprint/project/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId: selectedSprintId,
                    projectId: editingProjectId
                })
            });

            if (res.ok) {
                setIsProjectDialogOpen(false);
                resetProjectForm();
                // Refresh project list
                fetch(`/api/workbench/sprint/${selectedSprintId}/projects`)
                    .then(r => r.json())
                    .then(data => {
                        setProjects(data);
                        // If the deleted project was selected, clear selection
                        if (selectedProjectId === editingProjectId) {
                            setSelectedProjectId(null);
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

    const resetProjectForm = () => {
        setNewTitle('');
        setNewDesc('');
        setSelectedDeptId(null);
        setSelectedTypeId(null);
        setSelectedOwnerId(null);
        setPriorityNotes('');
        setProjectPriority('中');
        setIsEditMode(false);
        setEditingProjectId(null);
        setActiveProjectTab('create');
        setSelectedReuseProjectIds([]);
    };

    const openAddProjectDialog = () => {
        resetProjectForm();
        setIsProjectDialogOpen(true);
    };

    const openEditProjectDialog = (project: Project) => {
        setNewTitle(project.name);
        setNewDesc(project.description);
        setSelectedDeptId(project.department_id || null);
        setSelectedTypeId(project.project_type_id || null);
        setSelectedOwnerId(project.owner_id || null);
        setPriorityNotes(project.notes || '');
        setProjectPriority(normalizePriority(project.priority));
        setIsEditMode(true);
        setEditingProjectId(project.id);
        setIsProjectDialogOpen(true);
    };


    const openAddTaskDialog = (storyId: number | null = null) => {
        setTargetStoryId(storyId);
        setAssignedTo(null); // Reset assignee
        setIsTaskDialogOpen(true);
    };

    const openAddStoryDialog = () => {
        setAssignedTo(null); // Reset assignee
        setStoryPriority('medium'); // Reset priority to default
        setStoryPlannedDate(undefined); // Reset planned date
        setIsStoryDialogOpen(true);
    };

    const handleUpdateTask = async (updatedTask: any) => {
        try {
            const res = await fetch('/api/workbench/task/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTask)
            });
            if (res.ok) {
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            console.error('Error updating task:', err);
        }
    };

    const openEditTask = (task: Task) => {
        setSelectedTask(task);
        setIsDrawerOpen(true);
    };

    const handleUpdateStory = async (updatedStory: any) => {
        try {
            const res = await fetch('/api/workbench/story/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedStory)
            });
            if (res.ok) {
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (err) {
            console.error('Error updating story:', err);
        }
    };

    const openEditStory = (story: Story) => {
        if (story.id === 0) return; // Can't edit "Uncategorized"
        setSelectedStoryForEdit(story);
        setIsStoryDrawerOpen(true);
    };

    const project = projects.find(p => p.id === selectedProjectId);
    const sprint = sprints.find(s => s.id.toString() === selectedSprintId);

    // Generate avatar color based on user ID
    const getAvatarColor = (userId: number) => {
        const colors = [
            'bg-blue-500 text-white',
            'bg-green-500 text-white',
            'bg-purple-500 text-white',
            'bg-orange-500 text-white',
            'bg-pink-500 text-white',
            'bg-cyan-500 text-white',
            'bg-amber-500 text-white',
            'bg-indigo-500 text-white',
            'bg-rose-500 text-white',
            'bg-teal-500 text-white',
            'bg-violet-500 text-white',
            'bg-fuchsia-500 text-white',
        ];
        return colors[userId % colors.length];
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Workbench Header - Original Structure Preserved, Monday Styling Applied */}
            <header className="flex items-center justify-between px-6 py-4 border-b bg-background flex-shrink-0 z-10">
                <div className="flex items-center gap-6">
                    {/* Sprint Selector */}
                    <div className="flex items-center gap-4">
                        <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                            <SelectTrigger className="w-[180px] h-9 bg-secondary/30 border-secondary-foreground/10 text-sm font-medium focus:ring-primary/20">
                                <SelectValue placeholder="选择迭代..." />
                            </SelectTrigger>
                            <SelectContent className="shadow-xl border-border/60">
                                {/* Backlog Option */}
                                <SelectItem value="-1">
                                    <div className="flex items-center gap-2">
                                        <span>📋 Backlog</span>
                                    </div>
                                </SelectItem>
                                {sprints.filter(s => s.id !== -1).map(s => (
                                    <SelectItem key={s.id} value={s.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            <span>{s.name}</span>
                                            {s.status === 'active' && <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] h-4">ACTIVE</Badge>}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSprintManagerOpen(true)}
                            className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md"
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Member Filter */}
                    <div className="flex items-center pl-6 border-l gap-3">
                        <Button
                            variant={filterMemberId === null ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilterMemberId(null)}
                            className="h-8 px-3 text-xs font-medium rounded-md"
                        >
                            全部
                        </Button>
                        <TooltipProvider>
                            <div className="flex gap-2 items-center">
                                {members.map(m => (
                                    <Tooltip key={m.id}>
                                        <TooltipTrigger asChild>
                                            <Avatar
                                                onClick={() => setFilterMemberId(m.id === filterMemberId ? null : m.id)}
                                                className={cn(
                                                    "w-8 h-8 cursor-pointer transition-all duration-200",
                                                    m.id === filterMemberId
                                                        ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white scale-110 shadow-lg"
                                                        : "hover:scale-105 opacity-75 hover:opacity-100"
                                                )}
                                            >
                                                {m.avatar_url && !m.avatar_url.includes('pravatar.cc') && (
                                                    <AvatarImage src={m.avatar_url} />
                                                )}
                                                <AvatarFallback className={cn("text-[10px] font-semibold", getAvatarColor(m.id))}>
                                                    {m.display_name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{m.display_name}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </TooltipProvider>
                    </div>
                </div>

                {/* Right Actions - Add Buttons */}
                <div className="flex items-center gap-3">
                    {!isExternal && (
                        <>
                            <Button
                                onClick={openAddStoryDialog}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium h-9 px-4 rounded-md text-xs gap-1.5"
                            >
                                <Plus className="w-4 h-4" /> 添加关键节点计划
                            </Button>
                            <Button
                                onClick={() => openAddTaskDialog()}
                                size="sm"
                                variant="outline"
                                className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 h-9 px-4 rounded-md text-xs gap-1.5 font-medium"
                            >
                                <Plus className="w-4 h-4" /> 添加子任务
                            </Button>
                        </>
                    )}
                </div>
            </header>

            <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 flex flex-col min-h-0 flex-shrink-0 border-r bg-background z-10">
                    <div className="flex items-center justify-between px-4 py-4 border-b">
                        <h3 className="text-sm font-bold text-foreground">项目列表</h3>
                        {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={openAddProjectDialog} className="w-7 h-7 hover:bg-muted/50 text-muted-foreground hover:text-foreground rounded-md">
                                <Plus className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <ProjectSidebar
                            projects={projects}
                            selectedId={selectedProjectId}
                            onSelect={setSelectedProjectId}
                            onAddClick={openAddProjectDialog}
                            onEditClick={openEditProjectDialog}
                        />
                    </div>
                </aside>

                {/* Main Content - Kanban Board */}
                <main className="flex-1 min-h-0 bg-slate-50/50 flex flex-col relative overflow-hidden">
                    {/* Optional: Board Header Title if needed, otherwise just the board */}
                    {selectedProjectId && (
                        <div className="px-6 py-3 border-b bg-background/50 backdrop-blur-sm flex items-center justify-between">
                            <h2 className="text-lg font-bold text-foreground tracking-tight">
                                {project?.name}
                            </h2>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Layout className="w-4 h-4" />
                                <span className="text-xs font-medium">看板视图</span>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden relative">
                        {selectedSprintId && selectedProjectId ? (
                            <KanbanBoard
                                key={`${selectedSprintId}-${selectedProjectId}-${filterMemberId}-${refreshTrigger}`}
                                sprintId={selectedSprintId}
                                projectId={selectedProjectId}
                                filterMemberId={filterMemberId}
                                members={members}
                                onAddTask={openAddTaskDialog}
                                onEditTask={openEditTask}
                                onEditStory={openEditStory}
                                sprints={sprints}
                                onStoryMove={() => setRefreshTrigger(prev => prev + 1)}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                                <Layout className="w-12 h-12 opacity-10" />
                                <div className="text-sm font-medium">请选择一个项目</div>
                            </div>
                        )}
                    </div>
                </main>
            </div>


            {/* Add Story Dialog */}
            <Dialog open={isStoryDialogOpen} onOpenChange={setIsStoryDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">添加关键节点计划</DialogTitle>
                    </DialogHeader>

                    <nav className="flex gap-4 border-b mb-4">
                        <button
                            onClick={() => setActiveStoryTab('create')}
                            className={cn(
                                "pb-2 text-sm font-medium transition-all border-b-2",
                                activeStoryTab === 'create' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            新建节点
                        </button>
                        <button
                            onClick={() => setActiveStoryTab('reuse')}
                            className={cn(
                                "pb-2 text-sm font-medium transition-all border-b-2",
                                activeStoryTab === 'reuse' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            选用已有
                        </button>
                    </nav>

                    {activeStoryTab === 'create' ? (
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="title" className="text-sm font-medium">节点名称</Label>
                                <Input
                                    id="title"
                                    placeholder="例如：实现用户认证系统"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium">负责人</Label>
                                    <Select value={assignedTo?.toString() || '0'} onValueChange={(v) => setAssignedTo(v === '0' ? null : parseInt(v))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择负责人" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">未分配</SelectItem>
                                            {members.map(m => (
                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                    {m.display_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium">优先级</Label>
                                    <Select value={storyPriority} onValueChange={setStoryPriority}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="high">高</SelectItem>
                                            <SelectItem value="medium">中</SelectItem>
                                            <SelectItem value="low">低</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">所属迭代</Label>
                                <Select value={createSprintId || selectedSprintId} onValueChange={setCreateSprintId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择迭代" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="-1">Backlog</SelectItem>
                                        {sprints.filter(s => s.id !== -1).map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    计划完成日期
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !storyPlannedDate && "text-muted-foreground"
                                            )}
                                        >
                                            {storyPlannedDate ? format(storyPlannedDate, "PPP", { locale: zhCN }) : <span>选择计划完成日期</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={storyPlannedDate}
                                            onSelect={setStoryPlannedDate}
                                            initialFocus
                                            locale={zhCN}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="desc" className="text-sm font-medium">节点描述</Label>
                                <Textarea
                                    id="desc"
                                    placeholder="输入详细的说明..."
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">搜索已有节点</Label>
                                <Input
                                    placeholder="输入关键词搜索..."
                                    value={storyReuseSearch}
                                    onChange={(e) => setStoryReuseSearch(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">选择节点（可多选）</Label>
                                    {selectedReuseStoryIds.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            已选 {selectedReuseStoryIds.length} 项
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-[300px] overflow-y-auto space-y-2">
                                    {availableStories.map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => {
                                                setSelectedReuseStoryIds(prev =>
                                                    prev.includes(s.id)
                                                        ? prev.filter(id => id !== s.id)
                                                        : [...prev, s.id]
                                                );
                                            }}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded border transition-all cursor-pointer text-sm",
                                                selectedReuseStoryIds.includes(s.id)
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/30 hover:bg-muted"
                                            )}
                                        >
                                            <Checkbox
                                                checked={selectedReuseStoryIds.includes(s.id)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedReuseStoryIds(prev =>
                                                        checked
                                                            ? [...prev, s.id]
                                                            : prev.filter(id => id !== s.id)
                                                    );
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex-1">
                                                <div className="font-bold text-sm text-slate-900">{s.title}</div>
                                                {s.description && (
                                                    <div className="text-xs text-slate-400 mt-1 line-clamp-1">{s.description}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {availableStories.length === 0 && (
                                        <div className="text-center py-8 text-slate-300 text-xs font-bold uppercase tracking-widest italic">
                                            没有可复用的节点
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">负责人</Label>
                                <Select value={assignedTo?.toString() || '0'} onValueChange={(v) => setAssignedTo(v === '0' ? null : parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择负责人" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">未分配</SelectItem>
                                        {members.map(m => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsStoryDialogOpen(false)}>取消</Button>
                        {activeStoryTab === 'create' ? (
                            <Button onClick={handleAddStory}>创建节点</Button>
                        ) : (
                            <Button onClick={handleReuseStory} disabled={selectedReuseStoryIds.length === 0}>
                                选用节点 {selectedReuseStoryIds.length > 0 && `(${selectedReuseStoryIds.length})`}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sprint Manager Dialog */}
            <Dialog open={isSprintManagerOpen} onOpenChange={setIsSprintManagerOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">迭代管理</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {sprints.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-semibold text-muted-foreground text-sm">
                                        {s.name.replace(/\D/g, '')}
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground">{s.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge
                                                variant={s.status === 'active' ? 'default' : s.status === 'archived' ? 'secondary' : 'outline'}
                                                className="text-xs px-2 py-0.5"
                                            >
                                                {s.status === 'active' ? '进行中' : s.status === 'archived' ? '已归档' : '计划中'}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {s.start_date && s.end_date ? (
                                                    `${new Date(s.start_date).toLocaleDateString()} - ${new Date(s.end_date).toLocaleDateString()}`
                                                ) : (
                                                    '未设置日期'
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {isAdmin && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(`http://localhost:4004/api/reports/weekly?sprintId=${s.id}`, '_blank')}
                                            className="h-8 text-xs"
                                            title="导出周报"
                                        >
                                            <Layout className="w-3.5 h-3.5 mr-1.5" />
                                            导出
                                        </Button>
                                    )}
                                    {s.status === 'planning' && isAdmin && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleActivateSprint(s.id)}
                                            className="h-8 text-xs"
                                        >
                                            立即启动
                                        </Button>
                                    )}
                                    {s.status === 'active' && isAdmin && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleCloseSprint(s.id)}
                                            className="h-8 text-xs"
                                        >
                                            归档结算
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsSprintManagerOpen(false)}
                        >
                            关闭
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Task Dialog */}
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">添加任务</DialogTitle>
                    </DialogHeader>

                    <nav className="flex gap-4 border-b mb-4">
                        <button
                            onClick={() => setActiveTaskTab('create')}
                            className={cn(
                                "pb-2 text-sm font-medium transition-all border-b-2",
                                activeTaskTab === 'create' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            新建任务
                        </button>
                        <button
                            onClick={() => setActiveTaskTab('reuse')}
                            className={cn(
                                "pb-2 text-sm font-medium transition-all border-b-2",
                                activeTaskTab === 'reuse' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            选用已有
                        </button>
                    </nav>

                    {activeTaskTab === 'create' ? (
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="task-title" className="text-sm font-medium">任务标题</Label>
                                <Input
                                    id="task-title"
                                    placeholder="例如：设计登录表单"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">负责人</Label>
                                <Select value={assignedTo?.toString() || '0'} onValueChange={(v) => setAssignedTo(v === '0' ? null : parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择负责人" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">未分配</SelectItem>
                                        {members.map(m => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">关联关键节点</Label>
                                <Select value={targetStoryId?.toString() || '0'} onValueChange={(v) => setTargetStoryId(v === '0' ? null : parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择关联关键节点" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">无关联关键节点</SelectItem>
                                        {stories.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">所属迭代</Label>
                                <Select value={createSprintId || selectedSprintId} onValueChange={setCreateSprintId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择迭代" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="-1">Backlog</SelectItem>
                                        {sprints.filter(s => s.id !== -1).map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium">优先级</Label>
                                    <Select value={priority} onValueChange={setPriority}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="高">高</SelectItem>
                                            <SelectItem value="中">中</SelectItem>
                                            <SelectItem value="低">低</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium">工时</Label>
                                    <Select value={size} onValueChange={setSize}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Tiny">Tiny</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Huge">Huge</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="task-desc" className="text-sm font-medium">任务描述</Label>
                                <Textarea
                                    id="task-desc"
                                    placeholder="输入任务描述..."
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">搜索已有任务</Label>
                                <Input
                                    placeholder="输入关键词搜索..."
                                    value={taskReuseSearch}
                                    onChange={(e) => setTaskReuseSearch(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">关联关键节点</Label>
                                <Select value={targetStoryId?.toString() || '0'} onValueChange={(v) => setTargetStoryId(v === '0' ? null : parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择关联关键节点" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">查看所有任务</SelectItem>
                                        {stories.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">选择任务（可多选）</Label>
                                    {selectedReuseTaskIds.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            已选 {selectedReuseTaskIds.length} 项
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-[300px] overflow-y-auto space-y-2">
                                    {availableTasks.map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => {
                                                setSelectedReuseTaskIds(prev =>
                                                    prev.includes(t.id)
                                                        ? prev.filter(id => id !== t.id)
                                                        : [...prev, t.id]
                                                );
                                            }}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded border transition-all cursor-pointer text-sm",
                                                selectedReuseTaskIds.includes(t.id)
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/30 hover:bg-muted"
                                            )}
                                        >
                                            <Checkbox
                                                checked={selectedReuseTaskIds.includes(t.id)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedReuseTaskIds(prev =>
                                                        checked
                                                            ? [...prev, t.id]
                                                            : prev.filter(id => id !== t.id)
                                                    );
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">{t.title || '无标题任务'}</div>
                                                {t.description && (
                                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.description}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {availableTasks.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            没有可复用的任务
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">负责人</Label>
                                <Select value={assignedTo?.toString() || '0'} onValueChange={(v) => setAssignedTo(v === '0' ? null : parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择负责人" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">未分配</SelectItem>
                                        {members.map(m => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>取消</Button>
                        {activeTaskTab === 'create' ? (
                            <Button onClick={handleAddTask}>创建任务</Button>
                        ) : (
                            <Button onClick={handleReuseTask} disabled={selectedReuseTaskIds.length === 0}>
                                选用任务 {selectedReuseTaskIds.length > 0 && `(${selectedReuseTaskIds.length})`}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Project Dialog */}
            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">
                            {isEditMode ? '编辑项目' : '创建项目'}
                        </DialogTitle>
                    </DialogHeader>
                    <nav className="flex gap-4 border-b mb-4">
                        <button
                            onClick={() => setActiveProjectTab('create')}
                            className={cn(
                                "pb-2 text-sm font-medium transition-all border-b-2",
                                activeProjectTab === 'create' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            创建新项目
                        </button>
                        <button
                            onClick={() => setActiveProjectTab('reuse')}
                            className={cn(
                                "pb-2 text-sm font-medium transition-all border-b-2",
                                activeProjectTab === 'reuse' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            选用已有项目
                        </button>
                    </nav>

                    {activeProjectTab === 'create' ? (
                        <div className="space-y-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="project-name" className="text-sm font-medium">项目名称</Label>
                                <Input
                                    id="project-name"
                                    placeholder="例如：通用标检平台"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">所属部门</Label>
                                <Select value={selectedDeptId?.toString() || ''} onValueChange={(v) => setSelectedDeptId(parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择部门" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(d => (
                                            <SelectItem key={d.id} value={d.id.toString()}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">项目类型</Label>
                                <Select value={selectedTypeId?.toString() || ''} onValueChange={(v) => setSelectedTypeId(parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择类型" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectTypes.map(t => (
                                            <SelectItem key={t.id} value={t.id.toString()}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">项目负责人</Label>
                                <Select value={selectedOwnerId?.toString() || '0'} onValueChange={(v) => setSelectedOwnerId(v === '0' ? null : parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择负责人" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">未分配</SelectItem>
                                        {members.filter(m => m.role !== 'external').map(m => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium">迭代优先级</Label>
                                    <Select value={projectPriority} onValueChange={setProjectPriority}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择优先级" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="高">高</SelectItem>
                                            <SelectItem value="中">中</SelectItem>
                                            <SelectItem value="低">低</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium">迭代备注</Label>
                                    <Input
                                        value={priorityNotes}
                                        onChange={(e) => setPriorityNotes(e.target.value)}
                                        placeholder="例如：本迭代关口"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="project-desc" className="text-sm font-medium">项目描述</Label>
                                <Textarea
                                    id="project-desc"
                                    placeholder="输入项目描述..."
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">选择项目（可多选）</Label>
                                    {selectedReuseProjectIds.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            已选 {selectedReuseProjectIds.length} 项
                                        </span>
                                    )}
                                </div>
                                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                                    {availableProjects.length === 0 ? (
                                        <div className="p-4 text-sm text-muted-foreground text-center">
                                            没有可用的项目
                                        </div>
                                    ) : (
                                        <div className="space-y-1 p-2">
                                            {availableProjects.map(p => (
                                                <div
                                                    key={p.id}
                                                    className={cn(
                                                        "flex items-start gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50",
                                                        selectedReuseProjectIds.includes(p.id) && "bg-primary/10"
                                                    )}
                                                    onClick={() => {
                                                        setSelectedReuseProjectIds(prev =>
                                                            prev.includes(p.id)
                                                                ? prev.filter(id => id !== p.id)
                                                                : [...prev, p.id]
                                                        );
                                                    }}
                                                >
                                                    <Checkbox
                                                        checked={selectedReuseProjectIds.includes(p.id)}
                                                        onCheckedChange={(checked) => {
                                                            setSelectedReuseProjectIds(prev =>
                                                                checked
                                                                    ? [...prev, p.id]
                                                                    : prev.filter(id => id !== p.id)
                                                            );
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-sm">{p.name || p.software_name}</div>
                                                        {p.description && (
                                                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                                {p.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium">迭代优先级</Label>
                                    <Select value={projectPriority} onValueChange={setProjectPriority}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择优先级" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="高">高</SelectItem>
                                            <SelectItem value="中">中</SelectItem>
                                            <SelectItem value="低">低</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium">迭代备注</Label>
                                    <Input
                                        value={priorityNotes}
                                        onChange={(e) => setPriorityNotes(e.target.value)}
                                        placeholder="例如：本迭代关口"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        <div className="flex w-full items-center justify-between">
                            {/* Left side: Delete button (only when editing) */}
                            <div>
                                {isEditMode && activeProjectTab === 'create' && (
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteProjectFromSprint}
                                        type="button"
                                    >
                                        删除
                                    </Button>
                                )}
                            </div>
                            {/* Right side: Cancel and Save/Reuse buttons */}
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>取消</Button>
                                {activeProjectTab === 'create' ? (
                                    <Button onClick={handleSaveProject}>
                                        {isEditMode ? '保存修改' : '创建项目'}
                                    </Button>
                                ) : (
                                    <Button onClick={handleReuseProject} disabled={selectedReuseProjectIds.length === 0}>
                                        选用项目 {selectedReuseProjectIds.length > 0 && `(${selectedReuseProjectIds.length})`}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Task Details Drawer */}
            <TaskDetailsDrawer
                task={selectedTask}
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleUpdateTask}
                members={members}
                currentUser={currentUser}
                sprintId={selectedSprintId ? parseInt(selectedSprintId) : undefined}
                projectId={selectedProjectId || undefined}
                sprints={sprints}
            />

            {/* Story Details Drawer */}
            <StoryDetailsDrawer
                story={selectedStoryForEdit}
                open={isStoryDrawerOpen}
                onClose={() => setIsStoryDrawerOpen(false)}
                onSave={handleUpdateStory}
                members={members}
                currentUser={currentUser}
                sprintId={selectedSprintId ? parseInt(selectedSprintId) : undefined}
                projectId={selectedProjectId || undefined}
            />
        </div >
    );
}
