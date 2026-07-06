import express, { Request, Response } from 'express';
import pool from '../db/connection';
import { requireAuth } from '../middleware/permissions';
import { getEffectiveGroupId } from '../utils/groupScope';

const router = express.Router();

/**
 * GET /api/search?q={keyword}&limit={number}
 * Global search across projects, sprints, stories, and tasks
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const keyword = req.query.q as string;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!keyword || keyword.trim().length < 2) {
            return res.json({ results: [] });
        }

        const searchPattern = `%${keyword.trim()}%`;
        const groupId = getEffectiveGroupId(req, req.query.groupId);
        const params: any[] = [searchPattern, limit];
        const groupParam = groupId ? 3 : null;
        if (groupId) params.push(groupId);

        const result = await pool.query(
            `
            -- 项目搜索
            SELECT
                'project' as result_type,
                p.id,
                p.software_name as title,
                p.description,
                sp.snapshot_id,
                sp.sprint_id,
                s.sprint_number
            FROM projects p
            LEFT JOIN LATERAL (
                SELECT id as snapshot_id, sprint_id
                FROM sprint_projects
                WHERE project_id = p.id
                ORDER BY id DESC
                LIMIT 1
            ) sp ON true
            LEFT JOIN sprints s ON s.id = sp.sprint_id
            WHERE (p.software_name ILIKE $1
               OR p.description ILIKE $1)
              ${groupParam ? `AND p.group_id = $${groupParam}` : ''}

            UNION ALL

            -- 迭代搜索
            SELECT
                'sprint' as result_type,
                s.id,
                s.sprint_number as title,
                CONCAT('开始: ', s.start_date, ' - 结束: ', s.end_date) as description,
                NULL as snapshot_id,
                s.id as sprint_id,
                s.sprint_number
            FROM sprints s
            WHERE s.sprint_number ILIKE $1
              ${groupParam ? `AND s.group_id = $${groupParam}` : ''}

            UNION ALL

            -- Story 搜索
            SELECT
                'story' as result_type,
                st.id,
                st.title,
                st.description,
                ss.snapshot_id,
                ss.sprint_id,
                s.sprint_number
            FROM stories st
            JOIN projects p ON p.id = st.project_id
            LEFT JOIN LATERAL (
                SELECT id as snapshot_id, sprint_id
                FROM sprint_stories
                WHERE story_id = st.id
                ORDER BY id DESC
                LIMIT 1
            ) ss ON true
            LEFT JOIN sprints s ON s.id = ss.sprint_id
            WHERE (st.title ILIKE $1
               OR st.description ILIKE $1)
              ${groupParam ? `AND p.group_id = $${groupParam}` : ''}

            UNION ALL

            -- Task 搜索
            SELECT
                'task' as result_type,
                t.id,
                t.title,
                t.description,
                tk.snapshot_id,
                tk.sprint_id,
                s.sprint_number
            FROM tasks t
            JOIN projects p ON p.id = t.project_id
            LEFT JOIN LATERAL (
                SELECT id as snapshot_id, sprint_id
                FROM sprint_tasks
                WHERE task_id = t.id
                ORDER BY id DESC
                LIMIT 1
            ) tk ON true
            LEFT JOIN sprints s ON s.id = tk.sprint_id
            WHERE (t.title ILIKE $1
               OR t.description ILIKE $1)
              ${groupParam ? `AND p.group_id = $${groupParam}` : ''}

            ORDER BY result_type, id
            LIMIT $2
            `,
            params
        );

        res.json({ results: result.rows });
    } catch (err) {
        console.error('Error performing search:', err);
        res.status(500).json({ message: 'Failed to perform search' });
    }
});

export default router;
