import express, { Request, Response } from 'express';
import pool from '../db/connection';
import { requireAuth, UserRole } from '../middleware/permissions';

const router = express.Router();

interface RawParticipationRow {
    project_id: number;
    project_name: string;
    sprint_id: number;
    sprint_name: string;
    story_id: number;
    story_title: string;
    member_id: number;
    member_name: string;
    role: '负责人' | '参与人';
    status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
    completed_at: string | null;
}

function parseIdList(value: unknown): number[] {
    const values = Array.isArray(value) ? value : [value];

    return values
        .flatMap((item) => String(item ?? '').split(','))
        .map((item) => Number.parseInt(item.trim(), 10))
        .filter((item) => Number.isInteger(item) && item > 0);
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const currentUser = (req.session as any)?.user;
        const requestedSprintIds = parseIdList(req.query.sprintIds);
        const requestedMemberIds = parseIdList(req.query.memberIds);
        const effectiveMemberIds = currentUser?.role === UserRole.EXTERNAL
            ? [currentUser.id]
            : requestedMemberIds;

        const params: Array<number[]> = [];
        let storySprintFilter = '';
        let taskSprintFilter = '';
        let storyMemberFilter = '';
        let taskMemberFilter = '';

        if (requestedSprintIds.length > 0) {
            params.push(requestedSprintIds);
            const sprintParam = params.length;
            storySprintFilter = ` AND ss.sprint_id = ANY($${sprintParam}::int[])`;
            taskSprintFilter = ` AND st.sprint_id = ANY($${sprintParam}::int[])`;
        }

        if (effectiveMemberIds.length > 0) {
            params.push(effectiveMemberIds);
            const memberParam = params.length;
            storyMemberFilter = ` AND ss.assigned_to = ANY($${memberParam}::int[])`;
            taskMemberFilter = ` AND st.assigned_to = ANY($${memberParam}::int[])`;
        }

        const query = `
            WITH story_owners AS (
                SELECT
                    ss.sprint_id,
                    ss.project_id,
                    ss.story_id,
                    ss.assigned_to AS member_id,
                    2 AS role_priority
                FROM sprint_stories ss
                WHERE ss.sprint_id > 0
                    AND ss.assigned_to IS NOT NULL
                    ${storySprintFilter}
                    ${storyMemberFilter}
            ),
            task_participants AS (
                SELECT
                    st.sprint_id,
                    st.project_id,
                    COALESCE(st.story_id, t.story_id) AS story_id,
                    st.assigned_to AS member_id,
                    1 AS role_priority
                FROM sprint_tasks st
                JOIN tasks t ON t.id = st.task_id
                WHERE st.sprint_id > 0
                    AND st.assigned_to IS NOT NULL
                    AND COALESCE(st.story_id, t.story_id) IS NOT NULL
                    ${taskSprintFilter}
                    ${taskMemberFilter}
            ),
            combined AS (
                SELECT * FROM story_owners
                UNION ALL
                SELECT * FROM task_participants
            ),
            dedup AS (
                SELECT
                    sprint_id,
                    project_id,
                    story_id,
                    member_id,
                    CASE
                        WHEN BOOL_OR(role_priority = 2) THEN '负责人'
                        ELSE '参与人'
                    END AS role
                FROM combined
                GROUP BY sprint_id, project_id, story_id, member_id
            )
            SELECT
                d.project_id,
                p.software_name AS project_name,
                d.sprint_id,
                sp.sprint_number AS sprint_name,
                d.story_id,
                s.title AS story_title,
                d.member_id,
                u.display_name AS member_name,
                d.role,
                COALESCE(ss.status, 'not_started') AS status,
                ss.actual_completion_date AS completed_at
            FROM dedup d
            JOIN projects p ON p.id = d.project_id
            JOIN sprints sp ON sp.id = d.sprint_id
            JOIN stories s ON s.id = d.story_id
            JOIN users u ON u.id = d.member_id
            LEFT JOIN sprint_stories ss
                ON ss.sprint_id = d.sprint_id
                AND ss.story_id = d.story_id
            ORDER BY sp.start_date DESC, p.software_name ASC, s.id ASC, u.display_name ASC
        `;

        const result = await pool.query<RawParticipationRow>(query, params);
        const rows = result.rows.map((row) => ({
            projectId: row.project_id,
            projectName: row.project_name,
            sprintId: row.sprint_id,
            sprintName: row.sprint_name,
            storyId: row.story_id,
            storyTitle: row.story_title,
            memberId: row.member_id,
            memberName: row.member_name,
            role: row.role,
            status: row.status,
            completedAt: row.completed_at
        }));

        const projectCount = new Set(rows.map((row) => row.projectId)).size;
        const milestoneCount = new Set(rows.map((row) => `${row.sprintId}:${row.storyId}`)).size;
        const memberCount = new Set(rows.map((row) => row.memberId)).size;

        res.json({
            summary: {
                projectCount,
                milestoneCount,
                memberCount
            },
            rows
        });
    } catch (error) {
        console.error('Error fetching participation stats:', error);
        res.status(500).json({ message: 'Failed to fetch participation stats' });
    }
});

export default router;
