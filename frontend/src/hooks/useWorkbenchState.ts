import { useState, useEffect, useRef } from 'react';
import type { Sprint, Project, Member, Department, ProjectType } from '@/types';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Custom hook to manage core workbench state: sprints, projects, members, departments, and project types
 */
export function useWorkbenchState(filterMemberId?: number | null) {
    const location = useLocation();
    const navigate = useNavigate();

    // Core Data State
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);

    // Selection State
    const searchParams = new URLSearchParams(location.search);
    const urlSprintId = searchParams.get('sprint');
    const [selectedSprintId, setSelectedSprintId] = useState<string>(urlSprintId || '');
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const selectedProjectIdRef = useRef<number | null>(null);

    // Refresh trigger for data refetch
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        selectedProjectIdRef.current = selectedProjectId;
    }, [selectedProjectId]);

    // Fetch sprints
    useEffect(() => {
        fetch('/api/sprints')
            .then(res => res.json())
            .then(data => {
                setSprints(data);

                // Priority 1: Use URL parameter if valid
                const searchParams = new URLSearchParams(location.search);
                const urlSprintId = searchParams.get('sprint');
                if (urlSprintId && data.some((s: Sprint) => s.id.toString() === urlSprintId)) {
                    setSelectedSprintId(urlSprintId);
                    return;
                }

                // Priority 2: Keep current selection if still valid
                if (selectedSprintId && data.some((s: Sprint) => s.id.toString() === selectedSprintId)) {
                    return;
                }

                // Priority 3: Default to active sprint
                const active = data.find((s: Sprint) => s.status === 'active');
                if (active) {
                    const newSprintId = active.id.toString();
                    setSelectedSprintId(newSprintId);
                    const newParams = new URLSearchParams();
                    newParams.set('sprint', newSprintId);
                    navigate(`/dashboard/workbench?${newParams.toString()}`, { replace: true });
                } else if (data.length > 0) {
                    // Priority 4: Pick first sprint if no active sprint
                    const newSprintId = data[0].id.toString();
                    setSelectedSprintId(newSprintId);
                    const newParams = new URLSearchParams();
                    newParams.set('sprint', newSprintId);
                    navigate(`/dashboard/workbench?${newParams.toString()}`, { replace: true });
                }
            })
            .catch(err => console.error('Error fetching sprints:', err));
    }, [refreshTrigger, location.search]);

    // Fetch members, departments, project types
    useEffect(() => {
        // Fetch Users (filter out external users)
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
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

    // Fetch projects when sprint changes
    useEffect(() => {
        if (!selectedSprintId) return;
        const memberParam = filterMemberId ? `?memberId=${filterMemberId}` : '';
        fetch(`/api/workbench/sprint/${selectedSprintId}/projects${memberParam}`)
            .then(res => res.json())
            .then(data => {
                setProjects(data);
                // Auto-select first project if no entity in URL
                const entityMatch = location.pathname.match(/\/(STORY|TASK|PROJECT)-(\d+)(-\d+)?$/);
                const entityType = entityMatch ? entityMatch[1] : null;
                const urlProjectId = entityType === 'PROJECT' && entityMatch?.[2]
                    ? Number(entityMatch[2])
                    : null;
                const currentSelectedProjectId = selectedProjectIdRef.current;
                const hasSelectedProject = currentSelectedProjectId
                    ? data.some((p: Project) => p.id === currentSelectedProjectId)
                    : false;
                const urlProjectInList = urlProjectId
                    ? data.some((p: Project) => p.id === urlProjectId)
                    : false;

                if (urlProjectInList && urlProjectId !== currentSelectedProjectId) {
                    setSelectedProjectId(urlProjectId);
                } else if (!hasSelectedProject && !urlProjectInList) {
                    setSelectedProjectId(null);
                }

                if (data.length > 0 && data[0].snapshot_id) {
                    const shouldAutoSelectFirst =
                        !hasSelectedProject
                        && (
                            !entityType
                            || (entityType === 'PROJECT' && !urlProjectInList)
                        );
                    if (shouldAutoSelectFirst) {
                        const params = new URLSearchParams();
                        params.set('sprint', selectedSprintId);
                        navigate(`/dashboard/workbench/PROJECT-${data[0].id}-${data[0].snapshot_id}?${params.toString()}`, { replace: true });
                    }
                }
            })
            .catch(err => console.error('Error fetching projects:', err));
    }, [selectedSprintId, filterMemberId, refreshTrigger, navigate, location.pathname]);

    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

    const handleSprintChange = (newSprintId: string) => {
        setSelectedSprintId(newSprintId);
        const newParams = new URLSearchParams();
        newParams.set('sprint', newSprintId);

        // Preserve entity in URL if it exists (STORY/TASK/PROJECT)
        const entityMatch = location.pathname.match(/\/(STORY|TASK|PROJECT)-(\d+)(-\d+)?$/);
        const newPath = entityMatch
            ? `/dashboard/workbench${entityMatch[0]}`
            : '/dashboard/workbench';

        navigate(`${newPath}?${newParams.toString()}`, { replace: true });
    };

    return {
        // State
        sprints,
        projects,
        members,
        departments,
        projectTypes,
        selectedSprintId,
        selectedProjectId,
        refreshTrigger,

        // Actions
        setSelectedSprintId,
        setSelectedProjectId,
        setProjects,
        triggerRefresh,
        handleSprintChange
    };
}
