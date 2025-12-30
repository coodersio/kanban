# 周报系统实施方案 (Weekly Report System Implementation Plan)

**文档版本**: 1.0
**创建日期**: 2025-12-30
**项目**: KanBan Weekly Report System
**状态**: 待审核

---

## 目录 (Table of Contents)

1. [概述 (Overview)](#1-概述-overview)
2. [核心设计原则 (Core Design Principles)](#2-核心设计原则-core-design-principles)
3. [数据库架构变更 (Database Schema Changes)](#3-数据库架构变更-database-schema-changes)
4. [API 接口设计 (API Endpoint Design)](#4-api-接口设计-api-endpoint-design)
5. [前端界面更新 (Frontend UI Updates)](#5-前端界面更新-frontend-ui-updates)
6. [Excel 报表生成 (Excel Report Generation)](#6-excel-报表生成-excel-report-generation)
7. [数据流图 (Data Flow Diagrams)](#7-数据流图-data-flow-diagrams)
8. [边缘场景处理 (Edge Case Handling)](#8-边缘场景处理-edge-case-handling)
9. [实施时间表 (Implementation Timeline)](#9-实施时间表-implementation-timeline)
10. [测试计划 (Testing Plan)](#10-测试计划-testing-plan)
11. [风险缓解 (Risk Mitigation)](#11-风险缓解-risk-mitigation)

---

## 1. 概述 (Overview)

### 1.1 业务目标

实现基于现有 KanBan 系统的周报自动生成功能，替代现有的手工 Excel 填写流程。系统需要支持：

- **迭代数据汇总**: 自动从快照表聚合当前迭代的项目、Story、Task 数据
- **周总结自动生成**: 基于 Story 和 Task 的完成情况自动生成总结文本
- **风险管理**: 汇总 Story 和 Task 层面的风险和应对措施
- **Excel 导出**: 生成符合现有模板格式的 Excel 文件（包含样式、合并单元格等）
- **多用户支持**: 支持生成汇总报表（所有人）和个人报表（单个用户）

### 1.2 技术范围

**后端**:
- 数据库迁移脚本（PostgreSQL）
- 新增 API 接口（Express + TypeScript）
- ExcelJS 集成（生成 .xlsx 文件）

**前端**:
- Story/Task 表单增强（React + TypeScript）
- Sprint 管理页面导出功能
- UI 组件更新（shadcn/ui）

---

## 2. 核心设计原则 (Core Design Principles)

### 2.1 快照表优先 (Snapshot-First Architecture)

**原则**: 所有迭代管理数据都存在快照表中，引用表只是基础定义

```
Reference Tables (Global, Immutable)     Snapshot Tables (Iteration-Specific)
┌──────────────┐                         ┌──────────────────┐
│  stories     │                         │  sprint_stories  │
│  - id        │◄────────────────────────│  - sprint_id     │
│  - title     │  (Joined for display)   │  - story_id      │
│  - desc      │                         │  - status        │
│              │                         │  - assigned_to   │
│              │                         │  - progress      │
│              │                         │  - risk          │ ← NEW FIELDS HERE
│              │                         │  - planned_date  │
│              │                         │  - actual_date   │
│              │                         │  - est_hours     │
└──────────────┘                         └──────────────────┘
```

**影响**:
- ✅ 新字段添加到 `sprint_stories` 和 `sprint_tasks`，NOT `stories` 和 `tasks`
- ✅ Story 复用时，快照字段全部重置为初始值
- ✅ 修改 title/description 会影响所有迭代（这是预期行为）

### 2.2 完成率计算简化

**公式**: `完成率 = (已完成 Story 数 / 总 Story 数) * 100%`

不考虑工时加权，保持简单直观。

### 2.3 自动生成策略

**周总结 (S{N}周总结)**:
- 数据源: 当前迭代所有已完成的 Story 和 Task
- 格式: `【Story标题】: Task1, Task2, Task3`
- 排序: 按 Story 优先级排序（High → Medium → Low）

**风险及应对 (风险)**:
- 数据源: Story 和 Task 的 `risk_and_countermeasure` 字段
- 聚合逻辑: Story 级别风险 + 该 Story 下所有 Task 的风险
- 去重: 内容完全相同的风险只显示一次

**下周计划 (S{N+1}周计划)**:
- 数据源: 下一个迭代（按开始日期最近的 `planned` 或 `current` Sprint）
- 显示: 已分配到该迭代的 Story 列表
- 格式: `【Story标题】: 预计完成日期 YYYY-MM-DD`

---

## 3. 数据库架构变更 (Database Schema Changes)

### 3.1 迁移脚本

**文件**: `/backend/migrations/005_add_weekly_report_fields.sql`

```sql
-- ============================================================
-- Migration 005: Add Weekly Report Fields
-- Description: Add fields required for weekly report generation
-- Date: 2025-12-30
-- ============================================================

BEGIN;

-- ============================================================
-- 1. sprint_stories: Add iteration-specific planning fields
-- ============================================================

-- Planned completion date (用户填写的计划完成日期)
ALTER TABLE sprint_stories
ADD COLUMN IF NOT EXISTS planned_completion_date DATE;

COMMENT ON COLUMN sprint_stories.planned_completion_date IS '计划完成日期 (用户在创建/编辑 Story 时填写)';

-- Actual completion date (系统自动填写，当 status 变为 'completed' 时)
ALTER TABLE sprint_stories
ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMP;

COMMENT ON COLUMN sprint_stories.actual_completion_date IS '实际完成日期 (当 status → completed 时自动设置为 NOW())';

-- Risk and countermeasure (风险及应对措施)
ALTER TABLE sprint_stories
ADD COLUMN IF NOT EXISTS risk_and_countermeasure TEXT;

COMMENT ON COLUMN sprint_stories.risk_and_countermeasure IS '风险及应对措施 (Story 层面的风险描述)';

-- Estimated hours (预估工时，小时为单位)
ALTER TABLE sprint_stories
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,2);

COMMENT ON COLUMN sprint_stories.estimated_hours IS '预估工时 (小时)';

-- ============================================================
-- 2. sprint_tasks: Add estimated hours
-- ============================================================

-- Estimated hours for tasks
ALTER TABLE sprint_tasks
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,2);

COMMENT ON COLUMN sprint_tasks.estimated_hours IS '任务预估工时 (小时)';

-- Note: risk_and_countermeasure already exists in sprint_tasks (added in previous migrations)

-- ============================================================
-- 3. Create index for performance (optional but recommended)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sprint_stories_planned_date
ON sprint_stories(planned_completion_date);

CREATE INDEX IF NOT EXISTS idx_sprint_stories_actual_date
ON sprint_stories(actual_completion_date);

COMMIT;
```

### 3.2 字段说明

| 表名 | 字段名 | 类型 | 必填 | 说明 | 自动填充 |
|------|--------|------|------|------|----------|
| sprint_stories | planned_completion_date | DATE | 是 | 计划完成日期 | 否，用户输入 |
| sprint_stories | actual_completion_date | TIMESTAMP | 否 | 实际完成日期 | 是，status → completed 时 |
| sprint_stories | risk_and_countermeasure | TEXT | 否 | 风险及应对 | 否，用户输入 |
| sprint_stories | estimated_hours | NUMERIC(6,2) | 否 | 预估工时（小时） | 否，用户输入 |
| sprint_tasks | estimated_hours | NUMERIC(6,2) | 否 | 任务预估工时 | 否，用户输入 |

### 3.3 现有数据处理

**策略**: 保持现有记录的新字段为 `NULL`

**理由**:
- 不做数据回填，避免引入不准确的历史数据
- 前端和 Excel 生成逻辑需要处理 `NULL` 值（显示为 "未设置" 或 "-"）

---

## 4. API 接口设计 (API Endpoint Design)

### 4.1 获取周报数据

**Endpoint**: `GET /api/reports/sprint/:sprintId/data`

**Query Parameters**:
- `userId` (optional): 如果提供，只返回该用户的数据；否则返回所有数据

**Response Structure**:

```typescript
interface WeeklyReportData {
  sprint: {
    id: number;
    name: string;
    start_date: string; // ISO 8601
    end_date: string;
    status: 'planned' | 'current' | 'archived';
  };
  projects: Array<{
    id: number;
    name: string;
    department_name: string;
    project_type_name: string;
    stories: Array<{
      id: number;
      title: string;
      description: string;
      status: 'not_started' | 'in_progress' | 'completed';
      priority: 'low' | 'medium' | 'high';
      progress: number;
      assigned_to_user: { id: number; display_name: string } | null;
      planned_completion_date: string | null; // YYYY-MM-DD
      actual_completion_date: string | null; // ISO 8601
      risk_and_countermeasure: string | null;
      estimated_hours: number | null;
      tasks: Array<{
        id: number;
        title: string;
        description: string;
        status: 'not_started' | 'in_progress' | 'completed';
        priority: 'Must' | 'Should' | 'Could';
        size: 'Small' | 'Medium' | 'Large';
        progress: number;
        assigned_to_user: { id: number; display_name: string } | null;
        risk_and_countermeasure: string | null;
        estimated_hours: number | null;
      }>;
    }>;
    completion_rate: number; // 0-100
  }>;
  next_sprint: {
    id: number | null;
    name: string | null;
    planned_stories: Array<{
      id: number;
      title: string;
      planned_completion_date: string | null;
    }>;
  };
}
```

**Implementation** (`/backend/src/routes/reports.ts`):

```typescript
import express from 'express';
import pool from '../config/database';

const router = express.Router();

router.get('/sprint/:sprintId/data', async (req, res) => {
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
          tasks: tasksResult.rows.map(task => ({
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
      const completedStories = stories.filter(s => s.status === 'completed').length;
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

    let next_sprint = { id: null, name: null, planned_stories: [] };
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

export default router;
```

### 4.2 导出 Excel

**Endpoint**: `POST /api/reports/sprint/:sprintId/export`

**Request Body**:
```typescript
{
  userId?: number; // Optional, for personal reports
  reportType: 'summary' | 'personal'; // 汇总 or 个人
}
```

**Response**:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="weekly-report-sprint-{id}-{date}.xlsx"`

**Implementation** (详见 [6. Excel 报表生成](#6-excel-报表生成-excel-report-generation))

---

## 5. 前端界面更新 (Frontend UI Updates)

### 5.1 StoryDetailsDrawer 增强

**文件**: `/frontend/src/pages/components/StoryDetailsDrawer.tsx`

**新增字段**:

```typescript
// Add to component state (around line 30-38)
const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);
const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);
const [riskCountermeasure, setRiskCountermeasure] = useState('');

// Update useEffect to load new fields (around line 50-62)
useEffect(() => {
  if (task) {
    // ... existing fields ...
    setPlannedDate(task.planned_completion_date ? new Date(task.planned_completion_date) : undefined);
    setEstimatedHours(task.estimated_hours || undefined);
    setRiskCountermeasure(task.risk_and_countermeasure || '');
  }
}, [task, open]);

// Update handleSave (around line 64-81)
const handleSave = () => {
  if (!task) return;
  onSave({
    storyId: task.id,
    sprintId,
    projectId,
    title,
    description,
    status,
    assignedTo,
    planned_completion_date: plannedDate?.toISOString().split('T')[0] || null,
    estimated_hours: estimatedHours || null,
    risk_and_countermeasure: riskCountermeasure
  });
  onClose();
};
```

**UI 组件添加** (在 Description 之后):

```tsx
{/* Planned Completion Date */}
<div className="space-y-1.5">
  <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
    <CalendarIcon className="w-3.5 h-3.5" /> 计划完成日期 *
  </Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant={"ghost"}
        className={cn(
          "w-full justify-start text-left font-medium h-9 px-2 -ml-2 hover:bg-secondary/50",
          !plannedDate && "text-muted-foreground"
        )}
        disabled={!canEdit}
      >
        {plannedDate ? format(plannedDate, "PPP", { locale: zhCN }) : <span>设置计划完成日期</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={plannedDate}
        onSelect={setPlannedDate}
        initialFocus
        locale={zhCN}
      />
    </PopoverContent>
  </Popover>
</div>

{/* Estimated Hours */}
<div className="space-y-1.5">
  <Label htmlFor="estimated-hours" className="text-xs font-normal text-muted-foreground flex items-center gap-2">
    <Clock className="w-3.5 h-3.5" /> 预估工时（小时）
  </Label>
  <Input
    id="estimated-hours"
    type="number"
    min="0"
    step="0.5"
    value={estimatedHours || ''}
    onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
    placeholder="例如: 8.5"
    disabled={!canEdit}
    className="h-9"
  />
</div>

{/* Risk and Countermeasure */}
<div className="space-y-2 pt-2 border-t">
  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
    <AlertTriangle className="w-4 h-4 text-orange-500" />
    风险及应对措施
  </Label>
  <Textarea
    value={riskCountermeasure}
    onChange={(e) => setRiskCountermeasure(e.target.value)}
    disabled={!canEdit}
    placeholder="描述潜在风险和应对措施..."
    className="min-h-[100px] border-none bg-secondary/20 focus:bg-secondary/40 focus:ring-0 resize-none p-4 text-sm"
  />
</div>
```

**Import 添加**:
```typescript
import { Clock, AlertTriangle } from 'lucide-react';
```

### 5.2 TaskDetailsDrawer 增强

**文件**: `/frontend/src/pages/components/TaskDetailsDrawer.tsx`

**新增字段** (类似 Story):

```typescript
const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);

// In useEffect
setEstimatedHours(task.estimated_hours || undefined);

// In handleSave
estimated_hours: estimatedHours || null
```

**UI 组件** (在 Progress 之后):

```tsx
{/* Estimated Hours */}
<div className="space-y-1.5">
  <Label htmlFor="task-estimated-hours" className="text-xs font-normal text-muted-foreground flex items-center gap-2">
    <Clock className="w-3.5 h-3.5" /> 预估工时（小时）
  </Label>
  <Input
    id="task-estimated-hours"
    type="number"
    min="0"
    step="0.5"
    value={estimatedHours || ''}
    onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
    placeholder="例如: 4"
    disabled={!canEdit}
    className="h-9"
  />
</div>
```

**注意**: Task 的 `risk_and_countermeasure` 字段已存在，无需再添加。

### 5.3 后端自动填充 actual_completion_date

**文件**: `/backend/src/routes/workbench.ts`

**修改 POST /story/status** (around line 350):

```typescript
router.post('/story/status', async (req, res) => {
  const { sprintId, storyId, status, projectId } = req.body;
  // ... permission checks ...

  const check = await pool.query(
    'SELECT id, status FROM sprint_stories WHERE sprint_id = $1 AND story_id = $2',
    [sprintId, storyId]
  );

  if (check.rows.length > 0) {
    const currentStatus = check.rows[0].status;

    // Auto-set actual_completion_date when status changes to 'completed'
    const updateQuery = status === 'completed' && currentStatus !== 'completed'
      ? 'UPDATE sprint_stories SET status = $1, actual_completion_date = NOW(), updated_at = NOW() WHERE sprint_id = $2 AND story_id = $3'
      : 'UPDATE sprint_stories SET status = $1, updated_at = NOW() WHERE sprint_id = $2 AND story_id = $3';

    await pool.query(updateQuery, [status, sprintId, storyId]);
  } else {
    // Insert new snapshot
    const insertQuery = status === 'completed'
      ? 'INSERT INTO sprint_stories (sprint_id, story_id, project_id, status, actual_completion_date) VALUES ($1, $2, $3, $4, NOW())'
      : 'INSERT INTO sprint_stories (sprint_id, story_id, project_id, status) VALUES ($1, $2, $3, $4)';

    await pool.query(insertQuery, [sprintId, storyId, projectId, status]);
  }

  res.json({ success: true });
});
```

**修改 POST /story/update** (around line 550):

```typescript
router.post('/story/update', async (req, res) => {
  const { storyId, sprintId, title, description, status, assignedTo, planned_completion_date, estimated_hours, risk_and_countermeasure } = req.body;
  // ... permission checks ...

  // Check current status
  const checkStatus = await client.query(
    'SELECT status FROM sprint_stories WHERE story_id = $1 AND sprint_id = $2',
    [storyId, sprintId]
  );

  const currentStatus = checkStatus.rows[0]?.status;
  const shouldSetActualDate = status === 'completed' && currentStatus !== 'completed';

  // Update Snapshot
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

  // ... rest of the logic ...
});
```

### 5.4 SprintsPage 导出按钮

**文件**: `/frontend/src/pages/SprintsPage.tsx`

**添加导出功能** (在表格操作列):

```tsx
// Add import
import { Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Add handler functions (after handleActivate)
const handleExportSummary = async (sprintId: number) => {
  try {
    const res = await fetch(`/api/reports/sprint/${sprintId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType: 'summary' })
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-report-sprint-${sprintId}-summary-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      alert('导出失败，请重试');
    }
  } catch (error) {
    console.error('Export error:', error);
    alert('导出失败，请重试');
  }
};

const handleExportPersonal = async (sprintId: number) => {
  try {
    const userRes = await fetch('/api/auth/me');
    const userData = await userRes.json();

    const res = await fetch(`/api/reports/sprint/${sprintId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType: 'personal',
        userId: userData.id
      })
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-report-sprint-${sprintId}-personal-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      alert('导出失败，请重试');
    }
  } catch (error) {
    console.error('Export error:', error);
    alert('导出失败，请重试');
  }
};

// Update table cell actions (around line 190-220)
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-1">
    {/* Export Dropdown */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
        >
          <Download className="w-3 h-3" />
          导出
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExportSummary(sprint.id)}>
          汇总周报
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportPersonal(sprint.id)}>
          个人周报
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Existing buttons: Activate, Edit, Delete */}
    {sprint.status !== 'active' && (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => handleActivate(sprint.id)}
      >
        <Play className="w-3 h-3" />
        激活
      </Button>
    )}
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      onClick={() => openEdit(sprint)}
    >
      <Pencil className="w-4 h-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={() => handleDelete(sprint.id)}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  </div>
</TableCell>
```

---

## 6. Excel 报表生成 (Excel Report Generation)

### 6.1 依赖安装

```bash
cd backend
npm install exceljs
npm install --save-dev @types/exceljs
```

### 6.2 实现逻辑

**文件**: `/backend/src/routes/reports.ts` (继续在上面的文件中添加)

```typescript
import ExcelJS from 'exceljs';

// ... existing GET /sprint/:sprintId/data endpoint ...

router.post('/sprint/:sprintId/export', async (req, res) => {
  const { sprintId } = req.params;
  const { userId, reportType } = req.body;

  try {
    // 1. Fetch data using the same logic as GET endpoint
    const dataResponse = await fetchWeeklyReportData(sprintId, userId);
    const { sprint, projects, next_sprint } = dataResponse;

    // 2. Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('周报');

    // Set column widths
    worksheet.columns = [
      { width: 15 }, // A: 项目名称
      { width: 30 }, // B: 项目目标及关键节点计划
      { width: 25 }, // C: S{N}周总结
      { width: 12 }, // D: 完成率
      { width: 25 }, // E: S{N+1}周计划
      { width: 30 }, // F: 风险及应对
    ];

    // 3. Header Row
    const headerRow = worksheet.addRow([
      '项目名称',
      '项目目标及关键节点计划（关键节点）',
      `S${getWeekNumber(sprint.start_date)}周总结`,
      '完成率',
      `S${getWeekNumber(next_sprint.id ? getNextWeekStartDate(sprint.end_date) : sprint.end_date)}周计划`,
      '风险及应对'
    ]);

    // Style header
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' } // Light blue
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 30;

    // 4. Data Rows
    let currentRow = 2;
    for (const project of projects) {
      const startRow = currentRow;

      // Column A: Project Name (merged cell for all stories)
      worksheet.mergeCells(`A${startRow}:A${startRow + project.stories.length - 1}`);
      const projectCell = worksheet.getCell(`A${startRow}`);
      projectCell.value = project.name;
      projectCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      projectCell.font = { bold: true };
      projectCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Column B: Stories (one per row)
      for (let i = 0; i < project.stories.length; i++) {
        const story = project.stories[i];
        const row = startRow + i;

        // B: Story Title + Planned Date
        const storyCell = worksheet.getCell(`B${row}`);
        storyCell.value = story.planned_completion_date
          ? `${story.title}\n(计划: ${story.planned_completion_date})`
          : story.title;
        storyCell.alignment = { vertical: 'top', wrapText: true };
        storyCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // C: Weekly Summary (auto-generated)
        const summaryCell = worksheet.getCell(`C${row}`);
        summaryCell.value = generateWeeklySummary(story);
        summaryCell.alignment = { vertical: 'top', wrapText: true };
        summaryCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }

      // Column D: Completion Rate (merged cell)
      worksheet.mergeCells(`D${startRow}:D${startRow + project.stories.length - 1}`);
      const rateCell = worksheet.getCell(`D${startRow}`);
      rateCell.value = `${project.completion_rate}%`;
      rateCell.alignment = { vertical: 'middle', horizontal: 'center' };
      rateCell.font = { bold: true, color: { argb: project.completion_rate >= 80 ? 'FF008000' : 'FFFF0000' } };
      rateCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Column E: Next Week Plan (merged cell)
      worksheet.mergeCells(`E${startRow}:E${startRow + project.stories.length - 1}`);
      const planCell = worksheet.getCell(`E${startRow}`);
      planCell.value = generateNextWeekPlan(next_sprint, project.id);
      planCell.alignment = { vertical: 'top', wrapText: true };
      planCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Column F: Risks (merged cell)
      worksheet.mergeCells(`F${startRow}:F${startRow + project.stories.length - 1}`);
      const riskCell = worksheet.getCell(`F${startRow}`);
      riskCell.value = generateRiskSummary(project.stories);
      riskCell.alignment = { vertical: 'top', wrapText: true };
      riskCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      currentRow += project.stories.length;
    }

    // 5. Auto-fit row heights
    worksheet.eachRow((row) => {
      row.height = undefined; // Auto-calculate based on content
    });

    // 6. Send as download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="weekly-report-sprint-${sprintId}-${new Date().toISOString().split('T')[0]}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ message: 'Failed to generate Excel report' });
  }
});

// ============================================================
// Helper Functions
// ============================================================

function getWeekNumber(dateString: string): number {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return week;
}

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

function getNextWeekStartDate(endDateString: string): string {
  const date = new Date(endDateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
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
    // Story-level risks
    if (story.risk_and_countermeasure && story.risk_and_countermeasure.trim()) {
      const text = story.risk_and_countermeasure.trim();
      if (!seen.has(text)) {
        risks.push(`【${story.title}】: ${text}`);
        seen.add(text);
      }
    }

    // Task-level risks
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

  return risks.length > 0 ? risks.join('\n\n') : '无';
}

function generateNextWeekPlan(nextSprint: any, projectId: number): string {
  if (!nextSprint.id || nextSprint.planned_stories.length === 0) {
    return '暂无计划';
  }

  // Filter stories for this project (if data includes project_id in planned_stories)
  const stories = nextSprint.planned_stories
    .map((s: any) => {
      const dateText = s.planned_completion_date ? ` (${s.planned_completion_date})` : '';
      return `• ${s.title}${dateText}`;
    })
    .join('\n');

  return stories || '暂无计划';
}

async function fetchWeeklyReportData(sprintId: string, userId?: number) {
  // Re-use the logic from GET /sprint/:sprintId/data
  // (Extract into shared function to avoid duplication)
  // ... [Same code as GET endpoint] ...
}

export default router;
```

### 6.3 注册路由

**文件**: `/backend/src/index.ts`

```typescript
import reportsRouter from './routes/reports';

// ... existing imports ...

app.use('/api/reports', reportsRouter);
```

---

## 7. 数据流图 (Data Flow Diagrams)

### 7.1 Story 创建/编辑流程

```
┌─────────────┐
│   用户操作   │ 填写 Story 表单（包含新字段）
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  StoryDetailsDrawer                         │
│  - title, description                       │
│  - planned_completion_date (NEW)            │
│  - estimated_hours (NEW)                    │
│  - risk_and_countermeasure (NEW)            │
│  - assigned_to, status, priority            │
└──────┬──────────────────────────────────────┘
       │ onSave()
       ▼
┌─────────────────────────────────────────────┐
│  POST /api/workbench/story/update           │
│  Body: {                                    │
│    storyId, sprintId, projectId,            │
│    title, description,                      │
│    planned_completion_date,                 │
│    estimated_hours,                         │
│    risk_and_countermeasure,                 │
│    status, assignedTo                       │
│  }                                          │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Backend Logic:                             │
│  1. Update stories table (title, desc)      │
│  2. UPSERT sprint_stories (all new fields)  │
│  3. If status → 'completed':                │
│     SET actual_completion_date = NOW()      │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Database:                                  │
│  - stories: {id, title, description}        │
│  - sprint_stories: {                        │
│      sprint_id, story_id,                   │
│      status, assigned_to,                   │
│      planned_completion_date,               │
│      actual_completion_date,                │
│      risk_and_countermeasure,               │
│      estimated_hours                        │
│    }                                        │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Response: { success: true }                │
└─────────────────────────────────────────────┘
```

### 7.2 Excel 导出流程

```
┌─────────────┐
│   用户操作   │ 点击 "导出" 按钮 → 选择 "汇总" 或 "个人"
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  SprintsPage                                │
│  handleExportSummary() or                   │
│  handleExportPersonal()                     │
└──────┬──────────────────────────────────────┘
       │ POST /api/reports/sprint/:id/export
       ▼
┌─────────────────────────────────────────────┐
│  Backend: reports.ts                        │
│  1. Fetch data from DB (with optional       │
│     userId filter for personal reports)     │
│  2. Query:                                  │
│     - Sprint info                           │
│     - Projects (active in this sprint)      │
│     - Stories (with all new fields)         │
│     - Tasks (nested under stories)          │
│     - Next sprint's planned stories         │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Data Processing:                           │
│  - Calculate completion_rate per project    │
│  - Generate weekly summary (auto)           │
│  - Aggregate risks (story + task)           │
│  - Format next week plan                    │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  ExcelJS Generation:                        │
│  1. Create workbook & worksheet             │
│  2. Set column widths                       │
│  3. Add header row (with styles)            │
│  4. For each project:                       │
│     - Merge cells for project name          │
│     - Add story rows (B column)             │
│     - Auto-generate summary (C column)      │
│     - Show completion rate (D column)       │
│     - Show next week plan (E column)        │
│     - Show aggregated risks (F column)      │
│  5. Apply borders, fonts, colors            │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  HTTP Response:                             │
│  Content-Type: application/vnd...xlsx       │
│  Content-Disposition: attachment            │
│  Body: Binary Excel file                    │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Frontend Download:                         │
│  - Create blob from response                │
│  - Generate download link                   │
│  - Trigger browser download                 │
│  - Cleanup                                  │
└─────────────────────────────────────────────┘
```

### 7.3 Status 自动更新流程

```
┌─────────────┐
│  拖拽 Task   │ Drag Task card to "Done" column
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  KanbanBoard.tsx                            │
│  onDragEnd() → handleTaskMove()             │
└──────┬──────────────────────────────────────┘
       │ POST /api/workbench/task/status
       ▼
┌─────────────────────────────────────────────┐
│  Backend: workbench.ts                      │
│  - Update sprint_tasks.status               │
│  - IF new status === 'completed':           │
│    (currently NOT auto-setting for tasks)   │
└──────┬──────────────────────────────────────┘
       │
       ▼
       Response: { success: true }

Note: For Story drag, same flow via POST /story/status
      with auto-set actual_completion_date logic
```

---

## 8. 边缘场景处理 (Edge Case Handling)

### 8.1 NULL 值处理

**场景**: 现有数据或用户未填写新字段

**处理策略**:

| 字段 | NULL 时显示 | Excel 显示 |
|------|-------------|-----------|
| planned_completion_date | "未设置" | "-" |
| actual_completion_date | "未完成" | "-" |
| estimated_hours | "-" | "-" |
| risk_and_countermeasure | "无" | "无" |

**实现**:
```typescript
// Frontend
{task.planned_completion_date ? format(new Date(task.planned_completion_date), 'PPP') : '未设置'}

// Excel
const dateText = story.planned_completion_date || '-';
```

### 8.2 跨迭代 Story 复用

**场景**: Story 在 Sprint 1 创建，Sprint 2 继续

**预期行为**:
- `title`, `description`: 继承（引用表字段）
- `status`, `progress`, `assigned_to`: 重置为初始值
- `planned_completion_date`: NULL（需用户重新填写）
- `actual_completion_date`: NULL
- `risk_and_countermeasure`: 空字符串
- `estimated_hours`: NULL

**实现**: 前端在添加 Story 到新 Sprint 时只 INSERT `sprint_stories` 记录，不复制快照字段。

### 8.3 无下一个迭代

**场景**: 当前是最后一个 Sprint，没有后续计划

**处理**:
```typescript
// API Response
next_sprint: { id: null, name: null, planned_stories: [] }

// Excel Cell Value
function generateNextWeekPlan(nextSprint: any): string {
  if (!nextSprint.id) {
    return '暂无计划';
  }
  // ... normal logic ...
}
```

### 8.4 项目无 Story

**场景**: 项目被激活但未添加任何 Story

**处理**: 该项目不出现在周报中（查询时通过 `WHERE p.id IN (SELECT DISTINCT project_id FROM sprint_stories ...)` 过滤）

### 8.5 Excel 特殊字符

**场景**: 用户输入包含 `\n`, `\t`, 或 Excel 公式（`=SUM(...)`）

**处理**:
```typescript
function sanitizeForExcel(text: string): string {
  if (!text) return '';

  // Prevent formula injection
  if (text.startsWith('=') || text.startsWith('+') || text.startsWith('-') || text.startsWith('@')) {
    text = "'" + text; // Prepend single quote to force text interpretation
  }

  return text;
}

// Use when setting cell values
cell.value = sanitizeForExcel(story.title);
```

### 8.6 日期验证

**场景**: planned_completion_date 早于 Sprint 开始日期

**处理**: 前端添加验证（可选，不阻塞）
```typescript
// In StoryDetailsDrawer
const validatePlannedDate = (date: Date | undefined) => {
  if (!date || !sprintId) return true;

  // Fetch sprint start/end dates and warn user if date is out of range
  // (Optional: show warning banner, don't block save)
};
```

---

## 9. 实施时间表 (Implementation Timeline)

### Phase 1: 数据库和后端 (Day 1 上午)

1. **数据库迁移** (30 min)
   - 创建 `005_add_weekly_report_fields.sql`
   - 测试 up/down migration
   - 验证字段创建成功

2. **API 开发** (2.5 hours)
   - 实现 `GET /api/reports/sprint/:id/data` (1 hour)
   - 实现 `POST /api/reports/sprint/:id/export` (1 hour)
   - 修改 `POST /story/update` 和 `POST /story/status` 添加自动日期逻辑 (30 min)
   - 单元测试（Postman/curl）

### Phase 2: 前端界面 (Day 1 下午)

3. **表单增强** (2 hours)
   - 修改 `StoryDetailsDrawer.tsx` 添加新字段 (1 hour)
   - 修改 `TaskDetailsDrawer.tsx` 添加新字段 (30 min)
   - 测试表单提交和数据保存 (30 min)

4. **导出按钮** (1 hour)
   - 修改 `SprintsPage.tsx` 添加下拉菜单
   - 实现下载逻辑
   - 测试文件下载

### Phase 3: Excel 生成 (Day 2 上午)

5. **ExcelJS 集成** (3 hours)
   - 实现基础 Excel 生成逻辑 (1 hour)
   - 实现自动生成函数（summary, risk, next plan） (1 hour)
   - 样式和格式调整（合并单元格、颜色、边框） (1 hour)

### Phase 4: 测试和优化 (Day 2 下午)

6. **端到端测试** (2 hours)
   - 创建测试数据（多项目、多 Story、多 Task）
   - 测试汇总报表生成
   - 测试个人报表生成
   - 验证 Excel 格式和内容

7. **Bug 修复和优化** (1 hour)
   - 修复发现的问题
   - 性能优化（如有需要）
   - 文档更新

**总计**: 约 2 个工作日

---

## 10. 测试计划 (Testing Plan)

### 10.1 单元测试

**数据库**:
- [ ] Migration up/down 正常执行
- [ ] 新字段约束正确（NULL 允许、类型正确）

**API**:
- [ ] `GET /reports/sprint/:id/data` 返回正确结构
- [ ] `GET /reports/sprint/:id/data?userId=X` 过滤正确
- [ ] `POST /reports/sprint/:id/export` 生成 Excel 文件
- [ ] Story status 更新时 `actual_completion_date` 自动填充
- [ ] 无权限用户访问 API 返回 403

### 10.2 集成测试

**前端 → 后端**:
- [ ] 创建 Story 时新字段正确保存到数据库
- [ ] 编辑 Story 时新字段正确更新
- [ ] Task 创建/编辑时 `estimated_hours` 正确保存
- [ ] 拖拽 Story 到 "Done" 时 `actual_completion_date` 自动设置
- [ ] 点击导出按钮触发正确的 API 调用

**Excel 生成**:
- [ ] 汇总报表包含所有项目和用户
- [ ] 个人报表只包含当前用户的数据
- [ ] 周总结自动生成内容正确
- [ ] 风险聚合去重正确
- [ ] 下周计划从正确的 Sprint 获取
- [ ] Excel 样式符合模板要求（颜色、边框、合并单元格）

### 10.3 用户验收测试 (UAT)

**场景 1: 创建新 Story**
1. 用户打开 Workbench，选择当前 Sprint
2. 点击 "Add Story"
3. 填写 title, description, **planned_completion_date**, **estimated_hours**, **risk**
4. 保存后刷新页面，验证数据持久化

**场景 2: 完成 Story**
1. 用户拖拽 Story 到 "Done" 列
2. 后端验证 `actual_completion_date` 已设置为当前时间
3. 再次查看 Story 详情，确认日期显示正确

**场景 3: 导出汇总周报**
1. 管理员进入 "迭代列表" 页面
2. 点击某个 Sprint 的 "导出" → "汇总周报"
3. 下载 Excel 文件
4. 验证：
   - 包含所有项目
   - 完成率计算正确
   - 周总结自动生成
   - 风险汇总完整
   - 下周计划显示

**场景 4: 导出个人周报**
1. 开发者用户点击 "导出" → "个人周报"
2. 验证只包含自己负责的 Story/Task
3. 验证内容格式正确

### 10.4 边缘场景测试

- [ ] 现有数据（新字段为 NULL）正确显示
- [ ] 用户未填写可选字段时不报错
- [ ] 无下一个 Sprint 时周报正常生成
- [ ] 项目无 Story 时不出现在周报中
- [ ] Excel 特殊字符不引起错误

---

## 11. 风险缓解 (Risk Mitigation)

### 11.1 性能风险

**风险**: 大量数据时 Excel 生成缓慢（数据库查询或 ExcelJS 处理）

**缓解措施**:
- **Phase 1**: 添加数据库索引（`planned_completion_date`, `actual_completion_date`）
- **Phase 2**: 如果仍慢，实现异步生成（后台任务 + 邮件通知）
- **监控**: 记录 Excel 生成时间，超过 5 秒触发优化

### 11.2 数据迁移风险

**风险**: Migration 执行失败或破坏现有数据

**缓解措施**:
- 使用 `IF NOT EXISTS` 子句（幂等性）
- 在开发环境充分测试 up/down
- 生产环境执行前备份数据库
- 准备回滚计划（`npm run migrate:down`）

### 11.3 用户体验风险

**风险**: 新字段增加用户填写负担

**缓解措施**:
- **只有 `planned_completion_date` 必填**，其他字段可选
- 提供合理默认值（`estimated_hours` 可留空）
- 表单 UI 清晰标注必填/可选
- 提供帮助文本和示例

### 11.4 Excel 格式兼容性

**风险**: 生成的 Excel 文件在某些版本 Office/WPS 中显示异常

**缓解措施**:
- 使用 ExcelJS 最新稳定版
- 测试多个 Excel 版本（Office 2016+, WPS, LibreOffice）
- 避免使用过于复杂的格式（坚持基础样式）

### 11.5 权限漏洞

**风险**: 外部用户或未授权用户访问他人数据

**缓解措施**:
- 在所有 API 端点验证 `req.session.user`
- 个人报表强制使用 `req.session.user.id`，不信任前端传递的 `userId`
- 添加日志记录敏感操作

---

## 附录 A: 类型定义更新

**文件**: `/frontend/src/types/index.ts`

```typescript
// Update Story interface
export interface Story {
  id: number;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  assigned_to_user: Member | null;

  // NEW FIELDS
  planned_completion_date: string | null; // YYYY-MM-DD
  actual_completion_date: string | null; // ISO 8601
  risk_and_countermeasure: string | null;
  estimated_hours: number | null;

  created_at?: string;
  updated_at?: string;
}

// Update Task interface
export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'Must' | 'Should' | 'Could';
  size: 'Small' | 'Medium' | 'Large';
  progress: number;
  assigned_to_user: Member | null;
  risk_and_countermeasure: string | null;

  // NEW FIELD
  estimated_hours: number | null;

  created_at?: string;
  updated_at?: string;
}
```

---

## 附录 B: 数据库查询示例

### 获取某 Sprint 的完整周报数据

```sql
-- 1. Sprint Info
SELECT id, name, start_date, end_date, status
FROM sprints
WHERE id = 1;

-- 2. Active Projects
SELECT DISTINCT p.id, p.name, d.name AS dept, pt.name AS type
FROM projects p
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN project_types pt ON p.project_type_id = pt.id
WHERE p.id IN (
  SELECT DISTINCT project_id FROM sprint_stories WHERE sprint_id = 1
);

-- 3. Stories for Project X in Sprint 1
SELECT
  s.id, s.title, s.description,
  ss.status, ss.progress, ss.priority,
  ss.planned_completion_date, ss.actual_completion_date,
  ss.risk_and_countermeasure, ss.estimated_hours,
  u.id AS user_id, u.display_name
FROM stories s
JOIN sprint_stories ss ON s.id = ss.story_id
LEFT JOIN users u ON ss.assigned_to = u.id
WHERE ss.sprint_id = 1 AND ss.project_id = 2
ORDER BY
  CASE ss.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END;

-- 4. Tasks for Story Y in Sprint 1
SELECT
  t.id, t.title, t.description,
  st.status, st.progress, st.priority, st.size,
  st.risk_and_countermeasure, st.estimated_hours,
  u.id AS user_id, u.display_name
FROM tasks t
JOIN sprint_tasks st ON t.id = st.task_id
LEFT JOIN users u ON st.assigned_to = u.id
WHERE st.sprint_id = 1 AND st.story_id = 10;

-- 5. Next Sprint's Planned Stories
SELECT s.id, s.title, ss.planned_completion_date
FROM stories s
JOIN sprint_stories ss ON s.id = ss.story_id
WHERE ss.sprint_id = (
  SELECT id FROM sprints
  WHERE start_date > (SELECT end_date FROM sprints WHERE id = 1)
    AND status IN ('planned', 'current')
  ORDER BY start_date ASC
  LIMIT 1
);
```

---

## 结论

本实施方案详细描述了周报系统的完整实现路径，包括数据库变更、API 开发、前端界面、Excel 生成等所有关键环节。核心设计原则（快照表优先、简化计算、自动生成）确保了系统的可维护性和用户友好性。

**后续步骤**:
1. **审核本方案**，确认技术路线和业务逻辑无误
2. **开始实施**，按时间表逐步完成各模块
3. **测试验证**，确保所有功能符合预期
4. **上线部署**，替换现有手工 Excel 流程

如有任何疑问或需要调整的地方，请及时反馈。
