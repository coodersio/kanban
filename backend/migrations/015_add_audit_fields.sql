-- Add audit tracking fields (created_by, updated_by) to snapshot tables
-- This allows tracking who created and who last modified stories/tasks in each sprint

-- Add to sprint_tasks table
ALTER TABLE sprint_tasks
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_sprint_tasks_created_by ON sprint_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_updated_by ON sprint_tasks(updated_by);

-- Add to sprint_stories table
ALTER TABLE sprint_stories
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_sprint_stories_created_by ON sprint_stories(created_by);
CREATE INDEX IF NOT EXISTS idx_sprint_stories_updated_by ON sprint_stories(updated_by);

-- Add to tasks table (for completeness, may already exist from migration 002)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_tasks_updated_by ON tasks(updated_by);

-- Add to stories table
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_stories_created_by ON stories(created_by);
CREATE INDEX IF NOT EXISTS idx_stories_updated_by ON stories(updated_by);

-- Set default values for existing records (use assigned_to as fallback)
UPDATE sprint_tasks SET created_by = assigned_to WHERE created_by IS NULL AND assigned_to IS NOT NULL;
UPDATE sprint_tasks SET updated_by = assigned_to WHERE updated_by IS NULL AND assigned_to IS NOT NULL;

UPDATE sprint_stories SET created_by = assigned_to WHERE created_by IS NULL AND assigned_to IS NOT NULL;
UPDATE sprint_stories SET updated_by = assigned_to WHERE updated_by IS NULL AND assigned_to IS NOT NULL;
