import express from 'express';
import pool from '../db/connection';
import { requireAuth, requirePermission, Permission, getSessionUser, isSystemAdmin } from '../middleware/permissions';
import { appendGroupCondition, ensureSprintInScope, getCurrentGroupId, getEffectiveGroupId } from '../utils/groupScope';

const router = express.Router();

// Helper to map UI status to DB status
const toDbStatus = (status: string) => {
    switch (status) {
        case 'active': return 'current';
        case 'closed': return 'archived';
        default: return 'planned';
    }
};

// Helper to map DB status to UI status
const toUiStatus = (status: string) => {
    switch (status) {
        case 'current': return 'active';
        case 'archived': return 'closed';
        default: return 'planning';
    }
};

async function getDefaultGroupId(): Promise<number | null> {
    const result = await pool.query('SELECT id FROM groups ORDER BY id ASC LIMIT 1');
    return result.rows[0]?.id ?? null;
}

async function resolveSprintGroupId(req: express.Request, requestedGroupId: unknown, projectIds: unknown): Promise<number | null> {
    const ids = Array.isArray(projectIds)
        ? projectIds.map((id) => Number.parseInt(String(id), 10)).filter((id) => Number.isInteger(id) && id > 0)
        : [];

    if (!isSystemAdmin(getSessionUser(req))) {
        return getCurrentGroupId(req);
    }

    const requested = getEffectiveGroupId(req, requestedGroupId);
    if (requested) return requested;

    if (ids.length > 0) {
        const result = await pool.query(
            'SELECT DISTINCT group_id FROM projects WHERE id = ANY($1::int[])',
            [ids]
        );
        if (result.rows.length === 1) return result.rows[0].group_id;
    }

    return getDefaultGroupId();
}

function mapSprint(row: any) {
    return {
        ...row,
        name: row.sprint_number,
        status: toUiStatus(row.status)
    };
}

// List Sprints - authenticated users can view their own group; system admin can view all.
router.get('/', requireAuth, requirePermission(Permission.VIEW_SPRINTS), async (req, res) => {
    try {
        const params: any[] = [];
        const groupId = getEffectiveGroupId(req, req.query.groupId);
        let query = `
            SELECT s.*, g.name AS group_name
            FROM sprints s
            LEFT JOIN groups g ON g.id = s.group_id
            WHERE 1 = 1
        `;

        query += appendGroupCondition(params, 's.group_id', groupId);
        query += ' ORDER BY s.start_date DESC';

        const result = await pool.query(query, params);
        res.json(result.rows.map(mapSprint));
    } catch (err) {
        console.error('Error fetching sprints:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create Sprint
router.post('/', requirePermission(Permission.CREATE_SPRINT), async (req, res) => {
    const { name, start_date, end_date, projectIds, group_id } = req.body;
    const targetGroupId = await resolveSprintGroupId(req, group_id, projectIds);
    if (!targetGroupId) {
        return res.status(400).json({ message: 'Group is required' });
    }

    const normalizedProjectIds = Array.isArray(projectIds)
        ? projectIds.map((id) => Number.parseInt(String(id), 10)).filter((id) => Number.isInteger(id) && id > 0)
        : [];

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (normalizedProjectIds.length > 0) {
            const projectCheck = await client.query(`
                SELECT COUNT(*)::int AS total,
                       COUNT(*) FILTER (WHERE group_id = $2)::int AS same_group
                FROM projects
                WHERE id = ANY($1::int[])
            `, [normalizedProjectIds, targetGroupId]);

            const { total, same_group } = projectCheck.rows[0];
            if (total !== normalizedProjectIds.length || same_group !== normalizedProjectIds.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'All projects must belong to the sprint group' });
            }
        }

        const result = await client.query(
            `INSERT INTO sprints (sprint_number, start_date, end_date, status, group_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, start_date, end_date, 'planned', targetGroupId]
        );
        const sprint = result.rows[0];

        if (normalizedProjectIds.length > 0) {
            for (const projectId of normalizedProjectIds) {
                await client.query(
                    'INSERT INTO sprint_projects (sprint_id, project_id) VALUES ($1, $2) ON CONFLICT (sprint_id, project_id) DO NOTHING',
                    [sprint.id, projectId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json(mapSprint(sprint));
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error creating sprint:', err);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Sprint name already exists in this group' });
        }
        res.status(500).json({ message: 'Internal server error', error: String(err) });
    } finally {
        client.release();
    }
});

// Update Sprint
router.put('/:id', requirePermission(Permission.EDIT_SPRINT), async (req, res) => {
    const { id } = req.params;
    const { name, start_date, end_date, status, group_id } = req.body;
    if (!(await ensureSprintInScope(req, res, id))) return;

    try {
        const targetGroupId = getEffectiveGroupId(req, group_id);
        const params: any[] = [name, start_date, end_date, toDbStatus(status)];
        let setGroupSql = '';

        if (targetGroupId) {
            params.push(targetGroupId);
            setGroupSql = `, group_id = $${params.length}`;
        }

        params.push(id);
        const result = await pool.query(
            `UPDATE sprints
             SET sprint_number = $1, start_date = $2, end_date = $3, status = $4${setGroupSql}
             WHERE id = $${params.length}
             RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sprint not found' });
        }

        res.json(mapSprint(result.rows[0]));
    } catch (err: any) {
        console.error('Error updating sprint:', err);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Sprint name already exists in this group' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete Sprint
router.delete('/:id', requirePermission(Permission.DELETE_SPRINT), async (req, res) => {
    const { id } = req.params;
    if (!(await ensureSprintInScope(req, res, id))) return;

    try {
        await pool.query('DELETE FROM sprints WHERE id = $1', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Error deleting sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Activate Sprint
router.post('/:id/activate', requirePermission(Permission.ACTIVATE_SPRINT), async (req, res) => {
    const { id } = req.params;
    if (!(await ensureSprintInScope(req, res, id))) return;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const target = await client.query('SELECT group_id FROM sprints WHERE id = $1', [id]);
        const targetGroupId = target.rows[0]?.group_id;
        if (!targetGroupId) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Sprint not found' });
        }

        await client.query("UPDATE sprints SET status = 'archived' WHERE status = 'current' AND group_id = $1", [targetGroupId]);

        const result = await client.query(
            "UPDATE sprints SET status = 'current' WHERE id = $1 RETURNING *",
            [id]
        );

        await client.query('COMMIT');
        res.json(mapSprint(result.rows[0]));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error activating sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Close Sprint
router.post('/:id/close', requirePermission(Permission.ACTIVATE_SPRINT), async (req, res) => {
    const { id } = req.params;
    if (!(await ensureSprintInScope(req, res, id))) return;

    try {
        const result = await pool.query(
            "UPDATE sprints SET status = 'archived' WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sprint not found' });
        }
        res.json(mapSprint(result.rows[0]));
    } catch (err) {
        console.error('Error closing sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
