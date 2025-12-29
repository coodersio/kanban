-- Add priority field to stories reference table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Add priority field to sprint_stories snapshot table
ALTER TABLE sprint_stories ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Add priority and size fields to sprint_tasks snapshot table
ALTER TABLE sprint_tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) CHECK (priority IN ('Must', 'Should', 'Could'));
ALTER TABLE sprint_tasks ADD COLUMN IF NOT EXISTS size VARCHAR(20) CHECK (size IN ('Tiny', 'Medium', 'Huge'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stories_priority ON stories(priority);
CREATE INDEX IF NOT EXISTS idx_sprint_stories_priority ON sprint_stories(priority);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_priority ON sprint_tasks(priority);
