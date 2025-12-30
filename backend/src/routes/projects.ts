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
    const { name, description, department_id, project_type_id, owner_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO projects (software_name, description, department_id, project_type_id, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, department_id, project_type_id, (owner_id && owner_id !== '0') ? owner_id : null]
        );
        const row = result.rows[0];
        res.status(201).json({
            ...row,
            name: row.software_name
        });
    } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ message: 'Internal server error', error: String(err) });
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

export default router;
