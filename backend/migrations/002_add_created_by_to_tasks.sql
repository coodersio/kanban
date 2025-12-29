ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
