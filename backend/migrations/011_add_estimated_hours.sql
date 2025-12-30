-- Add estimated_hours column to tasks table
ALTER TABLE tasks ADD COLUMN estimated_hours NUMERIC(5,1);

-- Add comment for clarity
COMMENT ON COLUMN tasks.estimated_hours IS '预估工时（小时）';
