export interface Member {
    id: number;
    user_name: string;
    display_name: string;
    avatar_url?: string;
    role?: string;
}

export interface Department {
    id: number;
    name: string;
}

export interface ProjectType {
    id: number;
    name: string;
    description?: string;
}

export interface Task {
    id: number;                   // tasks.id (引用表ID)
    snapshot_id?: number;         // sprint_tasks.id (快照表ID)
    sprint_id?: number;           // 所属迭代ID
    title: string;
    status: 'not_started' | 'in_progress' | 'completed';
    story_id?: number;
    description?: string;
    priority?: string; // e.g. 'Must', 'Should'
    size?: string;     // e.g. 'Tiny', 'Medium', 'Huge'
    assigned_to_user?: Member;
    tags?: string[];
    planned_completion_date?: string; // 计划完成日期 (与sprint_stories表命名一致)
    progress?: number;
    risk_and_countermeasure?: string;
    estimated_hours?: number; // NEW: 预估工时（小时）
    created_by?: number;
}

export interface Story {
    id: number;                       // stories.id (引用表ID)
    snapshot_id?: number;             // sprint_stories.id (快照表ID)
    sprint_id?: number;               // 所属迭代ID
    title: string;
    description?: string;
    status: string;
    progress?: number;
    task_count?: number;
    assigned_to_user?: Member;
    created_by?: number;
    planned_completion_date?: string; // NEW: 计划完成日期 (YYYY-MM-DD)
    actual_completion_date?: string;  // NEW: 实际完成日期 (ISO 8601)
    risk_and_countermeasure?: string; // NEW: 风险及应对措施
    estimated_hours?: number;         // NEW: 预估工时（小时）
    priority?: string;                // NEW: 优先级
}

export interface Sprint {
    id: number;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
}

export interface Project {
    id: number;                       // projects.id (引用表ID)
    snapshot_id?: number;             // sprint_projects.id (快照表ID)
    sprint_id?: number;               // 所属迭代ID
    name: string;
    description: string;
    department_id?: number;
    project_type_id?: number;
    priority?: string | number;
    notes?: string;
    owner_id?: number;
    owner_name?: string;
    software_name?: string; // Backend compatibility
}

export interface BoardData {
    stories: Story[];
    tasks: Task[];
    members: Member[];
}
