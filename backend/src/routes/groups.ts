import express from 'express';
import pool from '../db/connection';
import { getSessionUser, isSystemAdmin, requireAdmin, requireAuth } from '../middleware/permissions';
import { getCurrentGroupId } from '../utils/groupScope';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const user = getSessionUser(req);
        const params: any[] = [];
        let where = '';

        if (!isSystemAdmin(user)) {
            const groupId = getCurrentGroupId(req);
            if (!groupId) {
                return res.status(403).json({ message: 'Forbidden - User group is required' });
            }
            params.push(groupId);
            where = 'WHERE g.id = $1';
        }

        const result = await pool.query(`
            SELECT
                g.id,
                g.name,
                g.created_at,
                g.updated_at,
                COUNT(DISTINCT u.id)::int AS user_count,
                COUNT(DISTINCT p.id)::int AS project_count,
                COUNT(DISTINCT s.id)::int AS sprint_count,
                COALESCE(
                    string_agg(DISTINCT u.display_name, '、') FILTER (WHERE u.role = 'group_admin'),
                    ''
                ) AS group_admin_names
            FROM groups
            g
            LEFT JOIN users u ON u.group_id = g.id
            LEFT JOIN projects p ON p.group_id = g.id
            LEFT JOIN sprints s ON s.group_id = g.id
            ${where}
            GROUP BY g.id, g.name, g.created_at, g.updated_at
            ORDER BY g.id ASC
        `, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching groups:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/', requireAdmin, async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO groups (name) VALUES ($1) RETURNING id, name, created_at, updated_at',
            [name.trim()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error('Error creating group:', err);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Group name already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    try {
        const result = await pool.query(
            'UPDATE groups SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, created_at, updated_at',
            [name.trim(), id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Group not found' });
        }
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Error updating group:', err);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Group name already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const usage = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM users WHERE group_id = $1) AS users,
                (SELECT COUNT(*) FROM projects WHERE group_id = $1) AS projects,
                (SELECT COUNT(*) FROM sprints WHERE group_id = $1) AS sprints
        `, [id]);

        const counts = usage.rows[0];
        if (Number(counts.users) > 0 || Number(counts.projects) > 0 || Number(counts.sprints) > 0) {
            return res.status(409).json({
                message: 'Group is still in use',
                usage: counts
            });
        }

        const result = await pool.query('DELETE FROM groups WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Group not found' });
        }
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Error deleting group:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
