import express from 'express';
import pool from '../db/connection';
import { requireAuth } from '../middleware/permissions';

const router = express.Router();

// Get Dashboard Statistics
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const user = (req.session as any).user;
        const userId = user?.id;
        const role = user?.role;

        // 1. Overview Statistics
        const overviewQuery = `
            SELECT
                (SELECT COUNT(DISTINCT id) FROM projects) as total_projects,
                (SELECT COUNT(DISTINCT id) FROM stories) as total_stories,
                (SELECT COUNT(DISTINCT id) FROM tasks) as total_tasks,
                (SELECT COUNT(DISTINCT id) FROM sprints WHERE status = 'current') as active_sprints,
                (SELECT COUNT(DISTINCT id) FROM sprint_stories WHERE status = 'completed') as completed_stories,
                (SELECT COUNT(DISTINCT id) FROM sprint_tasks WHERE status = 'completed') as completed_tasks
        `;
        const overviewResult = await pool.query(overviewQuery);
        const overview = overviewResult.rows[0];

        // Calculate completion rates
        const storyCompletionRate = overview.total_stories > 0
            ? Math.round((overview.completed_stories / overview.total_stories) * 100)
            : 0;
        const taskCompletionRate = overview.total_tasks > 0
            ? Math.round((overview.completed_tasks / overview.total_tasks) * 100)
            : 0;

        // 2. Task Distribution by Status (Current Sprint)
        const currentSprintQuery = `
            SELECT id FROM sprints WHERE status = 'current' LIMIT 1
        `;
        const currentSprintResult = await pool.query(currentSprintQuery);
        const currentSprintId = currentSprintResult.rows[0]?.id;

        let taskDistribution = { not_started: 0, in_progress: 0, completed: 0 };
        if (currentSprintId) {
            const distributionQuery = `
                SELECT
                    status,
                    COUNT(*) as count
                FROM sprint_tasks
                WHERE sprint_id = $1
                GROUP BY status
            `;
            const distributionResult = await pool.query(distributionQuery, [currentSprintId]);
            distributionResult.rows.forEach(row => {
                taskDistribution[row.status as keyof typeof taskDistribution] = parseInt(row.count);
            });
        }

        // 3. Weekly Progress (Last 4 weeks)
        const weeklyProgressQuery = `
            SELECT
                sp.sprint_number,
                sp.start_date,
                sp.end_date,
                COUNT(DISTINCT CASE WHEN ss.status = 'completed' THEN ss.story_id END) as completed_stories,
                COUNT(DISTINCT ss.story_id) as total_stories,
                COUNT(DISTINCT CASE WHEN st.status = 'completed' THEN st.task_id END) as completed_tasks,
                COUNT(DISTINCT st.task_id) as total_tasks
            FROM sprints sp
            LEFT JOIN sprint_stories ss ON sp.id = ss.sprint_id
            LEFT JOIN sprint_tasks st ON sp.id = st.sprint_id
            WHERE sp.id != -1
            GROUP BY sp.id, sp.sprint_number, sp.start_date, sp.end_date
            ORDER BY sp.start_date DESC
            LIMIT 4
        `;
        const weeklyProgressResult = await pool.query(weeklyProgressQuery);
        const weeklyProgress = weeklyProgressResult.rows.map(row => ({
            week: row.sprint_number,
            startDate: row.start_date,
            endDate: row.end_date,
            completedStories: parseInt(row.completed_stories || 0),
            totalStories: parseInt(row.total_stories || 0),
            completedTasks: parseInt(row.completed_tasks || 0),
            totalTasks: parseInt(row.total_tasks || 0),
            completionRate: row.total_tasks > 0
                ? Math.round((parseInt(row.completed_tasks || 0) / parseInt(row.total_tasks)) * 100)
                : 0
        })).reverse();

        // 4. My Tasks (for current user)
        let myTasks = {
            total: 0,
            not_started: 0,
            in_progress: 0,
            completed: 0
        };

        if (currentSprintId) {
            const myTasksQuery = `
                SELECT
                    status,
                    COUNT(*) as count
                FROM sprint_tasks
                WHERE sprint_id = $1 AND assigned_to = $2
                GROUP BY status
            `;
            const myTasksResult = await pool.query(myTasksQuery, [currentSprintId, userId]);
            myTasksResult.rows.forEach(row => {
                const count = parseInt(row.count);
                myTasks[row.status as keyof typeof myTasks] = count;
                myTasks.total += count;
            });
        }

        // 5. Recent Activity (Last 6 activities)
        const recentActivityQuery = `
            SELECT
                'task' as type,
                t.id,
                t.title,
                st.status,
                st.updated_at,
                u.display_name as updated_by,
                p.software_name as project_name,
                s.title as story_title
            FROM sprint_tasks st
            JOIN tasks t ON st.task_id = t.id
            LEFT JOIN users u ON st.assigned_to = u.id
            LEFT JOIN projects p ON st.project_id = p.id
            LEFT JOIN stories s ON st.story_id = s.id
            WHERE st.sprint_id = $1

            UNION ALL

            SELECT
                'story' as type,
                s.id,
                s.title,
                ss.status,
                ss.updated_at,
                u.display_name as updated_by,
                p.software_name as project_name,
                NULL as story_title
            FROM sprint_stories ss
            JOIN stories s ON ss.story_id = s.id
            LEFT JOIN users u ON ss.assigned_to = u.id
            LEFT JOIN projects p ON ss.project_id = p.id
            WHERE ss.sprint_id = $1

            ORDER BY updated_at DESC
            LIMIT 6
        `;

        const recentActivityResult = currentSprintId
            ? await pool.query(recentActivityQuery, [currentSprintId])
            : { rows: [] };

        const recentActivity = recentActivityResult.rows.map(row => ({
            type: row.type,
            id: row.id,
            title: row.title,
            status: row.status,
            updatedAt: row.updated_at,
            updatedBy: row.updated_by,
            projectName: row.project_name,
            storyTitle: row.story_title
        }));

        // 6. Team Performance (if admin/developer)
        let teamPerformance = null;
        if (role === 'admin' || role === 'developer') {
            const teamPerformanceQuery = `
                SELECT
                    u.id,
                    u.display_name,
                    COUNT(DISTINCT CASE WHEN st.status = 'completed' THEN st.task_id END) as completed_tasks,
                    COUNT(DISTINCT st.task_id) as total_tasks,
                    COALESCE(AVG(CASE WHEN st.status = 'completed' THEN st.progress END), 0) as avg_progress
                FROM users u
                LEFT JOIN sprint_tasks st ON u.id = st.assigned_to AND st.sprint_id = $1
                WHERE u.role IN ('admin', 'developer')
                GROUP BY u.id, u.display_name
                HAVING COUNT(DISTINCT st.task_id) > 0
                ORDER BY completed_tasks DESC
                LIMIT 5
            `;
            const teamPerformanceResult = currentSprintId
                ? await pool.query(teamPerformanceQuery, [currentSprintId])
                : { rows: [] };

            teamPerformance = teamPerformanceResult.rows.map(row => ({
                userId: row.id,
                userName: row.display_name,
                completedTasks: parseInt(row.completed_tasks || 0),
                totalTasks: parseInt(row.total_tasks || 0),
                completionRate: row.total_tasks > 0
                    ? Math.round((parseInt(row.completed_tasks || 0) / parseInt(row.total_tasks)) * 100)
                    : 0,
                avgProgress: Math.round(parseFloat(row.avg_progress || 0))
            }));
        }

        // 7. Project Status Summary
        const projectStatusQuery = `
            SELECT
                p.id,
                p.software_name as name,
                COUNT(DISTINCT ss.story_id) as total_stories,
                COUNT(DISTINCT CASE WHEN ss.status = 'completed' THEN ss.story_id END) as completed_stories,
                COUNT(DISTINCT st.task_id) as total_tasks,
                COUNT(DISTINCT CASE WHEN st.status = 'completed' THEN st.task_id END) as completed_tasks
            FROM projects p
            LEFT JOIN sprint_projects sp ON p.id = sp.project_id AND sp.sprint_id = $1
            LEFT JOIN sprint_stories ss ON p.id = ss.project_id AND ss.sprint_id = $1
            LEFT JOIN sprint_tasks st ON p.id = st.project_id AND st.sprint_id = $1
            WHERE sp.id IS NOT NULL
            GROUP BY p.id, p.software_name
            ORDER BY p.software_name
        `;
        const projectStatusResult = currentSprintId
            ? await pool.query(projectStatusQuery, [currentSprintId])
            : { rows: [] };

        const projectStatus = projectStatusResult.rows.map(row => ({
            projectId: row.id,
            projectName: row.name,
            totalStories: parseInt(row.total_stories || 0),
            completedStories: parseInt(row.completed_stories || 0),
            totalTasks: parseInt(row.total_tasks || 0),
            completedTasks: parseInt(row.completed_tasks || 0),
            completionRate: row.total_tasks > 0
                ? Math.round((parseInt(row.completed_tasks || 0) / parseInt(row.total_tasks)) * 100)
                : 0
        }));

        // Return all stats
        res.json({
            overview: {
                totalProjects: parseInt(overview.total_projects || 0),
                totalStories: parseInt(overview.total_stories || 0),
                totalTasks: parseInt(overview.total_tasks || 0),
                activeSprints: parseInt(overview.active_sprints || 0),
                storyCompletionRate,
                taskCompletionRate
            },
            taskDistribution,
            weeklyProgress,
            myTasks,
            recentActivity,
            teamPerformance,
            projectStatus,
            currentSprintId
        });

    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
