import { useState, useEffect } from 'react';

// User roles
export enum UserRole {
    ADMIN = 'admin',
    DEVELOPER = 'developer',
    EXTERNAL = 'external'
}

// Permission types (matching backend)
export enum Permission {
    // User management
    VIEW_USERS = 'view_users',
    CREATE_USER = 'create_user',
    EDIT_USER = 'edit_user',
    DELETE_USER = 'delete_user',

    // Project management
    VIEW_PROJECTS = 'view_projects',
    CREATE_PROJECT = 'create_project',
    EDIT_PROJECT = 'edit_project',
    DELETE_PROJECT = 'delete_project',

    // Story management
    VIEW_STORIES = 'view_stories',
    CREATE_STORY = 'create_story',
    EDIT_STORY = 'edit_story',
    DELETE_STORY = 'delete_story',

    // Task management
    VIEW_TASKS = 'view_tasks',
    CREATE_TASK = 'create_task',
    EDIT_TASK = 'edit_task',
    DELETE_TASK = 'delete_task',
    UPDATE_TASK_STATUS = 'update_task_status',

    // Sprint management
    VIEW_SPRINTS = 'view_sprints',
    CREATE_SPRINT = 'create_sprint',
    EDIT_SPRINT = 'edit_sprint',
    DELETE_SPRINT = 'delete_sprint',
    ACTIVATE_SPRINT = 'activate_sprint',

    // Report management
    EXPORT_SUMMARY_REPORT = 'export_summary_report',
    EXPORT_PERSONAL_REPORT = 'export_personal_report',

    // Settings
    VIEW_SETTINGS = 'view_settings',
    EDIT_SETTINGS = 'edit_settings'
}

// Role-Permission mapping (same as backend)
const rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
        Permission.VIEW_USERS,
        Permission.CREATE_USER,
        Permission.EDIT_USER,
        Permission.DELETE_USER,
        Permission.VIEW_PROJECTS,
        Permission.CREATE_PROJECT,
        Permission.EDIT_PROJECT,
        Permission.DELETE_PROJECT,
        Permission.VIEW_STORIES,
        Permission.CREATE_STORY,
        Permission.EDIT_STORY,
        Permission.DELETE_STORY,
        Permission.VIEW_TASKS,
        Permission.CREATE_TASK,
        Permission.EDIT_TASK,
        Permission.DELETE_TASK,
        Permission.UPDATE_TASK_STATUS,
        Permission.VIEW_SPRINTS,
        Permission.CREATE_SPRINT,
        Permission.EDIT_SPRINT,
        Permission.DELETE_SPRINT,
        Permission.ACTIVATE_SPRINT,
        Permission.EXPORT_SUMMARY_REPORT,
        Permission.EXPORT_PERSONAL_REPORT,
        Permission.VIEW_SETTINGS,
        Permission.EDIT_SETTINGS
    ],

    [UserRole.DEVELOPER]: [
        Permission.VIEW_USERS,
        // Full project permissions
        Permission.VIEW_PROJECTS,
        Permission.CREATE_PROJECT,
        Permission.EDIT_PROJECT,
        Permission.DELETE_PROJECT,
        // Full story permissions
        Permission.VIEW_STORIES,
        Permission.CREATE_STORY,
        Permission.EDIT_STORY,
        Permission.DELETE_STORY,
        // Full task permissions
        Permission.VIEW_TASKS,
        Permission.CREATE_TASK,
        Permission.EDIT_TASK,
        Permission.DELETE_TASK,
        Permission.UPDATE_TASK_STATUS,
        Permission.VIEW_SPRINTS,
        Permission.EXPORT_PERSONAL_REPORT,
        Permission.VIEW_SETTINGS
    ],

    [UserRole.EXTERNAL]: [
        Permission.VIEW_USERS,
        Permission.VIEW_PROJECTS,
        Permission.VIEW_STORIES,
        Permission.VIEW_TASKS,
        Permission.VIEW_SPRINTS
    ]
};

/**
 * Hook to get current user info
 */
export function useCurrentUser() {
    const [user, setUser] = useState<{ id: number; displayName: string; role: UserRole } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Unauthorized');
            })
            .then(data => {
                setUser({
                    id: data.user.id,
                    displayName: data.user.displayName,
                    role: data.user.role as UserRole
                });
                setLoading(false);
            })
            .catch(() => {
                setUser(null);
                setLoading(false);
            });
    }, []);

    return { user, loading };
}

/**
 * Hook to check permissions
 */
export function usePermissions() {
    const { user, loading } = useCurrentUser();

    const hasPermission = (permission: Permission): boolean => {
        if (!user) return false;
        const permissions = rolePermissions[user.role] || [];
        return permissions.includes(permission);
    };

    const hasAnyPermission = (permissions: Permission[]): boolean => {
        return permissions.some(permission => hasPermission(permission));
    };

    const hasAllPermissions = (permissions: Permission[]): boolean => {
        return permissions.every(permission => hasPermission(permission));
    };

    const isAdmin = (): boolean => {
        return user?.role === UserRole.ADMIN;
    };

    const isDeveloper = (): boolean => {
        return user?.role === UserRole.DEVELOPER;
    };

    const isExternal = (): boolean => {
        return user?.role === UserRole.EXTERNAL;
    };

    const canEdit = (): boolean => {
        return user?.role !== UserRole.EXTERNAL;
    };

    return {
        user,
        loading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
        isDeveloper,
        isExternal,
        canEdit
    };
}

/**
 * Utility: Get role display name in Chinese
 */
export function getRoleDisplayName(role: UserRole | string): string {
    switch (role) {
        case UserRole.ADMIN:
            return '管理员';
        case UserRole.DEVELOPER:
            return '开发者';
        case UserRole.EXTERNAL:
            return '外部人员';
        default:
            return '未知';
    }
}
