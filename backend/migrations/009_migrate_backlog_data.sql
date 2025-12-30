-- Migrate any existing sprint_id = 0 data to sprint_id = -1
-- This ensures compatibility if any test data was created with sprint_id = 0

-- Update sprint_stories
UPDATE sprint_stories SET sprint_id = -1 WHERE sprint_id = 0;

-- Update sprint_tasks
UPDATE sprint_tasks SET sprint_id = -1 WHERE sprint_id = 0;

-- Update sprint_projects
UPDATE sprint_projects SET sprint_id = -1 WHERE sprint_id = 0;
