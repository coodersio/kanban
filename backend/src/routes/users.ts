import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/connection';

const router = express.Router();

// List Users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, user_name, display_name, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create User
router.post('/', async (req, res) => {
    const { user_name, display_name, password, role } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (user_name, display_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, user_name, display_name, role',
            [user_name, display_name, passwordHash, role || 'developer']
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            return res.status(409).json({ message: 'Username already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update User (Simplified, usually separate password update)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { display_name, role, password } = req.body;

    try {
        let query = 'UPDATE users SET display_name = $1, role = $2';
        let params = [display_name, role];
        let idx = 3;

        if (password) {
            const hash = await bcrypt.hash(password, 10);
            query += `, password_hash = $${idx}`;
            params.push(hash);
            idx++;
        }

        query += ` WHERE id = $${idx} RETURNING id, user_name, display_name, role`;
        params.push(id);

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete User
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
