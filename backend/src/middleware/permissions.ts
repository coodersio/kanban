import type { Request, Response, NextFunction } from 'express';

// User roles
export enum UserRole {
    ADMIN = 'admin',
    DEVELOPER = 'developer',
    EXTERNAL = 'external'
}

// Permission types
export enum Permission {
    // User management
    VIEW_USERS = 'view_users',
    CREATE_USER = 'create_user',
    EDIT_USER = 'edit_user',
    DELETE_USER = 'delete_user',
    CHANGE_USER_ROLE = 'change_user_role',

    // Project management
    VIEW_PROJECTS = 'view_projects',
    CREATE_PROJECT = 'create_project',
    EDIT_PROJECT = 'edit_project',
    EDIT_OWN_PROJECT = 'edit_own_project',
    DELETE_PROJECT = 'delete_project',

    // Story management
    VIEW_STORIES = 'view_stories',
    CREATE_STORY = 'create_story',
    EDIT_STORY = 'edit_story',
    EDIT_OWN_STORY = 'edit_own_story',
    DELETE_STORY = 'delete_story',
    ASSIGN_STORY = 'assign_story',

    // Task management
    VIEW_TASKS = 'view_tasks',
    CREATE_TASK = 'create_task',
    EDIT_TASK = 'edit_task',
    EDIT_ASSIGNED_TASK = 'edit_assigned_task',
    DELETE_TASK = 'delete_task',
    ASSIGN_TASK = 'assign_task',
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

// Role-Permission mapping
const rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
        // Admin has all permissions
        Permission.VIEW_USERS,
        Permission.CREATE_USER,
        Permission.EDIT_USER,
        Permission.DELETE_USER,
        Permission.CHANGE_USER_ROLE,

        Permission.VIEW_PROJECTS,
        Permission.CREATE_PROJECT,
        Permission.EDIT_PROJECT,
        Permission.DELETE_PROJECT,

        Permission.VIEW_STORIES,
        Permission.CREATE_STORY,
        Permission.EDIT_STORY,
        Permission.DELETE_STORY,
        Permission.ASSIGN_STORY,

        Permission.VIEW_TASKS,
        Permission.CREATE_TASK,
        Permission.EDIT_TASK,
        Permission.DELETE_TASK,
        Permission.ASSIGN_TASK,
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
        Permission.EDIT_OWN_PROJECT,
        Permission.DELETE_PROJECT,

        // Full story permissions
        Permission.VIEW_STORIES,
        Permission.CREATE_STORY,
        Permission.EDIT_STORY,
        Permission.EDIT_OWN_STORY,
        Permission.DELETE_STORY,
        Permission.ASSIGN_STORY,

        // Full task permissions
        Permission.VIEW_TASKS,
        Permission.CREATE_TASK,
        Permission.EDIT_TASK,
        Permission.EDIT_ASSIGNED_TASK,
        Permission.DELETE_TASK,
        Permission.ASSIGN_TASK,
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
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: string, permission: Permission): boolean {
    const role = userRole as UserRole;
    const permissions = rolePermissions[role] || [];
    return permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userRole: string, permissions: Permission[]): boolean {
    return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userRole: string, permissions: Permission[]): boolean {
    return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Middleware: Require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = (req.session as any)?.user;
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized - Please login' });
    }
    next();
}

/**
 * Middleware: Require specific permission
 */
export function requirePermission(...permissions: Permission[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req.session as any)?.user;

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized - Please login' });
        }

        const userRole = user.role as UserRole;
        const hasRequiredPermission = permissions.some(permission =>
            hasPermission(userRole, permission)
        );

        if (!hasRequiredPermission) {
            return res.status(403).json({
                message: 'Forbidden - You do not have permission to perform this action',
                required: permissions,
                role: userRole
            });
        }

        next();
    };
}

/**
 * Middleware: Require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = (req.session as any)?.user;

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized - Please login' });
    }

    if (user.role !== UserRole.ADMIN) {
        return res.status(403).json({
            message: 'Forbidden - Admin access required',
            role: user.role
        });
    }

    next();
}

/**
 * Middleware: Block external users
 */
export function blockExternal(req: Request, res: Response, next: NextFunction) {
    const user = (req.session as any)?.user;

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized - Please login' });
    }

    if (user.role === UserRole.EXTERNAL) {
        return res.status(403).json({
            message: 'Forbidden - External users cannot perform this action'
        });
    }

    next();
}

/**
 * Helper: Check if user owns a resource
 */
export function isResourceOwner(userId: number, resourceOwnerId: number | null): boolean {
    return resourceOwnerId === userId;
}

/**
 * Helper: Check if user is assigned to a resource
 */
export function isAssignedTo(userId: number, assignedToId: number | null): boolean {
    return assignedToId === userId;
}
