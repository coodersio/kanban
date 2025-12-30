import express from 'express';
import type { Request, Response } from 'express';
import pool from '../db/connection';
import ExcelJS from 'exceljs';

const router = express.Router();

// ============================================================
// GET /api/reports/sprint/:sprintId/data
// Get weekly report data for a specific sprint
// ============================================================
router.get('/sprint/:sprintId/data', async (req: Request, res: Response) => {
    const { sprintId } = req.params;
    const { userId } = req.query;

    try {
        // 1. Get Sprint Info
        const sprintResult = await pool.query(
            'SELECT id, name, start_date, end_date, status FROM sprints WHERE id = $1',
            [sprintId]
        );
        if (sprintResult.rows.length === 0) {
            return res.status(404).json({ message: 'Sprint not found' });
        }
        const sprint = sprintResult.rows[0];

        // 2. Get Active Projects in this Sprint
        const projectsQuery = `
            SELECT DISTINCT p.id, p.name, d.name AS department_name, pt.name AS project_type_name
            FROM projects p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN project_types pt ON p.project_type_id = pt.id
            WHERE p.id IN (
                SELECT DISTINCT sp.project_id FROM sprint_projects sp WHERE sp.sprint_id = $1
                UNION
                SELECT DISTINCT ss.project_id FROM sprint_stories ss WHERE ss.sprint_id = $1
                UNION
                SELECT DISTINCT st.project_id FROM sprint_tasks st WHERE st.sprint_id = $1
            )
            ORDER BY p.id
        `;
        const projectsResult = await pool.query(projectsQuery, [sprintId]);

        // 3. For each project, get stories and tasks
        const projects = [];
        for (const project of projectsResult.rows) {
            // Get stories
            const storiesQuery = `
                SELECT
                    s.id, s.title, s.description,
                    ss.status, ss.progress, ss.priority,
                    ss.planned_completion_date, ss.actual_completion_date,
                    ss.risk_and_countermeasure, ss.estimated_hours,
                    u.id AS assigned_user_id, u.display_name AS assigned_user_name
                FROM stories s
                JOIN sprint_stories ss ON s.id = ss.story_id
                LEFT JOIN users u ON ss.assigned_to = u.id
                WHERE ss.sprint_id = $1 AND ss.project_id = $2
                ${userId ? 'AND ss.assigned_to = $3' : ''}
                ORDER BY
                    CASE ss.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
                    s.id
            `;
            const storiesParams = userId ? [sprintId, project.id, userId] : [sprintId, project.id];
            const storiesResult = await pool.query(storiesQuery, storiesParams);

            const stories = [];
            for (const story of storiesResult.rows) {
                // Get tasks for this story
                const tasksQuery = `
                    SELECT
                        t.id, t.title, t.description,
                        st.status, st.progress, st.priority, st.size,
                        st.risk_and_countermeasure, st.estimated_hours,
                        u.id AS assigned_user_id, u.display_name AS assigned_user_name
                    FROM tasks t
                    JOIN sprint_tasks st ON t.id = st.task_id
                    LEFT JOIN users u ON st.assigned_to = u.id
                    WHERE st.sprint_id = $1 AND st.story_id = $2
                    ${userId ? 'AND st.assigned_to = $3' : ''}
                    ORDER BY t.id
                `;
                const tasksParams = userId ? [sprintId, story.id, userId] : [sprintId, story.id];
                const tasksResult = await pool.query(tasksQuery, tasksParams);

                stories.push({
                    id: story.id,
                    title: story.title,
                    description: story.description,
                    status: story.status,
                    priority: story.priority,
                    progress: story.progress,
                    assigned_to_user: story.assigned_user_id
                        ? { id: story.assigned_user_id, display_name: story.assigned_user_name }
                        : null,
                    planned_completion_date: story.planned_completion_date,
                    actual_completion_date: story.actual_completion_date,
                    risk_and_countermeasure: story.risk_and_countermeasure,
                    estimated_hours: story.estimated_hours,
                    tasks: tasksResult.rows.map((task: any) => ({
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        status: task.status,
                        priority: task.priority,
                        size: task.size,
                        progress: task.progress,
                        assigned_to_user: task.assigned_user_id
                            ? { id: task.assigned_user_id, display_name: task.assigned_user_name }
                            : null,
                        risk_and_countermeasure: task.risk_and_countermeasure,
                        estimated_hours: task.estimated_hours
                    }))
                });
            }

            // Calculate completion rate
            const totalStories = stories.length;
            const completedStories = stories.filter((s: any) => s.status === 'completed').length;
            const completion_rate = totalStories > 0
                ? Math.round((completedStories / totalStories) * 100)
                : 0;

            projects.push({
                id: project.id,
                name: project.name,
                department_name: project.department_name,
                project_type_name: project.project_type_name,
                stories,
                completion_rate
            });
        }

        // 4. Get Next Sprint Info
        const nextSprintQuery = `
            SELECT id, name, start_date
            FROM sprints
            WHERE start_date > (SELECT start_date FROM sprints WHERE id = $1)
                AND status IN ('planned', 'current')
            ORDER BY start_date ASC
            LIMIT 1
        `;
        const nextSprintResult = await pool.query(nextSprintQuery, [sprintId]);

        let next_sprint: any = { id: null, name: null, planned_stories: [] };
        if (nextSprintResult.rows.length > 0) {
            const nextSprintData = nextSprintResult.rows[0];
            const nextStoriesQuery = `
                SELECT s.id, s.title, ss.planned_completion_date
                FROM stories s
                JOIN sprint_stories ss ON s.id = ss.story_id
                WHERE ss.sprint_id = $1
                ${userId ? 'AND ss.assigned_to = $2' : ''}
                ORDER BY ss.planned_completion_date NULLS LAST, s.id
            `;
            const nextStoriesParams = userId ? [nextSprintData.id, userId] : [nextSprintData.id];
            const nextStoriesResult = await pool.query(nextStoriesQuery, nextStoriesParams);

            next_sprint = {
                id: nextSprintData.id,
                name: nextSprintData.name,
                planned_stories: nextStoriesResult.rows
            };
        }

        // 5. Return Response
        res.json({
            sprint,
            projects,
            next_sprint
        });

    } catch (error) {
        console.error('Error fetching weekly report data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ============================================================
// Helper Functions for Excel Generation
// ============================================================

function getISOWeek(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function getWeekNumber(dateString: string): number {
    const date = new Date(dateString);
    return getISOWeek(date);
}

function sanitizeForExcel(text: string): string {
    if (!text) return '';
    if (text.startsWith('=') || text.startsWith('+') || text.startsWith('-') || text.startsWith('@')) {
        text = "'" + text;
    }
    return text;
}

function generateWeeklySummary(story: any): string {
    if (story.status !== 'completed' && story.tasks.every((t: any) => t.status !== 'completed')) {
        return '未完成';
    }
    const completedTasks = story.tasks.filter((t: any) => t.status === 'completed');
    if (completedTasks.length === 0) {
        return `【${story.title}】: 进行中`;
    }
    const taskTitles = completedTasks.map((t: any) => t.title).join(', ');
    return `【${story.title}】: ${taskTitles}`;
}

function generateRiskSummary(stories: any[]): string {
    const risks: string[] = [];
    const seen = new Set<string>();
    for (const story of stories) {
        if (story.risk_and_countermeasure && story.risk_and_countermeasure.trim()) {
            const text = story.risk_and_countermeasure.trim();
            if (!seen.has(text)) {
                risks.push(`【${story.title}】: ${text}`);
                seen.add(text);
            }
        }
        for (const task of story.tasks) {
            if (task.risk_and_countermeasure && task.risk_and_countermeasure.trim()) {
                const text = task.risk_and_countermeasure.trim();
                if (!seen.has(text)) {
                    risks.push(`【${story.title} - ${task.title}】: ${text}`);
                    seen.add(text);
                }
            }
        }
    }
    return risks.length > 0 ? risks.join('\\n\\n') : '无';
}

function generateNextWeekPlan(nextSprint: any): string {
    if (!nextSprint.id || nextSprint.planned_stories.length === 0) {
        return '暂无计划';
    }
    const stories = nextSprint.planned_stories
        .map((s: any) => {
            const dateText = s.planned_completion_date ? ` (${s.planned_completion_date})` : '';
            return `• ${s.title}${dateText}`;
        })
        .join('\\n');
    return stories || '暂无计划';
}

// ============================================================
// POST /api/reports/sprint/:sprintId/export
// Export weekly report as Excel file
// ============================================================
router.post('/sprint/:sprintId/export', async (req: Request, res: Response) => {
    const { sprintId } = req.params;
    const { userId, reportType } = req.body;

    try {
        const { sprint, projects, next_sprint } = await fetchWeeklyReportData(sprintId, userId);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('周报');
        worksheet.columns = [
            { width: 15 }, { width: 30 }, { width: 25 },
            { width: 12 }, { width: 25 }, { width: 30 }
        ];
        const weekNum = getWeekNumber(sprint.start_date);
        const nextWeekNum = next_sprint.id ? weekNum + 1 : weekNum + 1;
        const headerRow = worksheet.addRow([
            '项目名称',
            '项目目标及关键节点计划（关键节点）',
            `S${weekNum}周总结`,
            '完成率',
            `S${nextWeekNum}周计划`,
            '风险及应对'
        ]);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });
        headerRow.height = 30;
        let currentRow = 2;
        for (const project of projects) {
            if (project.stories.length === 0) continue;
            const startRow = currentRow;
            worksheet.mergeCells(`A${startRow}:A${startRow + project.stories.length - 1}`);
            const projectCell = worksheet.getCell(`A${startRow}`);
            projectCell.value = sanitizeForExcel(project.name);
            projectCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            projectCell.font = { bold: true };
            projectCell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            for (let i = 0; i < project.stories.length; i++) {
                const story = project.stories[i];
                const row = startRow + i;
                const storyCell = worksheet.getCell(`B${row}`);
                storyCell.value = story.planned_completion_date
                    ? `${sanitizeForExcel(story.title)}\\n(计划: ${story.planned_completion_date})`
                    : sanitizeForExcel(story.title);
                storyCell.alignment = { vertical: 'top', wrapText: true };
                storyCell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                const summaryCell = worksheet.getCell(`C${row}`);
                summaryCell.value = sanitizeForExcel(generateWeeklySummary(story));
                summaryCell.alignment = { vertical: 'top', wrapText: true };
                summaryCell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            }
            worksheet.mergeCells(`D${startRow}:D${startRow + project.stories.length - 1}`);
            const rateCell = worksheet.getCell(`D${startRow}`);
            rateCell.value = `${project.completion_rate}%`;
            rateCell.alignment = { vertical: 'middle', horizontal: 'center' };
            rateCell.font = {
                bold: true,
                color: { argb: project.completion_rate >= 80 ? 'FF008000' : 'FFFF0000' }
            };
            rateCell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            worksheet.mergeCells(`E${startRow}:E${startRow + project.stories.length - 1}`);
            const planCell = worksheet.getCell(`E${startRow}`);
            planCell.value = sanitizeForExcel(generateNextWeekPlan(next_sprint));
            planCell.alignment = { vertical: 'top', wrapText: true };
            planCell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            worksheet.mergeCells(`F${startRow}:F${startRow + project.stories.length - 1}`);
            const riskCell = worksheet.getCell(`F${startRow}`);
            riskCell.value = sanitizeForExcel(generateRiskSummary(project.stories));
            riskCell.alignment = { vertical: 'top', wrapText: true };
            riskCell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            currentRow += project.stories.length;
        }
        const filename = reportType === 'personal'
            ? `weekly-report-sprint-${sprintId}-personal-${new Date().toISOString().split('T')[0]}.xlsx`
            : `weekly-report-sprint-${sprintId}-summary-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).json({ message: 'Failed to generate Excel report' });
    }
});

// ============================================================
// Helper function to fetch weekly report data (reusable)
// ============================================================
async function fetchWeeklyReportData(sprintId: string, userId?: number | string) {
    const sprintResult = await pool.query(
        'SELECT id, name, start_date, end_date, status FROM sprints WHERE id = $1',
        [sprintId]
    );
    if (sprintResult.rows.length === 0) {
        throw new Error('Sprint not found');
    }
    const sprint = sprintResult.rows[0];
    const projectsQuery = `
        SELECT DISTINCT p.id, p.name, d.name AS department_name, pt.name AS project_type_name
        FROM projects p
        LEFT JOIN departments d ON p.department_id = d.id
        LEFT JOIN project_types pt ON p.project_type_id = pt.id
        WHERE p.id IN (
            SELECT DISTINCT sp.project_id FROM sprint_projects sp WHERE sp.sprint_id = $1
            UNION
            SELECT DISTINCT ss.project_id FROM sprint_stories ss WHERE ss.sprint_id = $1
            UNION
            SELECT DISTINCT st.project_id FROM sprint_tasks st WHERE st.sprint_id = $1
        )
        ORDER BY p.id
    `;
    const projectsResult = await pool.query(projectsQuery, [sprintId]);
    const projects = [];
    for (const project of projectsResult.rows) {
        const storiesQuery = `
            SELECT
                s.id, s.title, s.description,
                ss.status, ss.progress, ss.priority,
                ss.planned_completion_date, ss.actual_completion_date,
                ss.risk_and_countermeasure, ss.estimated_hours,
                u.id AS assigned_user_id, u.display_name AS assigned_user_name
            FROM stories s
            JOIN sprint_stories ss ON s.id = ss.story_id
            LEFT JOIN users u ON ss.assigned_to = u.id
            WHERE ss.sprint_id = $1 AND ss.project_id = $2
            ${userId ? 'AND ss.assigned_to = $3' : ''}
            ORDER BY
                CASE ss.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
                s.id
        `;
        const storiesParams = userId ? [sprintId, project.id, userId] : [sprintId, project.id];
        const storiesResult = await pool.query(storiesQuery, storiesParams);
        const stories = [];
        for (const story of storiesResult.rows) {
            const tasksQuery = `
                SELECT
                    t.id, t.title, t.description,
                    st.status, st.progress, st.priority, st.size,
                    st.risk_and_countermeasure, st.estimated_hours,
                    u.id AS assigned_user_id, u.display_name AS assigned_user_name
                FROM tasks t
                JOIN sprint_tasks st ON t.id = st.task_id
                LEFT JOIN users u ON st.assigned_to = u.id
                WHERE st.sprint_id = $1 AND st.story_id = $2
                ${userId ? 'AND st.assigned_to = $3' : ''}
                ORDER BY t.id
            `;
            const tasksParams = userId ? [sprintId, story.id, userId] : [sprintId, story.id];
            const tasksResult = await pool.query(tasksQuery, tasksParams);
            stories.push({
                id: story.id,
                title: story.title,
                description: story.description,
                status: story.status,
                priority: story.priority,
                progress: story.progress,
                assigned_to_user: story.assigned_user_id
                    ? { id: story.assigned_user_id, display_name: story.assigned_user_name }
                    : null,
                planned_completion_date: story.planned_completion_date,
                actual_completion_date: story.actual_completion_date,
                risk_and_countermeasure: story.risk_and_countermeasure,
                estimated_hours: story.estimated_hours,
                tasks: tasksResult.rows.map((task: any) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    size: task.size,
                    progress: task.progress,
                    assigned_to_user: task.assigned_user_id
                        ? { id: task.assigned_user_id, display_name: task.assigned_user_name }
                        : null,
                    risk_and_countermeasure: task.risk_and_countermeasure,
                    estimated_hours: task.estimated_hours
                }))
            });
        }
        const totalStories = stories.length;
        const completedStories = stories.filter((s: any) => s.status === 'completed').length;
        const completion_rate = totalStories > 0
            ? Math.round((completedStories / totalStories) * 100)
            : 0;
        projects.push({
            id: project.id,
            name: project.name,
            department_name: project.department_name,
            project_type_name: project.project_type_name,
            stories,
            completion_rate
        });
    }
    const nextSprintQuery = `
        SELECT id, name, start_date
        FROM sprints
        WHERE start_date > (SELECT start_date FROM sprints WHERE id = $1)
            AND status IN ('planned', 'current')
        ORDER BY start_date ASC
        LIMIT 1
    `;
    const nextSprintResult = await pool.query(nextSprintQuery, [sprintId]);
    let next_sprint: any = { id: null, name: null, planned_stories: [] };
    if (nextSprintResult.rows.length > 0) {
        const nextSprintData = nextSprintResult.rows[0];
        const nextStoriesQuery = `
            SELECT s.id, s.title, ss.planned_completion_date
            FROM stories s
            JOIN sprint_stories ss ON s.id = ss.story_id
            WHERE ss.sprint_id = $1
            ${userId ? 'AND ss.assigned_to = $2' : ''}
            ORDER BY ss.planned_completion_date NULLS LAST, s.id
        `;
        const nextStoriesParams = userId ? [nextSprintData.id, userId] : [nextSprintData.id];
        const nextStoriesResult = await pool.query(nextStoriesQuery, nextStoriesParams);
        next_sprint = {
            id: nextSprintData.id,
            name: nextSprintData.name,
            planned_stories: nextStoriesResult.rows
        };
    }
    return { sprint, projects, next_sprint };
}

// ============================================================
// GET /api/reports/weekly
// Generate Excel weekly report for a sprint
// ============================================================
router.get('/weekly', async (req: Request, res: Response) => {
    const { sprintId, reportType } = req.query;

    if (!sprintId) {
        return res.status(400).json({ message: 'sprintId is required' });
    }

    try {
        // 1. Get current sprint info
        const currentSprintResult = await pool.query(
            'SELECT id, sprint_number, start_date, end_date FROM sprints WHERE id = $1',
            [sprintId]
        );

        if (currentSprintResult.rows.length === 0) {
            return res.status(404).json({ message: 'Sprint not found' });
        }

        const currentSprint = currentSprintResult.rows[0];
        const currentSprintNum = parseInt(sprintId as string);

        // 2. Get previous and next sprint info (only if id > 0 for previous)
        let previousSprint = null;
        let nextSprint = null;

        if (currentSprintNum > 0) {
            const prevResult = await pool.query(
                'SELECT id, sprint_number FROM sprints WHERE id = $1',
                [currentSprintNum - 1]
            );
            if (prevResult.rows.length > 0) {
                previousSprint = prevResult.rows[0];
            }
        }

        const nextResult = await pool.query(
            'SELECT id, sprint_number FROM sprints WHERE id = $1',
            [currentSprintNum + 1]
        );
        if (nextResult.rows.length > 0) {
            nextSprint = nextResult.rows[0];
        }

        // 3. Get projects with stories in current sprint
        const projectsQuery = `
            SELECT DISTINCT
                p.id,
                p.software_name AS name,
                p.source,
                p.description,
                pt.name AS project_type,
                d.name AS department,
                u.display_name AS owner_name
            FROM projects p
            LEFT JOIN project_types pt ON p.project_type_id = pt.id
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN users u ON p.owner_id = u.id
            WHERE p.id IN (
                SELECT DISTINCT project_id FROM sprint_stories WHERE sprint_id = $1
            )
            ORDER BY p.id
        `;

        const projectsResult = await pool.query(projectsQuery, [sprintId]);
        const projects = [];

        // 4. For each project, get stories with multi-sprint data
        for (const project of projectsResult.rows) {
            // Get stories in current sprint
            const storiesQuery = `
                SELECT
                    s.id,
                    s.title,
                    s.description,
                    ss.status,
                    ss.progress,
                    ss.priority,
                    ss.planned_completion_date,
                    ss.actual_completion_date,
                    ss.risk_and_countermeasure,
                    u.display_name AS assigned_user_name
                FROM stories s
                JOIN sprint_stories ss ON s.id = ss.story_id
                LEFT JOIN users u ON ss.assigned_to = u.id
                WHERE ss.sprint_id = $1 AND ss.project_id = $2
                ORDER BY s.id
            `;

            const storiesResult = await pool.query(storiesQuery, [sprintId, project.id]);
            const stories = [];

            for (const story of storiesResult.rows) {
                // Get story data from previous sprint if exists
                let prevStoryData = null;
                if (previousSprint) {
                    const prevQuery = await pool.query(`
                        SELECT status, progress, notes
                        FROM sprint_stories
                        WHERE sprint_id = $1 AND story_id = $2
                    `, [previousSprint.id, story.id]);

                    if (prevQuery.rows.length > 0) {
                        prevStoryData = prevQuery.rows[0];
                    }
                }

                // Get story data from next sprint if exists
                let nextStoryData = null;
                if (nextSprint) {
                    const nextQuery = await pool.query(`
                        SELECT status, planned_completion_date, notes
                        FROM sprint_stories
                        WHERE sprint_id = $1 AND story_id = $2
                    `, [nextSprint.id, story.id]);

                    if (nextQuery.rows.length > 0) {
                        nextStoryData = nextQuery.rows[0];
                    }
                }

                stories.push({
                    ...story,
                    prev_sprint_data: prevStoryData,
                    next_sprint_data: nextStoryData
                });
            }

            // Calculate completion rate
            const completedStories = stories.filter(s => s.status === 'completed').length;
            const completionRate = stories.length > 0
                ? Math.round((completedStories / stories.length) * 100)
                : 0;

            projects.push({
                ...project,
                stories,
                completion_rate: completionRate
            });
        }

        // 5. Generate Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('周报');

        // Set column widths
        worksheet.columns = [
            { width: 6 },   // A: 序号
            { width: 25 },  // B: 项目名称
            { width: 12 },  // C: 类型
            { width: 12 },  // D: 需求来源
            { width: 10 },  // E: 负责人
            { width: 30 },  // F: 关键节点计划
            { width: 40 },  // G: 本周总结
            { width: 8 },   // H: 完成率
            { width: 30 },  // I: 下周计划
            { width: 30 },  // J: 风险及应对
        ];

        // Add header row
        const headerRow = worksheet.addRow([
            '序号',
            '项目名称',
            '类型',
            '需求来源',
            '负责人',
            '关键节点计划',
            `${currentSprint.sprint_number}周总结`,
            '完成率',
            nextSprint ? `${nextSprint.sprint_number}周计划` : '下周计划',
            '风险及应对'
        ]);

        // Style header row
        headerRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // Yellow background for summary columns
            if (colNumber === 7) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFC000' }
                };
            } else {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD9E1F2' }
                };
            }
        });
        headerRow.height = 25;

        // Add data rows
        let rowNum = 1;
        let currentRow = 2;

        for (let projIdx = 0; projIdx < projects.length; projIdx++) {
            const project = projects[projIdx];

            if (project.stories.length === 0) continue;

            const startRow = currentRow;
            const rowCount = project.stories.length;

            // Alternating background colors
            const bgColor = projIdx % 2 === 0 ? 'FFE7F3FF' : 'FFE2EFDA';

            // Merge cells for project info
            worksheet.mergeCells(`A${startRow}:A${startRow + rowCount - 1}`);
            worksheet.mergeCells(`B${startRow}:B${startRow + rowCount - 1}`);
            worksheet.mergeCells(`C${startRow}:C${startRow + rowCount - 1}`);
            worksheet.mergeCells(`D${startRow}:D${startRow + rowCount - 1}`);
            worksheet.mergeCells(`H${startRow}:H${startRow + rowCount - 1}`);

            // Fill project info
            const seqCell = worksheet.getCell(`A${startRow}`);
            seqCell.value = rowNum++;
            seqCell.alignment = { vertical: 'middle', horizontal: 'center' };

            const nameCell = worksheet.getCell(`B${startRow}`);
            nameCell.value = project.name || '';
            nameCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Red
            nameCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

            const typeCell = worksheet.getCell(`C${startRow}`);
            typeCell.value = project.project_type || '';
            typeCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

            const sourceCell = worksheet.getCell(`D${startRow}`);
            sourceCell.value = project.source || '';
            sourceCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

            const rateCell = worksheet.getCell(`H${startRow}`);
            rateCell.value = `${project.completion_rate}%`;
            rateCell.alignment = { vertical: 'middle', horizontal: 'center' };
            rateCell.font = {
                bold: true,
                color: { argb: project.completion_rate >= 80 ? 'FF008000' : 'FFFF0000' }
            };

            // Fill story rows
            for (let i = 0; i < project.stories.length; i++) {
                const story = project.stories[i];
                const row = startRow + i;

                // E: 负责人
                const assigneeCell = worksheet.getCell(`E${row}`);
                assigneeCell.value = story.assigned_user_name || '';
                assigneeCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };

                // F: 关键节点计划
                const planCell = worksheet.getCell(`F${row}`);
                let planText = story.title;
                if (story.planned_completion_date) {
                    const date = new Date(story.planned_completion_date);
                    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                    planText += `\n计划: ${dateStr}`;
                }
                planCell.value = planText;
                planCell.alignment = { vertical: 'top', wrapText: true };

                // G: 本周总结
                const summaryCell = worksheet.getCell(`G${row}`);
                let summaryText = `【${story.title}】\n`;
                summaryText += `状态: ${story.status === 'completed' ? '已完成' : story.status === 'in_progress' ? '进行中' : '未开始'}\n`;
                summaryText += `进度: ${story.progress || 0}%`;
                if (story.description) {
                    summaryText += `\n说明: ${story.description}`;
                }
                summaryCell.value = summaryText;
                summaryCell.alignment = { vertical: 'top', wrapText: true };

                // I: 下周计划
                const nextPlanCell = worksheet.getCell(`I${row}`);
                if (story.next_sprint_data) {
                    nextPlanCell.value = `继续推进\n${story.title}`;
                } else {
                    nextPlanCell.value = '';
                }
                nextPlanCell.alignment = { vertical: 'top', wrapText: true };

                // J: 风险及应对
                const riskCell = worksheet.getCell(`J${row}`);
                riskCell.value = story.risk_and_countermeasure || '';
                riskCell.alignment = { vertical: 'top', wrapText: true };

                // Apply background color and borders to all cells in row
                for (let col = 1; col <= 10; col++) {
                    const cell = worksheet.getCell(row, col);
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: bgColor }
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            }

            currentRow += rowCount;
        }

        // Set response headers
        const filename = `weekly-report-${currentSprint.sprint_number}-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating weekly report:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
});

export default router;
