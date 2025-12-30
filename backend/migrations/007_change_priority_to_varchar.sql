-- Migration: Change sprint_projects priority from INTEGER to VARCHAR(10)
-- This allows storing Chinese priority values: '高', '中', '低'

-- Change column type with USING clause to convert existing integer values
-- 0-1 -> '高' (high)
-- 2 -> '中' (medium)
-- 3+ -> '低' (low)

ALTER TABLE sprint_projects
ALTER COLUMN priority TYPE VARCHAR(10)
USING CASE
    WHEN priority <= 1 THEN '高'
    WHEN priority = 2 THEN '中'
    ELSE '低'
END;

-- Set default to '中' (medium)
ALTER TABLE sprint_projects
ALTER COLUMN priority SET DEFAULT '中';
