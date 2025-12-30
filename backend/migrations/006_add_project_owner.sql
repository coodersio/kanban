-- Migration: Add project owner field
-- This adds a project owner (responsible person) to the projects table

-- Add owner_id column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_owner
ON projects(owner_id);

-- Add comment for documentation
COMMENT ON COLUMN projects.owner_id IS 'Project owner/responsible person';
