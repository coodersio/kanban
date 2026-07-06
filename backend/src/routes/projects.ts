import express from 'express';
import pool from '../db/connection';
import { requireAuth, requirePermission, Permission } from '../middleware/permissions';
import {
    appendGroupCondition,
    ensureProjectInScope,
    ensureSprintInScope,
    ensureSprintProjectInScope,
    ensureUserInScope,
    getEffectiveGroupId,
    parsePositiveInt
} from '../utils/groupScope';

const router = express.Router();

async function resolveProjectGroupId(req: express.Request, sprintId?: unknown, requestedGroupId?: unknown): Promise<number | null> {
    if (sprintId) {
        const result = await pool.query('SELECT group_id FROM sprints WHERE id = $1', [sprintId]);
        return result.rows[0]?.group_id ?? null;
    }
    const effectiveGroupId = getEffectiveGroupId(req, requestedGroupId);
    if (effectiveGroupId) return effectiveGroupId;

    const defaultGroup = await pool.query('SELECT id FROM groups ORDER BY id ASC LIMIT 1');
    return defaultGroup.rows[0]?.id ?? null;
}

router.get('/', requireAuth, requirePermission(Permission.VIEW_PROJECTS), async (req, res) => {
    try {
        const params: any[] = [];
        const groupId = getEffectiveGroupId(req, req.query.groupId);
        let query = `
            SELECT p.*, d.name as department_name, pt.name as project_type_name,
                   u.id as owner_id, u.display_name as owner_name,
                   g.name as group_name
            FROM projects p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN project_types pt ON p.project_type_id = pt.id
            LEFT JOIN users u ON p.owner_id = u.id
            LEFT JOIN groups g ON g.id = p.group_id
            WHERE 1 = 1
        `;

        query += appendGroupCondition(params, 'p.group_id', groupId);
        query += ' ORDER BY p.id ASC';

        const result = await pool.query(query, params);
        const projects = result.rows.map(row => ({
            ...row,
            name: row.software_name,
            source: row.source
        }));
        res.json(projects);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/', requireAuth, requirePermission(Permission.CREATE_PROJECT), async (req, res) => {
    const { name, description, department_id, project_type_id, owner_id, source, sprintId, priority, notes, group_id } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ message: 'Project name is required' });
    }

    const targetGroupId = await resolveProjectGroupId(req, sprintId, group_id);
    if (!targetGroupId) {
        return res.status(400).json({ message: 'Group is required' });
    }

    if (sprintId && !(await ensureSprintInScope(req, res, sprintId))) return;
    if (owner_id && owner_id !== '0' && !(await ensureUserInScope(req, res, owner_id))) return;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO projects
                (software_name, description, department_id, project_type_id, owner_id, source, group_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                name.trim(),
                description,
                department_id || null,
                project_type_id || null,
                (owner_id && owner_id !== '0') ? owner_id : null,
                source || null,
                targetGroupId
            ]
        );
        const row = result.rows[0];

        if (sprintId) {
            await client.query(
                'INSERT INTO sprint_projects (sprint_id, project_id, priority, notes) VALUES ($1, $2, $3, $4) ON CONFLICT (sprint_id, project_id) DO NOTHING',
                [sprintId, row.id, priority || '中', notes || '']
            );
        }

        await client.query('COMMIT');
        res.status(201).json({
            ...row,
            name: row.software_name,
            source: row.source
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating project:', err);
        res.status(500).json({ message: 'Internal server error', error: String(err) });
    } finally {
        client.release();
    }
});

router.put('/:id', requireAuth, requirePermission(Permission.EDIT_PROJECT), async (req, res) => {
    const { id } = req.params;
    const { name, description, department_id, project_type_id, owner_id, source, group_id } = req.body;
    if (!(await ensureProjectInScope(req, res, id))) return;
    if (owner_id && owner_id !== '0' && !(await ensureUserInScope(req, res, owner_id))) return;

    try {
        const targetGroupId = getEffectiveGroupId(req, group_id);
        const params: any[] = [
            name,
            description,
            department_id || null,
            project_type_id || null,
            (owner_id && owner_id !== '0') ? owner_id : null,
            source || null
        ];

        let setGroupSql = '';
        if (targetGroupId) {
            params.push(targetGroupId);
            setGroupSql = `, group_id = $${params.length}`;
        }

        params.push(id);
        const result = await pool.query(
            `UPDATE projects
             SET software_name = $1, description = $2, department_id = $3, project_type_id = $4,
                 owner_id = $5, source = $6${setGroupSql}, updated_at = NOW()
             WHERE id = $${params.length}
             RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const row = result.rows[0];
        res.json({
            ...row,
            name: row.software_name,
            source: row.source
        });
    } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/:id', requireAuth, requirePermission(Permission.DELETE_PROJECT), async (req, res) => {
    const { id } = req.params;
    if (!(await ensureProjectInScope(req, res, id))) return;

    try {
        await pool.query('DELETE FROM projects WHERE id = $1', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create a new story
router.post('/stories', requireAuth, requirePermission(Permission.CREATE_STORY), async (req, res) => {
    const { project_id, title, description } = req.body;

    if (!project_id || !title) {
        return res.status(400).json({ message: 'project_id and title are required' });
    }
    if (!(await ensureProjectInScope(req, res, project_id))) return;

    try {
        const result = await pool.query(
            'INSERT INTO stories (project_id, title, description) VALUES ($1, $2, $3) RETURNING *',
            [project_id, title.trim(), description?.trim() || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating story:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get stories for a specific project with statistics
router.get('/:id/stories', requireAuth, requirePermission(Permission.VIEW_STORIES), async (req, res) => {
    const { id } = req.params;
    if (!(await ensureProjectInScope(req, res, id))) return;

    try {
        const result = await pool.query(`
            SELECT
                s.id,
                s.title,
                s.description,
                s.project_id,
                COUNT(DISTINCT t.id) as task_count,
                COUNT(DISTINCT ss.sprint_id) as sprint_count,
                ARRAY_AGG(DISTINCT sp.sprint_number ORDER BY sp.sprint_number DESC) FILTER (WHERE sp.sprint_number IS NOT NULL) as sprints
            FROM stories s
            LEFT JOIN tasks t ON t.story_id = s.id
            LEFT JOIN sprint_stories ss ON ss.story_id = s.id
            LEFT JOIN sprints sp ON sp.id = ss.sprint_id
            WHERE s.project_id = $1
            GROUP BY s.id, s.title, s.description, s.project_id
            ORDER BY s.id DESC
        `, [id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching project stories:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get project delete impact analysis
router.get('/:id/delete-impact', requireAuth, requirePermission(Permission.DELETE_PROJECT), async (req, res) => {
    const { id } = req.params;
    if (!(await ensureProjectInScope(req, res, id))) return;

    try {
        const [storiesResult, tasksResult, sprintsResult] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM stories WHERE project_id = $1', [id]),
            pool.query('SELECT COUNT(*) as count FROM tasks WHERE project_id = $1', [id]),
            pool.query(`
                SELECT DISTINCT sp.sprint_number
                FROM sprint_projects spp
                JOIN sprints sp ON sp.id = spp.sprint_id
                WHERE spp.project_id = $1
                ORDER BY sp.sprint_number DESC
            `, [id])
        ]);

        res.json({
            story_count: parseInt(storiesResult.rows[0].count),
            task_count: parseInt(tasksResult.rows[0].count),
            sprint_count: sprintsResult.rows.length,
            sprints: sprintsResult.rows.map(r => r.sprint_number)
        });
    } catch (err) {
        console.error('Error fetching project delete impact:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Internal guard used by workbench when a caller only has sprint/project ids.
router.get('/:id/scope-check', requireAuth, async (req, res) => {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) return res.status(400).json({ message: 'Invalid project id' });
    if (req.query.sprintId && !(await ensureSprintProjectInScope(req, res, req.query.sprintId, projectId))) return;
    if (!req.query.sprintId && !(await ensureProjectInScope(req, res, projectId))) return;
    res.json({ ok: true });
});

export default router;
