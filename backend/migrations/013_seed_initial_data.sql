-- 初始化数据：创建admin账户和backlog迭代

-- 1. 创建admin账户
-- ⚠️  WARNING: Default credentials for development only!
-- Username: admin
-- Password: admin123 (CHANGE THIS IMMEDIATELY IN PRODUCTION!)
-- Role: admin
INSERT INTO users (user_name, display_name, password_hash, role)
VALUES (
    'admin',
    '系统管理员',
    '$2b$10$qPmSyPB9C2J8qwivwnFyseMz.s2bKQEhsycDA3GcGBu6e7jc7OvYa',  -- bcrypt hash of 'admin123'
    'admin'
)
ON CONFLICT (user_name) DO NOTHING;

-- 2. 创建Backlog迭代（id = -1）
-- 如果migration 008已经运行，这条语句会被忽略
INSERT INTO sprints (id, sprint_number, start_date, end_date, status)
VALUES (-1, 'BACKLOG', '1970-01-01', '2099-12-31', 'planned')
ON CONFLICT (id) DO NOTHING;

-- 确保序列从1开始（避免与Backlog的-1冲突）
SELECT setval('sprints_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM sprints WHERE id > 0), false);
