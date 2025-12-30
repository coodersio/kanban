-- Create a special Backlog sprint with id = -1
-- This allows tasks and stories to exist without a specific sprint assignment

-- Insert Backlog sprint with id = -1
INSERT INTO sprints (id, sprint_number, start_date, end_date, status)
VALUES (-1, 'BACKLOG', '1970-01-01', '2099-12-31', 'planned')
ON CONFLICT (id) DO NOTHING;

-- Ensure sequence starts from 1 for regular sprints
SELECT setval('sprints_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM sprints WHERE id > 0), false);
