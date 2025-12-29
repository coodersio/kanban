import express from 'express';
import pool from '../db/connection';

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

router.get('/', async (req, res) => {
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

router.post('/', async (req, res) => {
    const { name, start_date, end_date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO sprints (sprint_number, start_date, end_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, start_date, end_date, 'planned']
        );
        const row = result.rows[0];
        res.status(201).json({
            ...row,
            name: row.sprint_number,
            status: toUiStatus(row.status)
        });
    } catch (err) {
        console.error('Error creating sprint:', err);
        res.status(500).json({ message: 'Internal server error', error: String(err) });
    }
});

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM sprints WHERE id = $1', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Error deleting sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/:id/activate', async (req, res) => {
    const { id } = req.params;
    try {
        // Set this sprint to current
        const result = await pool.query(
            "UPDATE sprints SET status = 'current' WHERE id = $1 RETURNING *",
            [id]
        );
        const row = result.rows[0];
        res.json({
            ...row,
            name: row.sprint_number,
            status: toUiStatus(row.status)
        });
    } catch (err) {
        console.error('Error activating sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
