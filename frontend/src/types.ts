export interface Member {
    id: number;
    user_name: string;
    display_name: string;
    avatar_url?: string;
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
    id: number;
    title: string;
    status: 'not_started' | 'in_progress' | 'completed';
    story_id?: number;
    description?: string;
    priority?: string; // e.g. 'Must', 'Should'
    size?: string;     // e.g. 'Tiny', 'Medium', 'Huge'
    assigned_to_user?: Member;
    tags?: string[];
    due_date?: string;
}

export interface Story {
    id: number;
    title: string;
    status: string;
    task_count?: number;
    assigned_to_user?: Member;
}

export interface Sprint {
    id: number;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
}

export interface Project {
    id: number;
    name: string;
    description: string;
    department_id?: number;
    project_type_id?: number;
    priority?: number;
    notes?: string;
}

export interface BoardData {
    stories: Story[];
    tasks: Task[];
    members: Member[];
}
