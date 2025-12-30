import express from 'express';
import pool from '../db/connection';
import { requireAuth, requirePermission, Permission } from '../middleware/permissions';

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

// List Sprints - All authenticated users can view
router.get('/', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sprints ORDER BY start_date DESC');
        const sprints = result.rows.map(row => ({
            ...row,
            name: row.sprint_number, // Map DB sprint_number to UI name
            status: toUiStatus(row.status)
        }));
        res.json(sprints);
    } catch (err) {
        console.error('Error fetching sprints:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create Sprint - Admin only
router.post('/', requirePermission(Permission.CREATE_SPRINT), async (req, res) => {
    const { name, start_date, end_date, projectIds } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create the sprint
        const result = await client.query(
            'INSERT INTO sprints (sprint_number, start_date, end_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, start_date, end_date, 'planned']
        );
        const sprint = result.rows[0];

        // 2. If projectIds provided, insert sprint_projects associations
        if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
            for (const projectId of projectIds) {
                await client.query(
                    'INSERT INTO sprint_projects (sprint_id, project_id) VALUES ($1, $2)',
                    [sprint.id, projectId]
                );
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            ...sprint,
            name: sprint.sprint_number,
            status: toUiStatus(sprint.status)
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating sprint:', err);
        res.status(500).json({ message: 'Internal server error', error: String(err) });
    } finally {
        client.release();
    }
});

// Update Sprint - Admin only
router.put('/:id', requirePermission(Permission.EDIT_SPRINT), async (req, res) => {
    const { id } = req.params;
    const { name, start_date, end_date, status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE sprints SET sprint_number = $1, start_date = $2, end_date = $3, status = $4 WHERE id = $5 RETURNING *',
            [name, start_date, end_date, toDbStatus(status), id]
        );
        const row = result.rows[0];
        res.json({
            ...row,
            name: row.sprint_number,
            status: toUiStatus(row.status)
        });
    } catch (err) {
        console.error('Error updating sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete Sprint - Admin only
router.delete('/:id', requirePermission(Permission.DELETE_SPRINT), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM sprints WHERE id = $1', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Error deleting sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Activate Sprint - Admin only
router.post('/:id/activate', requirePermission(Permission.ACTIVATE_SPRINT), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Archive any current sprints
        await client.query("UPDATE sprints SET status = 'archived' WHERE status = 'current'");

        // 2. Activate target sprint
        const result = await client.query(
            "UPDATE sprints SET status = 'current' WHERE id = $1 RETURNING *",
            [id]
        );

        await client.query('COMMIT');

        const row = result.rows[0];
        res.json({
            ...row,
            name: row.sprint_number,
            status: toUiStatus(row.status)
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error activating sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Close Sprint - Admin only
router.post('/:id/close', requirePermission(Permission.ACTIVATE_SPRINT), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE sprints SET status = 'archived' WHERE id = $1 RETURNING *",
            [id]
        );
        const row = result.rows[0];
        res.json({
            ...row,
            name: row.sprint_number,
            status: toUiStatus(row.status)
        });
    } catch (err) {
        console.error('Error closing sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
