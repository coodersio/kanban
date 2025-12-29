import express from 'express';
import pool from '../db/connection';

const router = express.Router();

// Get all projects associated with a specific sprint
// For now, we return ALL projects because we haven't implemented "Adding Project to Sprint" logic yet.
// In a real flow, we would query `sprint_projects`.
// To keep it simple for the prototype, we will return all projects and just pretend they are in the sprint,
// OR we can implement a simple auto-add query.
// Let's stick to the plan: query `projects`, but ideally we should only show relevant ones.
// Current decision: Return ALL active projects to allow user to select them and see their status in this sprint.
router.get('/sprint/:sprintId/projects', async (req, res) => {
    try {
        const { sprintId } = req.params;
        // Join with sprint_projects to get snapshot fields
        const result = await pool.query(`
            SELECT p.*, sp.priority, sp.notes
            FROM projects p
            LEFT JOIN sprint_projects sp ON p.id = sp.project_id AND sp.sprint_id = $1
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

// Update Project (Reference + Snapshot)
router.post('/project/update', async (req, res) => {
    const { sprintId, projectId, name, description, department_id, project_type_id, priority, notes } = req.body;
    if (!projectId) return res.status(400).json({ message: 'Missing projectId' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Reference Table
        await client.query(
            'UPDATE projects SET software_name = $1, description = $2, department_id = $3, project_type_id = $4, updated_at = NOW() WHERE id = $5',
            [name, description, department_id, project_type_id, projectId]
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
                    [priority || 0, notes || '', sprintId, projectId]
                );
            } else {
                await client.query(
                    'INSERT INTO sprint_projects (sprint_id, project_id, priority, notes) VALUES ($1, $2, $3, $4)',
                    [sprintId, projectId, priority || 0, notes || '']
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
router.get('/board', async (req, res) => {
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

        // Efficient JOIN query to get stories with their sprint session data and assignee
        let storiesQuery = `
            SELECT 
                s.*, 
                ss.status, 
                ss.progress,
                u.id as assignee_id,
                u.display_name as assignee_name
            FROM stories s
            JOIN sprint_stories ss ON s.id = ss.story_id AND ss.sprint_id = $1
            LEFT JOIN users u ON ss.assigned_to = u.id
            WHERE s.project_id = $2
        `;
        const storiesParams: any[] = [sprintId, projectId];

        if (memberId && memberId !== '0') {
            storiesQuery += ` AND (ss.assigned_to = $3 OR EXISTS (
                SELECT 1 FROM sprint_tasks st 
                WHERE st.story_id = s.id AND st.sprint_id = $1 AND st.assigned_to = $3
            ))`;
            storiesParams.push(memberId);
        }

        storiesQuery += ` ORDER BY s.id ASC`;
        const storiesResult = await pool.query(storiesQuery, storiesParams);

        // Efficient JOIN query to get tasks with their sprint session data and assignee
        let tasksQuery = `
            SELECT 
                t.*, 
                st.status, 
                st.progress,
                u.id as assignee_id,
                u.display_name as assignee_name
            FROM tasks t
            JOIN sprint_tasks st ON t.id = st.task_id AND st.sprint_id = $1
            LEFT JOIN users u ON st.assigned_to = u.id
            WHERE t.project_id = $2
        `;
        const params: any[] = [sprintId, projectId];
        if (memberId && memberId !== '0') {
            tasksQuery += ` AND st.assigned_to = $3`;
            params.push(memberId);
        }
        tasksQuery += ` ORDER BY t.id ASC`;
        const tasksResult = await pool.query(tasksQuery, params);

        const membersResult = await pool.query('SELECT id, user_name, display_name FROM users');

        // Transform results to match frontend expectations (e.g. nested assignee object)
        const stories = storiesResult.rows.map(row => ({
            ...row,
            status: row.status || 'not_started',
            progress: row.progress || 0,
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
router.post('/task/status', async (req, res) => {
    const { sprintId, taskId, status, projectId, storyId } = req.body;
    // We need to Upsert into sprint_tasks.
    // If it doesn't exist, insert it (adding to sprint).
    // If it exists, update status.
    try {
        // Check if exists
        const check = await pool.query(
            'SELECT id FROM sprint_tasks WHERE sprint_id = $1 AND task_id = $2',
            [sprintId, taskId]
        );

        if (check.rows.length > 0) {
            // Update
            await pool.query(
                'UPDATE sprint_tasks SET status = $1, updated_at = NOW() WHERE sprint_id = $2 AND task_id = $3',
                [status, sprintId, taskId]
            );
        } else {
            // Insert (Project ID required)
            await pool.query(
                'INSERT INTO sprint_tasks (sprint_id, task_id, project_id, story_id, status) VALUES ($1, $2, $3, $4, $5)',
                [sprintId, taskId, projectId, storyId, status]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating task status:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create Story and Add to Sprint
router.post('/story', async (req, res) => {
    const { sprintId, projectId, title, description, assignedTo } = req.body;
    if (!sprintId || !projectId || !title) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create Reference Story
        const storyRes = await client.query(
            'INSERT INTO stories (project_id, title, description) VALUES ($1, $2, $3) RETURNING id',
            [projectId, title, description]
        );
        const storyId = storyRes.rows[0].id;

        // 2. Create Snapshot (Add to Sprint)
        await client.query(
            'INSERT INTO sprint_stories (sprint_id, project_id, story_id, status, assigned_to) VALUES ($1, $2, $3, $4, $5)',
            [sprintId, projectId, storyId, 'not_started', assignedTo || null]
        );

        await client.query('COMMIT');
        res.status(201).json({ id: storyId, title, status: 'not_started', assigned_to: assignedTo });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating story:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Create Task and Add to Sprint
router.post('/task', async (req, res) => {
    const { sprintId, projectId, storyId, title, description, priority, size, assignedTo } = req.body;
    if (!sprintId || !projectId || !title) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create Reference Task
        const taskRes = await client.query(
            'INSERT INTO tasks (project_id, story_id, title, description, priority, size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [projectId, storyId || null, title, description || '', priority || 'Should', size || 'Medium']
        );
        const taskId = taskRes.rows[0].id;

        // 2. Create Snapshot (Add to Sprint)
        await client.query(
            'INSERT INTO sprint_tasks (sprint_id, project_id, story_id, task_id, status, assigned_to) VALUES ($1, $2, $3, $4, $5, $6)',
            [sprintId, projectId, storyId || null, taskId, 'not_started', assignedTo || null]
        );

        await client.query('COMMIT');
        res.status(201).json({ id: taskId, title, status: 'not_started', story_id: storyId, priority, size, assigned_to: assignedTo });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating task:', err);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Update Task Details
router.post('/task/update', async (req, res) => {
    const { id, taskId, title, description, status, priority, size, assignedTo } = req.body;
    const finalTaskId = id || taskId;
    if (!finalTaskId) return res.status(400).json({ message: 'Missing taskId' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Reference Task
        await client.query(
            'UPDATE tasks SET title = $1, description = $2, priority = $3, size = $4 WHERE id = $5',
            [title, description, priority, size, finalTaskId]
        );

        // 2. Update Snapshot
        await client.query(
            'UPDATE sprint_tasks SET status = $1, assigned_to = $2, updated_at = NOW() WHERE task_id = $3',
            [status, assignedTo || null, finalTaskId]
        );

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
router.post('/story/update', async (req, res) => {
    const { storyId, title, description, status, assignedTo } = req.body;
    if (!storyId) return res.status(400).json({ message: 'Missing storyId' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Reference Story
        await client.query(
            'UPDATE stories SET title = $1, description = $2 WHERE id = $3',
            [title, description || '', storyId]
        );

        // 2. Update Snapshot
        await client.query(
            'UPDATE sprint_stories SET status = $1, assigned_to = $2, updated_at = NOW() WHERE story_id = $3',
            [status, assignedTo || null, storyId]
        );

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

export default router;
