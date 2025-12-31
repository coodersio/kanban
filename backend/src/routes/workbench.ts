import express from 'express';
import pool from '../db/connection';
import { requireAuth, blockExternal } from '../middleware/permissions';

const router = express.Router();

// Get all projects associated with a specific sprint
// Only return projects that have been added to this sprint (exist in sprint_projects)
router.get('/sprint/:sprintId/projects', requireAuth, async (req, res) => {
    try {
        const { sprintId } = req.params;
        // INNER JOIN to only get projects that are actually in this sprint
        const result = await pool.query(`
            SELECT
                p.*,
                sp.id as snapshot_id,
                sp.sprint_id,
                sp.priority,
                sp.notes,
                u.id as owner_id,
                u.display_name as owner_name
            FROM projects p
            INNER JOIN sprint_projects sp ON p.id = sp.project_id AND sp.sprint_id = $1
            LEFT JOIN users u ON p.owner_id = u.id
            ORDER BY p.id ASC
        `, [sprintId]);

        // Map software_name to name
        const projects = result.rows.map(row => ({
            ...row,
            name: row.software_name
        }));
        res.json(projects);
    } catch (err) {
        console.error('Error fetching workbench projects:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// List available projects (not in current sprint)
router.get('/projects/available', requireAuth, async (req, res) => {
    const { sprintId, search } = req.query;
    if (!sprintId) return res.status(400).json({ message: 'Missing sprintId' });

    try {
        let query = `
            SELECT p.* 
            FROM projects p
            WHERE p.id NOT IN (
                SELECT project_id FROM sprint_projects WHERE sprint_id = $1
            )
        `;
        const params: any[] = [sprintId];

        if (search) {
            query += ` AND (p.software_name ILIKE $2 OR p.description ILIKE $2)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY p.id DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching available projects:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Add existing project to sprint - Block external users
router.post('/sprint/projects', blockExternal, async (req, res) => {
    const { sprintId, projectId, priority, notes } = req.body;
    if (!sprintId || !projectId) return res.status(400).json({ message: 'Missing fields' });

    try {
        await pool.query(
            'INSERT INTO sprint_projects (sprint_id, project_id, priority, notes) VALUES ($1, $2, $3, $4) ON CONFLICT (sprint_id, project_id) DO NOTHING',
            [sprintId, projectId, priority || '中', notes || '']
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error adding project to sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete project from sprint (remove snapshot) - Block external users
router.post('/sprint/project/delete', blockExternal, async (req, res) => {
    const { sprintId, projectId } = req.body;
    if (!sprintId || !projectId) return res.status(400).json({ message: 'Missing fields' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Delete project snapshot from sprint
        await client.query(
            'DELETE FROM sprint_projects WHERE sprint_id = $1 AND project_id = $2',
            [sprintId, projectId]
        );

        // Also delete all story and task snapshots for this project in this sprint
        // This maintains data integrity
        await client.query(
            'DELETE FROM sprint_stories WHERE sprint_id = $1 AND project_id = $2',
            [sprintId, projectId]
        );

        await client.query(
            'DELETE FROM sprint_tasks WHERE sprint_id = $1 AND project_id = $2',
            [sprintId, projectId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting project from sprint:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Update Project (Reference + Snapshot) - Block external users
router.post('/project/update', blockExternal, async (req, res) => {
    const { sprintId, projectId, name, description, department_id, project_type_id, owner_id, source, priority, notes } = req.body;
    if (!projectId) return res.status(400).json({ message: 'Missing projectId' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Reference Table
        await client.query(
            'UPDATE projects SET software_name = $1, description = $2, department_id = $3, project_type_id = $4, owner_id = $5, source = $6, updated_at = NOW() WHERE id = $7',
            [name, description, department_id, project_type_id, (owner_id && owner_id !== '0') ? owner_id : null, source || null, projectId]
        );

        // 2. Upsert Snapshot Table
        if (sprintId) {
            const check = await client.query(
                'SELECT id FROM sprint_projects WHERE sprint_id = $1 AND project_id = $2',
                [sprintId, projectId]
            );

            if (check.rows.length > 0) {
                await client.query(
                    'UPDATE sprint_projects SET priority = $1, notes = $2, updated_at = NOW() WHERE sprint_id = $3 AND project_id = $4',
                    [priority || '中', notes || '', sprintId, projectId]
                );
            } else {
                await client.query(
                    'INSERT INTO sprint_projects (sprint_id, project_id, priority, notes) VALUES ($1, $2, $3, $4)',
                    [sprintId, projectId, priority || '中', notes || '']
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating project details:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});


// Get Board Data: Stories and Tasks for a specific Sprint + Project
// Get board data - All authenticated users
router.get('/board', requireAuth, async (req, res) => {
    const { sprintId, projectId, memberId } = req.query;
    if (!sprintId || !projectId) {
        return res.status(400).json({ message: 'Missing sprintId or projectId' });
    }

    try {
        // Fetch Stories for this Sprint & Project (from sprint_stories snapshot)
        // If no snapshot exists yet, we might want to return nothing?
        // Or should we fetch reference stories?
        // Flow Model says: "Search and Add". So initially board is empty.
        // BUT for the prototype to be usable immediately, we might want to see existing stories?
        // Let's stick to the strict model: You must ADD stories to the sprint.
        // However, we don't have a UI to "Add Story to Sprint" yet.
        // CRITICAL SHORTCUT: For this version, let's fetch ALL stories/tasks for the project
        // and fake the snapshot part if needed, OR just return what's in reference tables
        // and assume "Planned" implies in sprint if dates match?
        // NO, let's implement the "Add" logic properly or use a lenient query.

        // Lenient Query: Get all stories/tasks for this project. 
        // We will "simulate" them being in the sprint for now to populate the board easily.
        // LATER: We will switch to proper `sprint_stories` / `sprint_tasks`.

        // Let's try to do it right? 
        // If I query `sprint_stories`, it will be empty.
        // Let's query Reference Tables (`stories`, `tasks`) directly for now.
        // This makes the existing data show up immediately without a complex "Planning" step.

        const user = (req.session as any).user;
        const role = user?.role || 'external';
        const userId = user?.id;

        // Efficient JOIN query to get stories with their sprint session data and assignee
        let storiesQuery = `
            SELECT
                s.*,
                ss.id as snapshot_id,
                ss.sprint_id,
                ss.status,
                ss.progress,
                ss.planned_completion_date,
                ss.actual_completion_date,
                u.id as assignee_id,
                u.display_name as assignee_name,
                (SELECT COUNT(*) FROM sprint_tasks st WHERE st.story_id = s.id AND st.sprint_id = $1) as task_count
            FROM stories s
            JOIN sprint_stories ss ON s.id = ss.story_id AND ss.sprint_id = $1
            LEFT JOIN users u ON ss.assigned_to = u.id
            WHERE s.project_id = $2
        `;
        const storiesParams: any[] = [sprintId, projectId];

        // Optional filter by member (for frontend filtering)
        // All users should see the same data by default
        if (memberId && memberId !== '0') {
            storiesQuery += ` AND (ss.assigned_to = $3 OR EXISTS (
                SELECT 1 FROM sprint_tasks st
                WHERE st.story_id = s.id AND st.sprint_id = $1 AND st.assigned_to = $3
            ))`;
            storiesParams.push(memberId);
        }

        storiesQuery += ` ORDER BY ss.order_index ASC, s.id ASC`;
        const storiesResult = await pool.query(storiesQuery, storiesParams);

        // TASK QUERY
        // All users see the same tasks (role-based filtering removed)
        // Optional filtering by memberId for frontend member filter

        let tasksQuery = `
            SELECT
                t.*,
                st.id as snapshot_id,
                st.sprint_id,
                st.status,
                st.progress,
                st.planned_completion_date,
                st.actual_completion_date,
                u.id as assignee_id,
                u.display_name as assignee_name
            FROM tasks t
            JOIN sprint_tasks st ON t.id = st.task_id AND st.sprint_id = $1
            LEFT JOIN users u ON st.assigned_to = u.id
            WHERE t.project_id = $2
        `;
        const params: any[] = [sprintId, projectId];

        // Optional filter by member (for frontend filtering)
        // All users should see the same data by default
        if (memberId && memberId !== '0') {
            tasksQuery += ` AND st.assigned_to = $3`;
            params.push(memberId);
        }

        tasksQuery += ` ORDER BY st.order_index ASC, t.id ASC`;
        const tasksResult = await pool.query(tasksQuery, params);

        const membersResult = await pool.query('SELECT id, user_name, display_name FROM users');

        // Transform results to match frontend expectations (e.g. nested assignee object)
        const stories = storiesResult.rows.map(row => ({
            ...row,
            status: row.status || 'not_started',
            progress: row.progress || 0,
            task_count: parseInt(row.task_count) || 0,
            assigned_to_user: row.assignee_id ? {
                id: row.assignee_id,
                display_name: row.assignee_name,
                avatar_url: `https://i.pravatar.cc/150?u=${row.assignee_id}`
            } : null
        }));

        const tasks = tasksResult.rows.map(row => ({
            ...row,
            status: row.status || 'not_started',
            progress: row.progress || 0,
            assigned_to_user: row.assignee_id ? {
                id: row.assignee_id,
                display_name: row.assignee_name,
                avatar_url: `https://i.pravatar.cc/150?u=${row.assignee_id}`
            } : null
        }));

        res.json({
            stories,
            tasks,
            members: membersResult.rows
        });

    } catch (err) {
        console.error('Error fetching board data:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update Task Status (Drag and Drop)
// Update task status - Block external users
router.post('/task/status', blockExternal, async (req, res) => {
    const { sprintId, taskId, status, projectId, storyId } = req.body;
    // If it exists, update status.
    const user = (req.session as any).user;
    const role = user?.role;
    const userId = user?.id;

    if (role === 'external') {
        return res.status(403).json({ message: 'External users cannot update tasks' });
    }

    try {
        // Developers and Admins can update task status (already blocked external users above)

        // Check if exists
        const check = await pool.query(
            'SELECT id FROM sprint_tasks WHERE sprint_id = $1 AND task_id = $2',
            [sprintId, taskId]
        );

        if (check.rows.length > 0) {
            // Update
            await pool.query(
                'UPDATE sprint_tasks SET status = $1, updated_by = $2, updated_at = NOW() WHERE sprint_id = $3 AND task_id = $4',
                [status, userId, sprintId, taskId]
            );
        } else {
            // Insert (Project ID required)
            await pool.query(
                'INSERT INTO sprint_tasks (sprint_id, task_id, project_id, story_id, status, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $6)',
                [sprintId, taskId, projectId, storyId, status, userId]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating task status:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Assign Task to User
// Assign task - Block external users
router.post('/task/assign', blockExternal, async (req, res) => {
    const { sprintId, taskId, assignedTo, projectId } = req.body;
    if (!sprintId || !taskId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = (req.session as any).user;
    const role = user?.role;
    const userId = user?.id;

    if (role === 'external') {
        return res.status(403).json({ message: 'External users cannot assign tasks' });
    }

    try {
        // Check if sprint_tasks record exists
        const check = await pool.query(
            'SELECT id FROM sprint_tasks WHERE sprint_id = $1 AND task_id = $2',
            [sprintId, taskId]
        );

        if (check.rows.length > 0) {
            // Update existing snapshot
            await pool.query(
                'UPDATE sprint_tasks SET assigned_to = $1, updated_by = $2, updated_at = NOW() WHERE sprint_id = $3 AND task_id = $4',
                [assignedTo || null, userId, sprintId, taskId]
            );
        } else {
            // Insert new snapshot (shouldn't normally happen, but handle it)
            await pool.query(
                'INSERT INTO sprint_tasks (sprint_id, task_id, project_id, assigned_to, status, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $6)',
                [sprintId, taskId, projectId, assignedTo || null, 'not_started', userId]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error assigning task:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update Story Status (drag and drop)
// Update story status - Block external users
router.post('/story/status', blockExternal, async (req, res) => {
    const { sprintId, storyId, status, projectId } = req.body;
    if (!sprintId || !storyId || !status) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = (req.session as any).user;
    const role = user?.role;
    const userId = user?.id;

    if (role === 'external') {
        return res.status(403).json({ message: 'External users cannot update stories' });
    }

    try {
        // Developers and Admins can update story status (already blocked external users above)

        // Check if exists and get current status
        const check = await pool.query(
            'SELECT id, status FROM sprint_stories WHERE sprint_id = $1 AND story_id = $2',
            [sprintId, storyId]
        );

        if (check.rows.length > 0) {
            const currentStatus = check.rows[0].status;
            const shouldSetActualDate = status === 'completed' && currentStatus !== 'completed';

            // Update existing snapshot with auto-set actual_completion_date if needed
            const updateQuery = shouldSetActualDate
                ? 'UPDATE sprint_stories SET status = $1, updated_by = $2, actual_completion_date = NOW(), updated_at = NOW() WHERE sprint_id = $3 AND story_id = $4'
                : 'UPDATE sprint_stories SET status = $1, updated_by = $2, updated_at = NOW() WHERE sprint_id = $3 AND story_id = $4';

            await pool.query(updateQuery, [status, userId, sprintId, storyId]);
        } else {
            // Insert new snapshot (shouldn't normally happen with drag-drop, but handle it)
            const insertQuery = status === 'completed'
                ? 'INSERT INTO sprint_stories (sprint_id, project_id, story_id, status, created_by, updated_by, actual_completion_date) VALUES ($1, $2, $3, $4, $5, $5, NOW())'
                : 'INSERT INTO sprint_stories (sprint_id, project_id, story_id, status, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $5)';

            await pool.query(insertQuery, [sprintId, projectId, storyId, status, userId]);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating story status:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Assign Story to User
// Assign story - Block external users
router.post('/story/assign', blockExternal, async (req, res) => {
    const { sprintId, storyId, assignedTo, projectId } = req.body;
    if (!sprintId || !storyId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = (req.session as any).user;
    const role = user?.role;
    const userId = user?.id;

    if (role === 'external') {
        return res.status(403).json({ message: 'External users cannot assign stories' });
    }

    try {
        // Check if sprint_stories record exists
        const check = await pool.query(
            'SELECT id FROM sprint_stories WHERE sprint_id = $1 AND story_id = $2',
            [sprintId, storyId]
        );

        if (check.rows.length > 0) {
            // Update existing snapshot
            await pool.query(
                'UPDATE sprint_stories SET assigned_to = $1, updated_by = $2, updated_at = NOW() WHERE sprint_id = $3 AND story_id = $4',
                [assignedTo || null, userId, sprintId, storyId]
            );
        } else {
            // Insert new snapshot (shouldn't normally happen, but handle it)
            await pool.query(
                'INSERT INTO sprint_stories (sprint_id, story_id, project_id, assigned_to, status, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $6)',
                [sprintId, storyId, projectId, assignedTo || null, 'not_started', userId]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error assigning story:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update Story (including priority)
// Update story - Block external users
router.put('/story', blockExternal, async (req, res) => {
    const { sprintId, projectId, storyId, title, assignedTo, priority } = req.body;
    if (!storyId || !sprintId || !projectId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Reference Story
        await client.query(
            'UPDATE stories SET title = $1, priority = $2, updated_at = NOW() WHERE id = $3',
            [title, priority || 'medium', storyId]
        );

        // 2. Update Snapshot
        await client.query(
            'UPDATE sprint_stories SET assigned_to = $1, priority = $2, updated_at = NOW() WHERE sprint_id = $3 AND story_id = $4',
            [assignedTo || null, priority || 'medium', sprintId, storyId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating story:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Create Story and Add to Sprint
// Create story - Block external users
router.post('/story', blockExternal, async (req, res) => {
    const { sprintId, projectId, title, description, assignedTo, priority, planned_completion_date } = req.body;
    if (!sprintId || !projectId || !title) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create Reference Story
        const userId = (req.session as any).user?.id || null;
        const storyRes = await client.query(
            'INSERT INTO stories (project_id, title, description, created_by, priority) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [projectId, title, description, userId, priority || 'medium']
        );
        const storyId = storyRes.rows[0].id;

        // 2. Create Snapshot (Add to Sprint)
        await client.query(
            'INSERT INTO sprint_stories (sprint_id, project_id, story_id, status, assigned_to, priority, planned_completion_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [sprintId, projectId, storyId, 'not_started', assignedTo || null, priority || 'medium', planned_completion_date || null]
        );

        await client.query('COMMIT');
        res.status(201).json({ id: storyId, title, status: 'not_started', assigned_to: assignedTo, priority: priority || 'medium' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating story:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Create Task and Add to Sprint
// Create task - Block external users
router.post('/task', blockExternal, async (req, res) => {
    const { sprintId, projectId, storyId, title, description, priority, estimatedHours, assignedTo } = req.body;
    if (!sprintId || !projectId || !title) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create Reference Task
        const userId = (req.session as any).user?.id || null;
        const taskRes = await client.query(
            'INSERT INTO tasks (project_id, story_id, title, description, priority, estimated_hours, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [projectId, storyId || null, title, description || '', priority || 'Should', estimatedHours || null, userId]
        );
        const taskId = taskRes.rows[0].id;

        // 2. Create Snapshot (Add to Sprint)
        await client.query(
            'INSERT INTO sprint_tasks (sprint_id, project_id, story_id, task_id, status, assigned_to) VALUES ($1, $2, $3, $4, $5, $6)',
            [sprintId, projectId, storyId || null, taskId, 'not_started', assignedTo || null]
        );

        await client.query('COMMIT');
        res.status(201).json({ id: taskId, title, status: 'not_started', story_id: storyId, priority, estimated_hours: estimatedHours, assigned_to: assignedTo });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating task:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Update Task Details
// Update task - Block external users
router.post('/task/update', blockExternal, async (req, res) => {
    const { id, taskId, sprintId, title, description, status, priority, estimatedHours, assignedTo, progress, risk_and_countermeasure, planned_completion_date } = req.body;
    const finalTaskId = id || taskId;
    if (!finalTaskId || !sprintId) return res.status(400).json({ message: 'Missing taskId or sprintId' });

    const user = (req.session as any).user;
    const role = user?.role;
    const userId = user?.id;

    if (role === 'external') return res.status(403).json({ message: 'Forbidden' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Reference Task
        // Developers and Admins can edit all tasks (already blocked external users above)

        await client.query(
            'UPDATE tasks SET title = $1, description = $2, priority = $3, estimated_hours = $4 WHERE id = $5',
            [title, description, priority, estimatedHours || null, finalTaskId]
        );

        // 2. Update Snapshot (sprint_tasks) - now filtering by sprint_id to avoid affecting other sprints
        const updateResult = await client.query(
            `UPDATE sprint_tasks
             SET status = $1, assigned_to = $2, progress = $3, risk_and_countermeasure = $4, planned_completion_date = $5, updated_at = NOW()
             WHERE task_id = $6 AND sprint_id = $7
             RETURNING sprint_id, story_id`,
            [status, assignedTo || null, progress || 0, risk_and_countermeasure || '', planned_completion_date || null, finalTaskId, sprintId]
        );

        // 3. Auto-calculate Story Progress
        // If the task belongs to a story in a sprint, update that story's progress in that sprint.
        // We use the returned sprint_id(s) and story_id(s) from the update.
        const touchedRows = updateResult.rows;

        // Use a Set to avoid redundant calculations if multiple rows returned (unlikely if unique constraint, but good practice)
        const calculations = new Set<string>();

        for (const row of touchedRows) {
            if (row.story_id && row.sprint_id) {
                const key = `${row.sprint_id}-${row.story_id}`;
                if (!calculations.has(key)) {
                    calculations.add(key);

                    // Calculate average progress of all tasks for this story in this sprint
                    const avgRes = await client.query(
                        `SELECT AVG(progress) as avg_progress 
                         FROM sprint_tasks 
                         WHERE sprint_id = $1 AND story_id = $2`,
                        [row.sprint_id, row.story_id]
                    );

                    const newStoryProgress = Math.round(Number(avgRes.rows[0].avg_progress) || 0);

                    // Update Story Snapshot
                    await client.query(
                        `UPDATE sprint_stories 
                         SET progress = $1 
                         WHERE sprint_id = $2 AND story_id = $3`,
                        [newStoryProgress, row.sprint_id, row.story_id]
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating task details:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Update Story Details
// Update story details - Block external users
router.post('/story/update', blockExternal, async (req, res) => {
    const {
        storyId,
        sprintId,
        title,
        description,
        status,
        assignedTo,
        planned_completion_date,
        estimated_hours,
        risk_and_countermeasure
    } = req.body;
    if (!storyId || !sprintId) return res.status(400).json({ message: 'Missing storyId or sprintId' });

    const user = (req.session as any).user;
    const role = user?.role;
    const userId = user?.id;

    if (role === 'external') return res.status(403).json({ message: 'Forbidden' });

    // Developers and Admins can edit all stories (already blocked external users above)

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Reference Story
        await client.query(
            'UPDATE stories SET title = $1, description = $2 WHERE id = $3',
            [title, description || '', storyId]
        );

        // 2. Check current status for auto-setting actual_completion_date
        const checkStatus = await client.query(
            'SELECT status FROM sprint_stories WHERE story_id = $1 AND sprint_id = $2',
            [storyId, sprintId]
        );

        const currentStatus = checkStatus.rows[0]?.status;
        const shouldSetActualDate = status === 'completed' && currentStatus !== 'completed';

        // 3. Update Snapshot (with sprint_id filter to avoid affecting other sprints)
        const updateQuery = shouldSetActualDate
            ? `UPDATE sprint_stories
               SET status = $1, assigned_to = $2, planned_completion_date = $3,
                   estimated_hours = $4, risk_and_countermeasure = $5,
                   actual_completion_date = NOW(), updated_at = NOW()
               WHERE story_id = $6 AND sprint_id = $7`
            : `UPDATE sprint_stories
               SET status = $1, assigned_to = $2, planned_completion_date = $3,
                   estimated_hours = $4, risk_and_countermeasure = $5, updated_at = NOW()
               WHERE story_id = $6 AND sprint_id = $7`;

        await client.query(updateQuery, [
            status,
            assignedTo || null,
            planned_completion_date || null,
            estimated_hours || null,
            risk_and_countermeasure || '',
            storyId,
            sprintId
        ]);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating story details:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Search for available stories (not in current sprint)
// Get available stories - All authenticated users
router.get('/stories/available', requireAuth, async (req, res) => {
    const { projectId, sprintId, search } = req.query;
    if (!projectId || !sprintId) {
        return res.status(400).json({ message: 'Missing projectId or sprintId' });
    }

    try {
        let query = `
            SELECT s.* 
            FROM stories s
            WHERE s.project_id = $1
            AND s.id NOT IN (
                SELECT story_id FROM sprint_stories WHERE sprint_id = $2
            )
        `;
        const params: any[] = [projectId, sprintId];

        if (search) {
            query += ` AND (s.title ILIKE $3 OR s.description ILIKE $3)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY s.id DESC LIMIT 50`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error searching available stories:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Search for available tasks (not in current sprint)
// Get available tasks - All authenticated users
router.get('/tasks/available', requireAuth, async (req, res) => {
    const { projectId, sprintId, storyId, search } = req.query;
    if (!projectId || !sprintId) {
        return res.status(400).json({ message: 'Missing projectId or sprintId' });
    }

    try {
        let query = `
            SELECT t.* 
            FROM tasks t
            WHERE t.project_id = $1
            AND t.id NOT IN (
                SELECT task_id FROM sprint_tasks WHERE sprint_id = $2
            )
        `;
        const params: any[] = [projectId, sprintId];

        if (storyId && storyId !== '0') {
            query += ` AND t.story_id = $3`;
            params.push(storyId);
        }

        if (search) {
            const searchIdx = params.length + 1;
            query += ` AND (t.title ILIKE $${searchIdx} OR t.description ILIKE $${searchIdx})`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY t.id DESC LIMIT 50`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error searching available tasks:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reuse existing Story (Add to Sprint)
// Reuse story - Block external users
router.post('/story/reuse', blockExternal, async (req, res) => {
    const { sprintId, projectId, storyId, assignedTo } = req.body;
    if (!sprintId || !projectId || !storyId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        await pool.query(
            'INSERT INTO sprint_stories (sprint_id, project_id, story_id, status, progress, assigned_to) VALUES ($1, $2, $3, $4, $5, $6)',
            [sprintId, projectId, storyId, 'not_started', 0, assignedTo || null]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error reusing story:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reuse existing Task (Add to Sprint)
// Reuse task - Block external users
router.post('/task/reuse', blockExternal, async (req, res) => {
    const { sprintId, projectId, storyId, taskId, assignedTo } = req.body;
    if (!sprintId || !projectId || !taskId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        await pool.query(
            'INSERT INTO sprint_tasks (sprint_id, project_id, story_id, task_id, status, progress, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [sprintId, projectId, storyId || null, taskId, 'not_started', 0, assignedTo || null]
        );

        // Orphan Logic: Auto-add parent Story if not in sprint
        if (storyId) {
            const checkStory = await pool.query(
                'SELECT 1 FROM sprint_stories WHERE sprint_id = $1 AND story_id = $2',
                [sprintId, storyId]
            );
            if (checkStory.rows.length === 0) {
                // Auto-add story
                await pool.query(
                    'INSERT INTO sprint_stories (sprint_id, project_id, story_id, status, progress) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
                    [sprintId, projectId, storyId, 'not_started', 0]
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error reusing task:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete Story (from sprint or permanently)
// Delete story - Block external users
router.post('/story/delete', blockExternal, async (req, res) => {
    const { sprintId, projectId, storyId } = req.body;

    // Validate required fields
    if (!projectId || !storyId) {
        return res.status(400).json({ message: 'Missing required fields: projectId and storyId' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (sprintId) {
            // Mode 1: Delete from specific sprint only
            await client.query(
                'DELETE FROM sprint_stories WHERE sprint_id = $1 AND project_id = $2 AND story_id = $3',
                [sprintId, projectId, storyId]
            );
            await client.query(
                'DELETE FROM sprint_tasks WHERE sprint_id = $1 AND project_id = $2 AND story_id = $3',
                [sprintId, projectId, storyId]
            );
        } else {
            // Mode 2: Permanent delete from all sprints and reference tables
            // 1. Delete all sprint_tasks for this story (across all sprints)
            await client.query(
                'DELETE FROM sprint_tasks WHERE story_id = $1',
                [storyId]
            );

            // 2. Delete all tasks in reference table for this story
            await client.query(
                'DELETE FROM tasks WHERE story_id = $1',
                [storyId]
            );

            // 3. Delete all sprint_stories for this story (across all sprints)
            await client.query(
                'DELETE FROM sprint_stories WHERE story_id = $1',
                [storyId]
            );

            // 4. Delete the story from reference table
            await client.query(
                'DELETE FROM stories WHERE id = $1',
                [storyId]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, mode: sprintId ? 'sprint' : 'permanent' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting story:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Delete Task (from sprint or permanently)
// Delete task - Block external users
router.post('/task/delete', blockExternal, async (req, res) => {
    const { sprintId, projectId, storyId, taskId } = req.body;

    // Validate required fields
    if (!projectId || !storyId || !taskId) {
        return res.status(400).json({ message: 'Missing required fields: projectId, storyId, and taskId' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (sprintId) {
            // Mode 1: Delete from specific sprint only
            await client.query(
                'DELETE FROM sprint_tasks WHERE sprint_id = $1 AND project_id = $2 AND story_id = $3 AND task_id = $4',
                [sprintId, projectId, storyId, taskId]
            );
        } else {
            // Mode 2: Permanent delete from all sprints and reference table
            // 1. Delete all sprint_tasks for this task (across all sprints)
            await client.query(
                'DELETE FROM sprint_tasks WHERE task_id = $1',
                [taskId]
            );

            // 2. Delete the task from reference table
            await client.query(
                'DELETE FROM tasks WHERE id = $1',
                [taskId]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, mode: sprintId ? 'sprint' : 'permanent' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting task:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Get Story History
router.get('/story/:id/history', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT
                sp.sprint_number,
                sp.start_date,
                sp.end_date,
                ss.status,
                ss.progress,
                ss.updated_at
            FROM sprint_stories ss
            JOIN sprints sp ON ss.sprint_id = sp.id
            WHERE ss.story_id = $1
            ORDER BY sp.start_date ASC
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching story history:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Move Task to another Sprint (including Backlog)
router.post('/task/move', async (req, res) => {
    const { taskId, fromSprintId, toSprintId, storyId, projectId } = req.body;

    if (taskId === undefined || toSprintId === undefined || !storyId || !projectId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Ensure target sprint has Story snapshot
        const storyCheck = await client.query(
            'SELECT * FROM sprint_stories WHERE sprint_id = $1 AND story_id = $2',
            [toSprintId, storyId]
        );

        if (storyCheck.rows.length === 0) {
            // Create Story snapshot in target sprint
            await client.query(
                'INSERT INTO sprint_stories (sprint_id, story_id, project_id, status) VALUES ($1, $2, $3, $4)',
                [toSprintId, storyId, projectId, 'not_started']
            );
        }

        // 2. Check if target sprint already has this Task snapshot
        const taskCheck = await client.query(
            'SELECT * FROM sprint_tasks WHERE sprint_id = $1 AND task_id = $2',
            [toSprintId, taskId]
        );

        if (taskCheck.rows.length > 0) {
            // Target already has Task, delete source snapshot (merge)
            await client.query(
                'DELETE FROM sprint_tasks WHERE sprint_id = $1 AND task_id = $2',
                [fromSprintId, taskId]
            );
        } else {
            // Target doesn't have Task, UPDATE sprint_id
            await client.query(
                'UPDATE sprint_tasks SET sprint_id = $1 WHERE sprint_id = $2 AND task_id = $3',
                [toSprintId, fromSprintId, taskId]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error moving task:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Move entire Story (and all its Tasks) to another Sprint
router.post('/story/move', async (req, res) => {
    const { storyId, fromSprintId, toSprintId, projectId } = req.body;

    if (!storyId || toSprintId === undefined || !projectId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Handle Story snapshot
        const storyCheck = await client.query(
            'SELECT * FROM sprint_stories WHERE sprint_id = $1 AND story_id = $2',
            [toSprintId, storyId]
        );

        if (storyCheck.rows.length > 0) {
            // Target already has Story snapshot, delete source
            await client.query(
                'DELETE FROM sprint_stories WHERE sprint_id = $1 AND story_id = $2',
                [fromSprintId, storyId]
            );
        } else {
            // Target doesn't have Story, UPDATE sprint_id
            await client.query(
                'UPDATE sprint_stories SET sprint_id = $1 WHERE sprint_id = $2 AND story_id = $3',
                [toSprintId, fromSprintId, storyId]
            );
        }

        // 2. Get all Tasks from source sprint
        const tasksResult = await client.query(
            'SELECT task_id FROM sprint_tasks WHERE sprint_id = $1 AND story_id = $2',
            [fromSprintId, storyId]
        );

        // 3. Move each Task
        for (const row of tasksResult.rows) {
            const taskId = row.task_id;

            const taskCheck = await client.query(
                'SELECT * FROM sprint_tasks WHERE sprint_id = $1 AND task_id = $2',
                [toSprintId, taskId]
            );

            if (taskCheck.rows.length > 0) {
                // Target already has Task, delete source
                await client.query(
                    'DELETE FROM sprint_tasks WHERE sprint_id = $1 AND task_id = $2',
                    [fromSprintId, taskId]
                );
            } else {
                // Target doesn't have Task, UPDATE sprint_id
                await client.query(
                    'UPDATE sprint_tasks SET sprint_id = $1 WHERE sprint_id = $2 AND task_id = $3',
                    [toSprintId, fromSprintId, taskId]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error moving story:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Reorder Stories within a Sprint
router.post('/stories/reorder', async (req, res) => {
    const { sprintId, projectId, orders } = req.body;
    // orders: [{ id: 123, order: 1 }, { id: 124, order: 2 }, ...]
    if (!sprintId || !projectId || !orders || !Array.isArray(orders)) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const item of orders) {
            await client.query(
                'UPDATE sprint_stories SET order_index = $1, updated_at = NOW() WHERE sprint_id = $2 AND story_id = $3',
                [item.order, sprintId, item.id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error reordering stories:', err);
        res.status(500).json({ message: 'Failed to reorder stories' });
    } finally {
        client.release();
    }
});

// Reorder Tasks within a Story
router.post('/tasks/reorder', async (req, res) => {
    const { sprintId, orders } = req.body;
    // orders: [{ id: 456, order: 1 }, { id: 457, order: 2 }, ...]
    if (!sprintId || !orders || !Array.isArray(orders)) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const item of orders) {
            await client.query(
                'UPDATE sprint_tasks SET order_index = $1, updated_at = NOW() WHERE sprint_id = $2 AND task_id = $3',
                [item.order, sprintId, item.id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error reordering tasks:', err);
        res.status(500).json({ message: 'Failed to reorder tasks' });
    } finally {
        client.release();
    }
});

// Get Story by ID (for direct URL access)
router.get('/story/:id', async (req, res) => {
    const { id } = req.params;
    const { sprintId } = req.query;

    try {
        let query = `
            SELECT
                s.*,
                ss.status,
                ss.progress,
                ss.priority as snapshot_priority,
                ss.planned_completion_date,
                ss.actual_completion_date,
                ss.estimated_hours,
                ss.risk_and_countermeasure,
                u.id as assignee_id,
                u.display_name as assignee_name,
                (SELECT COUNT(*) FROM sprint_tasks st WHERE st.story_id = s.id AND st.sprint_id = ss.sprint_id) as task_count
            FROM stories s
            LEFT JOIN sprint_stories ss ON s.id = ss.story_id
            LEFT JOIN users u ON ss.assigned_to = u.id
            WHERE s.id = $1
        `;
        const params: any[] = [id];

        if (sprintId) {
            query += ` AND ss.sprint_id = $2`;
            params.push(sprintId);
        }

        query += ` LIMIT 1`;
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Story not found' });
        }

        const row = result.rows[0];
        const story = {
            ...row,
            status: row.status || 'not_started',
            progress: row.progress || 0,
            task_count: parseInt(row.task_count) || 0,
            assigned_to_user: row.assignee_id ? {
                id: row.assignee_id,
                display_name: row.assignee_name,
                avatar_url: `https://i.pravatar.cc/150?u=${row.assignee_id}`
            } : null
        };

        res.json(story);
    } catch (err) {
        console.error('Error fetching story:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Task by ID (for direct URL access)
router.get('/task/:id', async (req, res) => {
    const { id } = req.params;
    const { sprintId } = req.query;

    try {
        let query = `
            SELECT
                t.*,
                st.status,
                st.progress,
                st.risk_and_countermeasure,
                u.id as assignee_id,
                u.display_name as assignee_name
            FROM tasks t
            LEFT JOIN sprint_tasks st ON t.id = st.task_id
            LEFT JOIN users u ON st.assigned_to = u.id
            WHERE t.id = $1
        `;
        const params: any[] = [id];

        if (sprintId) {
            query += ` AND st.sprint_id = $2`;
            params.push(sprintId);
        }

        query += ` LIMIT 1`;
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const row = result.rows[0];
        const task = {
            ...row,
            status: row.status || 'not_started',
            progress: row.progress || 0,
            assigned_to_user: row.assignee_id ? {
                id: row.assignee_id,
                display_name: row.assignee_name,
                avatar_url: `https://i.pravatar.cc/150?u=${row.assignee_id}`
            } : null
        };

        res.json(task);
    } catch (err) {
        console.error('Error fetching task:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Story by Snapshot ID (sprint_stories.id)
// This allows direct URL access and auto-switches to correct sprint
router.get('/sprint-story/:snapshotId', async (req, res) => {
    const { snapshotId } = req.params;

    try {
        const result = await pool.query(`
            SELECT
                s.*,
                ss.id as snapshot_id,
                ss.sprint_id,
                ss.status,
                ss.progress,
                ss.priority as snapshot_priority,
                ss.planned_completion_date,
                ss.actual_completion_date,
                ss.estimated_hours,
                ss.risk_and_countermeasure,
                u.id as assignee_id,
                u.display_name as assignee_name,
                (SELECT COUNT(*) FROM sprint_tasks st WHERE st.story_id = s.id AND st.sprint_id = ss.sprint_id) as task_count
            FROM sprint_stories ss
            JOIN stories s ON ss.story_id = s.id
            LEFT JOIN users u ON ss.assigned_to = u.id
            WHERE ss.id = $1
        `, [snapshotId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Story snapshot not found' });
        }

        const row = result.rows[0];
        const story = {
            ...row,
            status: row.status || 'not_started',
            progress: row.progress || 0,
            task_count: parseInt(row.task_count) || 0,
            assigned_to_user: row.assignee_id ? {
                id: row.assignee_id,
                display_name: row.assignee_name,
                avatar_url: `https://i.pravatar.cc/150?u=${row.assignee_id}`
            } : null
        };

        res.json(story);
    } catch (err) {
        console.error('Error fetching story snapshot:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Task by Snapshot ID (sprint_tasks.id)
// This allows direct URL access and auto-switches to correct sprint
router.get('/sprint-task/:snapshotId', async (req, res) => {
    const { snapshotId } = req.params;

    try {
        const result = await pool.query(`
            SELECT
                t.*,
                st.id as snapshot_id,
                st.sprint_id,
                st.status,
                st.progress,
                st.risk_and_countermeasure,
                u.id as assignee_id,
                u.display_name as assignee_name
            FROM sprint_tasks st
            JOIN tasks t ON st.task_id = t.id
            LEFT JOIN users u ON st.assigned_to = u.id
            WHERE st.id = $1
        `, [snapshotId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Task snapshot not found' });
        }

        const row = result.rows[0];
        const task = {
            ...row,
            status: row.status || 'not_started',
            progress: row.progress || 0,
            assigned_to_user: row.assignee_id ? {
                id: row.assignee_id,
                display_name: row.assignee_name,
                avatar_url: `https://i.pravatar.cc/150?u=${row.assignee_id}`
            } : null
        };

        res.json(task);
    } catch (err) {
        console.error('Error fetching task snapshot:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Project by Snapshot ID (sprint_projects.id)
// This allows direct URL access and auto-switches to correct sprint
router.get('/sprint-project/:snapshotId', async (req, res) => {
    const { snapshotId } = req.params;

    try {
        const result = await pool.query(`
            SELECT
                p.*,
                sp.id as snapshot_id,
                sp.sprint_id,
                sp.priority,
                sp.notes,
                u.id as owner_id,
                u.display_name as owner_name
            FROM sprint_projects sp
            JOIN projects p ON sp.project_id = p.id
            LEFT JOIN users u ON p.owner_id = u.id
            WHERE sp.id = $1
        `, [snapshotId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project snapshot not found' });
        }

        const row = result.rows[0];
        const project = {
            ...row,
            name: row.software_name
        };

        res.json(project);
    } catch (err) {
        console.error('Error fetching project snapshot:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
