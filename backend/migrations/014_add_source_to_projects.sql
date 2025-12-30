-- 添加需求来源字段到projects表
-- 需求来源表示项目对接人

ALTER TABLE projects ADD COLUMN source VARCHAR(100);

-- 为现有项目设置默认值（可选）
UPDATE projects SET source = '待确定' WHERE source IS NULL;

-- 添加索引以便查询
CREATE INDEX idx_projects_source ON projects(source);

-- 添加注释
COMMENT ON COLUMN projects.source IS '需求来源/项目对接人';
