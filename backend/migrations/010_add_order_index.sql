-- Add order_index field to sprint_stories and sprint_tasks tables
-- This enables drag-and-drop reordering in the list view

-- Add order_index to sprint_stories
ALTER TABLE sprint_stories ADD COLUMN order_index INTEGER DEFAULT 0;

-- Add order_index to sprint_tasks
ALTER TABLE sprint_tasks ADD COLUMN order_index INTEGER DEFAULT 0;

-- Initialize existing data with order_index based on ID
-- This ensures existing stories and tasks have a valid order
UPDATE sprint_stories SET order_index = story_id WHERE order_index = 0;
UPDATE sprint_tasks SET order_index = task_id WHERE order_index = 0;
