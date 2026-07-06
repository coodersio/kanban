import type { Request, Response } from 'express';
import pool from '../db/connection';
import { getSessionUser, isSystemAdmin } from '../middleware/permissions';

export function parsePositiveInt(value: unknown): number | null {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number.parseInt(String(raw ?? ''), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getCurrentGroupId(req: Request): number | null {
    return parsePositiveInt(getSessionUser(req)?.groupId);
}

export function getEffectiveGroupId(req: Request, requestedGroupId?: unknown): number | null {
    const user = getSessionUser(req);
    if (isSystemAdmin(user)) {
        return parsePositiveInt(requestedGroupId);
    }
    return getCurrentGroupId(req);
}

export function appendGroupCondition(
    params: any[],
    columnName: string,
    groupId: number | null,
    prefix = 'AND'
): string {
    if (!groupId) return '';
    params.push(groupId);
    return ` ${prefix} ${columnName} = $${params.length}`;
}

export function forbidMissingGroup(req: Request, res: Response): boolean {
    if (!isSystemAdmin(getSessionUser(req)) && !getCurrentGroupId(req)) {
        res.status(403).json({ message: 'Forbidden - User group is required' });
        return true;
    }
    return false;
}

export async function ensureProjectInScope(req: Request, res: Response, projectId: unknown): Promise<boolean> {
    const id = parsePositiveInt(projectId);
    if (!id) {
        res.status(400).json({ message: 'Invalid project id' });
        return false;
    }

    const result = await pool.query('SELECT group_id FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        res.status(404).json({ message: 'Project not found' });
        return false;
    }

    if (!isSystemAdmin(getSessionUser(req)) && result.rows[0].group_id !== getCurrentGroupId(req)) {
        res.status(403).json({ message: 'Forbidden - Project is outside your group' });
        return false;
    }

    return true;
}

export async function ensureSprintInScope(req: Request, res: Response, sprintId: unknown): Promise<boolean> {
    const id = Number.parseInt(String(sprintId ?? ''), 10);
    if (!Number.isInteger(id)) {
        res.status(400).json({ message: 'Invalid sprint id' });
        return false;
    }

    const result = await pool.query('SELECT group_id FROM sprints WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        res.status(404).json({ message: 'Sprint not found' });
        return false;
    }

    if (!isSystemAdmin(getSessionUser(req)) && result.rows[0].group_id !== getCurrentGroupId(req)) {
        res.status(403).json({ message: 'Forbidden - Sprint is outside your group' });
        return false;
    }

    return true;
}

export async function ensureSprintProjectInScope(
    req: Request,
    res: Response,
    sprintId: unknown,
    projectId: unknown
): Promise<boolean> {
    const sprint = Number.parseInt(String(sprintId ?? ''), 10);
    const project = parsePositiveInt(projectId);

    if (!Number.isInteger(sprint) || !project) {
        res.status(400).json({ message: 'Invalid sprint or project id' });
        return false;
    }

    const result = await pool.query(`
        SELECT s.group_id AS sprint_group_id, p.group_id AS project_group_id
        FROM sprints s
        CROSS JOIN projects p
        WHERE s.id = $1 AND p.id = $2
    `, [sprint, project]);

    if (result.rows.length === 0) {
        res.status(404).json({ message: 'Sprint or project not found' });
        return false;
    }

    const row = result.rows[0];
    if (row.sprint_group_id !== row.project_group_id) {
        res.status(400).json({ message: 'Sprint and project must belong to the same group' });
        return false;
    }

    if (!isSystemAdmin(getSessionUser(req)) && row.sprint_group_id !== getCurrentGroupId(req)) {
        res.status(403).json({ message: 'Forbidden - Resource is outside your group' });
        return false;
    }

    return true;
}

export async function ensureUserInScope(req: Request, res: Response, userId: unknown): Promise<boolean> {
    const id = parsePositiveInt(userId);
    if (!id) return true;

    const result = await pool.query('SELECT group_id FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        res.status(404).json({ message: 'User not found' });
        return false;
    }

    if (!isSystemAdmin(getSessionUser(req)) && result.rows[0].group_id !== getCurrentGroupId(req)) {
        res.status(403).json({ message: 'Forbidden - User is outside your group' });
        return false;
    }

    return true;
}

export async function ensureStoryInScope(req: Request, res: Response, storyId: unknown): Promise<boolean> {
    const id = parsePositiveInt(storyId);
    if (!id) {
        res.status(400).json({ message: 'Invalid story id' });
        return false;
    }

    const result = await pool.query(`
        SELECT p.group_id
        FROM stories s
        JOIN projects p ON p.id = s.project_id
        WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
        res.status(404).json({ message: 'Story not found' });
        return false;
    }

    if (!isSystemAdmin(getSessionUser(req)) && result.rows[0].group_id !== getCurrentGroupId(req)) {
        res.status(403).json({ message: 'Forbidden - Story is outside your group' });
        return false;
    }

    return true;
}

export async function ensureTaskInScope(req: Request, res: Response, taskId: unknown): Promise<boolean> {
    const id = parsePositiveInt(taskId);
    if (!id) {
        res.status(400).json({ message: 'Invalid task id' });
        return false;
    }

    const result = await pool.query(`
        SELECT p.group_id
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
        res.status(404).json({ message: 'Task not found' });
        return false;
    }

    if (!isSystemAdmin(getSessionUser(req)) && result.rows[0].group_id !== getCurrentGroupId(req)) {
        res.status(403).json({ message: 'Forbidden - Task is outside your group' });
        return false;
    }

    return true;
}
