-- Group permission migration
-- Execute this file section by section before deploying the group-scoped application code.
-- The core migration section is intentionally idempotent.

-- ============================================================
-- 0. Pre-migration audit
-- ============================================================

SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS project_count FROM projects;
SELECT COUNT(*) AS sprint_count FROM sprints;

SELECT sprint_number, COUNT(*) AS count
FROM sprints
GROUP BY sprint_number
HAVING COUNT(*) > 1;

-- ============================================================
-- 1. Core schema migration
-- ============================================================

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO groups (name)
SELECT '默认小组'
WHERE NOT EXISTS (
  SELECT 1 FROM groups WHERE name = '默认小组'
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id);

ALTER TABLE sprints
  ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id);

UPDATE users
SET group_id = (SELECT id FROM groups WHERE name = '默认小组')
WHERE group_id IS NULL;

UPDATE projects
SET group_id = (SELECT id FROM groups WHERE name = '默认小组')
WHERE group_id IS NULL;

UPDATE sprints
SET group_id = (SELECT id FROM groups WHERE name = '默认小组')
WHERE group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_group ON users(group_id);
CREATE INDEX IF NOT EXISTS idx_projects_group ON projects(group_id);
CREATE INDEX IF NOT EXISTS idx_sprints_group ON sprints(group_id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'group_admin', 'developer', 'external'));

ALTER TABLE sprints DROP CONSTRAINT IF EXISTS sprints_sprint_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sprints_group_number
  ON sprints(group_id, sprint_number);

-- ============================================================
-- 2. Post-migration validation
-- ============================================================

SELECT COUNT(*) AS users_without_group FROM users WHERE group_id IS NULL;
SELECT COUNT(*) AS projects_without_group FROM projects WHERE group_id IS NULL;
SELECT COUNT(*) AS sprints_without_group FROM sprints WHERE group_id IS NULL;

SELECT g.id, g.name, COUNT(u.id) AS user_count
FROM groups g
LEFT JOIN users u ON u.group_id = g.id
GROUP BY g.id, g.name
ORDER BY g.id;

SELECT g.id, g.name, COUNT(p.id) AS project_count
FROM groups g
LEFT JOIN projects p ON p.group_id = g.id
GROUP BY g.id, g.name
ORDER BY g.id;

SELECT g.id, g.name, COUNT(s.id) AS sprint_count
FROM groups g
LEFT JOIN sprints s ON s.group_id = g.id
GROUP BY g.id, g.name
ORDER BY g.id;

SELECT sp.id, sp.sprint_id, sp.project_id
FROM sprint_projects sp
JOIN sprints s ON s.id = sp.sprint_id
JOIN projects p ON p.id = sp.project_id
WHERE s.group_id <> p.group_id;

-- ============================================================
-- 3. Optional hard constraints
-- Run this section only after validation returns no NULL group_id
-- and no cross-group sprint/project associations.
-- ============================================================

-- ALTER TABLE users ALTER COLUMN group_id SET NOT NULL;
-- ALTER TABLE projects ALTER COLUMN group_id SET NOT NULL;
-- ALTER TABLE sprints ALTER COLUMN group_id SET NOT NULL;
