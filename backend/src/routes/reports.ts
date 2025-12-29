import express from 'express';
import pool from '../db/connection';
import ExcelJS from 'exceljs';

const router = express.Router();

router.get('/weekly', async (req, res) => {
    const { sprintId } = req.query;
    if (!sprintId) {
        return res.status(400).json({ message: 'Missing sprintId' });
    }

    try {
        // 1. Fetch Sprint Details
        const sprintRes = await pool.query('SELECT * FROM sprints WHERE id = $1', [sprintId]);
        if (sprintRes.rows.length === 0) {
            return res.status(404).json({ message: 'Sprint not found' });
        }
        const sprint = sprintRes.rows[0];

        // 2. Fetch Projects in Sprint
        // Since we don't have a "Sprint Projects" manager yet, we fetch projects that have stories/tasks in this sprint,
        // OR we can just fetch all active projects for now (simpler for this phase).
        // Let's go with the data-driven approach: fetch projects linked via stories/tasks.
        // Actually, for the "Flow Model", we should query `sprint_stories` and `sprint_tasks`.

        const dataQuery = `
            SELECT 
                p.software_name as project_name,
                d.name as department_name,
                s.title as story_title,
                t.title as task_title,
                t.description as task_desc,
                st.status,
                st.progress,
                u.display_name as assignee,
                st.notes,
                st.risk_and_countermeasure
            FROM sprint_tasks st
            JOIN tasks t ON st.task_id = t.id
            JOIN projects p ON st.project_id = p.id
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN stories s ON st.story_id = s.id
            LEFT JOIN users u ON st.assigned_to = u.id
            WHERE st.sprint_id = $1
            ORDER BY d.name, p.software_name, s.id, t.id
        `;

        const result = await pool.query(dataQuery, [sprintId]);
        const rows = result.rows;

        // 3. Create Excel Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Weekly Report');

        // Define Columns
        worksheet.columns = [
            { header: '部门', key: 'department', width: 15 },
            { header: '项目', key: 'project', width: 20 },
            { header: '需求/功能', key: 'story', width: 30 },
            { header: '任务内容', key: 'task', width: 40 },
            { header: '状态', key: 'status', width: 15 },
            { header: '进度', key: 'progress', width: 10 },
            { header: '负责人', key: 'assignee', width: 15 },
            { header: '备注/风险', key: 'notes', width: 30 },
        ];

        // Style Header Row
        worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' } // Primary Color (Indigo)
        };

        // Add Data
        rows.forEach(row => {
            worksheet.addRow({
                department: row.department_name || '-',
                project: row.project_name,
                story: row.story_title || '无关联需求',
                task: row.task_title || row.task_desc, // Fallback to desc if no title
                status: row.status,
                progress: `${row.progress}%`,
                assignee: row.assignee || '待定',
                notes: [row.notes, row.risk_and_countermeasure].filter(Boolean).join('; ')
            });
        });

        // Response Headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Weekly_Report_${sprint.sprint_number}.xlsx`);

        // Write to Response
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
