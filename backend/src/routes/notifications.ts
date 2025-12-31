import express, { Request, Response } from 'express';
import pool from '../db/connection';

const router = express.Router();

// Middleware to require authentication
const requireAuth = (req: Request, res: Response, next: any) => {
    if (!(req as any).session?.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    next();
};

/**
 * GET /api/notifications
 * Get all notifications for current user (paginated, ordered by time)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).session?.user?.id;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await pool.query(
            `SELECT
                n.id,
                n.type,
                n.related_task_id,
                n.related_comment_id,
                n.is_read,
                n.created_at,
                actor.id as actor_id,
                actor.display_name as actor_name,
                t.title as task_title,
                tc.content as comment_content,
                (
                    SELECT st.id FROM sprint_tasks st
                    WHERE st.task_id = n.related_task_id
                    ORDER BY st.id DESC
                    LIMIT 1
                ) as task_snapshot_id,
                (
                    SELECT st.sprint_id FROM sprint_tasks st
                    WHERE st.task_id = n.related_task_id
                    ORDER BY st.id DESC
                    LIMIT 1
                ) as sprint_id
             FROM notifications n
             LEFT JOIN users actor ON n.actor_id = actor.id
             LEFT JOIN tasks t ON n.related_task_id = t.id
             LEFT JOIN task_comments tc ON n.related_comment_id = tc.id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for current user
 */
router.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).session?.user?.id;

        const result = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ message: 'Failed to fetch unread count' });
    }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).session?.user?.id;

        // Verify notification belongs to user
        const checkResult = await pool.query(
            'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1',
            [id]
        );

        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for current user
 */
router.put('/mark-all-read', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).session?.user?.id;

        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
});

export default router;
