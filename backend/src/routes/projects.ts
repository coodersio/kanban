import express from 'express';
import pool from '../db/connection';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT p.*, d.name as department_name, pt.name as project_type_name,
             u.id as owner_id, u.display_name as owner_name
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN project_types pt ON p.project_type_id = pt.id
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.id ASC
    `);
        const projects = result.rows.map(row => ({
            ...row,
            name: row.software_name // Map DB software_name to UI name
        }));
        res.json(projects);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    const { name, description, department_id, project_type_id, owner_id, sprintId, priority, notes } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create project in projects table
        const result = await client.query(
            'INSERT INTO projects (software_name, description, department_id, project_type_id, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, department_id, project_type_id, (owner_id && owner_id !== '0') ? owner_id : null]
        );
        const row = result.rows[0];

        // 2. If sprintId is provided, add project to sprint_projects
        if (sprintId) {
            await client.query(
                'INSERT INTO sprint_projects (sprint_id, project_id, priority, notes) VALUES ($1, $2, $3, $4)',
                [sprintId, row.id, priority || '中', notes || '']
            );
        }

        await client.query('COMMIT');
        res.status(201).json({
            ...row,
            name: row.software_name
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating project:', err);
        res.status(500).json({ message: 'Internal server error', error: String(err) });
    } finally {
        client.release();
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, department_id, project_type_id, owner_id } = req.body;
    try {
        const result = await pool.query(
            'UPDATE projects SET software_name = $1, description = $2, department_id = $3, project_type_id = $4, owner_id = $5 WHERE id = $6 RETURNING *',
            [name, description, department_id, project_type_id, (owner_id && owner_id !== '0') ? owner_id : null, id]
        );
        const row = result.rows[0];
        res.json({
            ...row,
            name: row.software_name
        });
    } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM projects WHERE id = $1', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get stories for a specific project with statistics
router.get('/:id/stories', async (req, res) => {
    const { id } = req.params;
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
router.get('/:id/delete-impact', async (req, res) => {
    const { id } = req.params;
    try {
        const [storiesResult, tasksResult, sprintsResult] = await Promise.all([
            // Count stories
            pool.query('SELECT COUNT(*) as count FROM stories WHERE project_id = $1', [id]),
            // Count tasks
            pool.query('SELECT COUNT(*) as count FROM tasks WHERE project_id = $1', [id]),
            // Get affected sprints
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

export default router;
