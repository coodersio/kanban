import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/connection';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(`
            SELECT u.*, g.name AS group_name
            FROM users u
            LEFT JOIN groups g ON g.id = u.group_id
            WHERE u.user_name = $1
        `, [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Set session
        (req.session as any).user = {
            id: user.id,
            username: user.user_name,
            displayName: user.display_name,
            role: user.role,
            groupId: user.group_id,
            groupName: user.group_name
        };

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.user_name,
                displayName: user.display_name,
                role: user.role,
                groupId: user.group_id,
                groupName: user.group_name
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/me', (req, res) => {
    if ((req.session as any).user) {
        res.json({ user: (req.session as any).user });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.json({ message: 'Logged out' });
    });
});

export default router;
