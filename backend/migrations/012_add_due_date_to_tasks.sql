-- Add planned_completion_date and actual_completion_date to sprint_tasks (snapshot table)
-- These fields are sprint-specific, so they belong in the snapshot table, not the reference table
ALTER TABLE sprint_tasks ADD COLUMN planned_completion_date TIMESTAMP;
ALTER TABLE sprint_tasks ADD COLUMN actual_completion_date TIMESTAMP;

-- Add indexes for date queries
CREATE INDEX idx_sprint_tasks_planned_completion ON sprint_tasks(planned_completion_date);
CREATE INDEX idx_sprint_tasks_actual_completion ON sprint_tasks(actual_completion_date);
