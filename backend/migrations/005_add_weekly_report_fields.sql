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
-- 3. Create indexes for performance (optional but recommended)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sprint_stories_planned_date
ON sprint_stories(planned_completion_date);

CREATE INDEX IF NOT EXISTS idx_sprint_stories_actual_date
ON sprint_stories(actual_completion_date);

CREATE INDEX IF NOT EXISTS idx_sprint_stories_sprint_story
ON sprint_stories(sprint_id, story_id);

CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint_task
ON sprint_tasks(sprint_id, task_id);

COMMIT;
