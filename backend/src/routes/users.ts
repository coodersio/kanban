import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/connection';
import { requireAuth, requirePermission, Permission, getSessionUser, isSystemAdmin, UserRole } from '../middleware/permissions';
import { appendGroupCondition, getCurrentGroupId, getEffectiveGroupId, parsePositiveInt } from '../utils/groupScope';

const router = express.Router();

const userSelect = `
    SELECT
        u.id,
        u.user_name,
        u.display_name,
        u.role,
        u.group_id,
        g.name AS group_name,
        u.created_at
    FROM users u
    LEFT JOIN groups g ON g.id = u.group_id
`;

async function getDefaultGroupId(): Promise<number | null> {
    const result = await pool.query('SELECT id FROM groups ORDER BY id ASC LIMIT 1');
    return result.rows[0]?.id ?? null;
}

function canAssignRole(currentUser: any, role: string): boolean {
    if (isSystemAdmin(currentUser)) {
        return Object.values(UserRole).includes(role as UserRole);
    }
    return role === UserRole.DEVELOPER || role === UserRole.EXTERNAL;
}

async function resolveTargetGroupId(req: express.Request, requestedGroupId: unknown): Promise<number | null> {
    const currentUser = getSessionUser(req);
    if (!isSystemAdmin(currentUser)) {
        return getCurrentGroupId(req);
    }
    return getEffectiveGroupId(req, requestedGroupId) ?? await getDefaultGroupId();
}

// List Users - authenticated users can view users in their own group; system admin can view all.
router.get('/', requireAuth, async (req, res) => {
    try {
        const params: any[] = [];
        const groupId = getEffectiveGroupId(req, req.query.groupId);
        let query = `${userSelect} WHERE 1 = 1`;
        query += appendGroupCondition(params, 'u.group_id', groupId);
        query += ' ORDER BY u.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create User
router.post('/', requirePermission(Permission.CREATE_USER), async (req, res) => {
    const { user_name, display_name, password, role, group_id } = req.body;
    const currentUser = getSessionUser(req);
    const targetRole = role || UserRole.DEVELOPER;

    if (!user_name?.trim() || !display_name?.trim() || !password) {
        return res.status(400).json({ message: 'Username, display name and password are required' });
    }

    if (!canAssignRole(currentUser, targetRole)) {
        return res.status(403).json({ message: 'Forbidden - Cannot assign this role' });
    }

    const targetGroupId = await resolveTargetGroupId(req, group_id);
    if (!targetGroupId && targetRole !== UserRole.ADMIN) {
        return res.status(400).json({ message: 'Group is required' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(`
            INSERT INTO users (user_name, display_name, password_hash, role, group_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_name, display_name, role, group_id, created_at
        `, [
            user_name.trim(),
            display_name.trim(),
            passwordHash,
            targetRole,
            targetGroupId
        ]);

        const created = await pool.query(`${userSelect} WHERE u.id = $1`, [result.rows[0].id]);
        res.status(201).json(created.rows[0]);
    } catch (err: any) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Username already exists' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Invalid group' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update User
router.put('/:id', requirePermission(Permission.EDIT_USER), async (req, res) => {
    const { id } = req.params;
    const { display_name, role, password, group_id } = req.body;
    const currentUser = getSessionUser(req);

    try {
        const existing = await pool.query('SELECT id, role, group_id FROM users WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existingUser = existing.rows[0];
        if (!isSystemAdmin(currentUser)) {
            if (existingUser.group_id !== getCurrentGroupId(req)) {
                return res.status(403).json({ message: 'Forbidden - User is outside your group' });
            }
            if (existingUser.role === UserRole.ADMIN || existingUser.role === UserRole.GROUP_ADMIN) {
                return res.status(403).json({ message: 'Forbidden - Cannot edit administrator users' });
            }
        }

        const targetRole = role || existingUser.role;
        if (!canAssignRole(currentUser, targetRole)) {
            return res.status(403).json({ message: 'Forbidden - Cannot assign this role' });
        }

        const targetGroupId = isSystemAdmin(currentUser)
            ? (parsePositiveInt(group_id) ?? existingUser.group_id)
            : existingUser.group_id;

        let query = 'UPDATE users SET display_name = $1, role = $2, group_id = $3';
        const params: any[] = [display_name?.trim() || '', targetRole, targetGroupId];
        let idx = 4;

        if (password) {
            const hash = await bcrypt.hash(password, 10);
            query += `, password_hash = $${idx}`;
            params.push(hash);
            idx++;
        }

        query += `, updated_at = NOW() WHERE id = $${idx} RETURNING id`;
        params.push(id);

        const result = await pool.query(query, params);
        const updated = await pool.query(`${userSelect} WHERE u.id = $1`, [result.rows[0].id]);
        res.json(updated.rows[0]);
    } catch (err: any) {
        console.error(err);
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Invalid group' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete User
router.delete('/:id', requirePermission(Permission.DELETE_USER), async (req, res) => {
    const { id } = req.params;
    const currentUser = getSessionUser(req);

    try {
        const existing = await pool.query('SELECT id, role, group_id FROM users WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existingUser = existing.rows[0];
        if (!isSystemAdmin(currentUser)) {
            if (existingUser.group_id !== getCurrentGroupId(req)) {
                return res.status(403).json({ message: 'Forbidden - User is outside your group' });
            }
            if (existingUser.role === UserRole.ADMIN || existingUser.role === UserRole.GROUP_ADMIN) {
                return res.status(403).json({ message: 'Forbidden - Cannot delete administrator users' });
            }
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
