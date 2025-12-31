#!/bin/bash

# ⚠️  WARNING: This script contains default credentials for development only
# For production use, please change these values before running!

# Configuration
DB_User="kanban_user"
DB_PASS="your_password_here"
DB_NAME="kanban_db"
CONN_STRING="postgresql://$DB_User:$DB_PASS@localhost:5432/$DB_NAME"

echo "🚀 Starting Database Setup..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Create Role if not exists
echo "👤 Creating user '$DB_User'..."
psql postgres -c "DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_User') THEN
        CREATE ROLE $DB_User WITH LOGIN PASSWORD '$DB_PASS';
        ALTER ROLE $DB_User CREATEDB;
        RAISE NOTICE 'Role $DB_User created';
    ELSE
        RAISE NOTICE 'Role $DB_User already exists';
    END IF;
END
\$\$;"

# Create Database if not exists
echo "📦 Creating database '$DB_NAME'..."
DB_EXISTS=$(psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME && echo "yes" || echo "no")
if [ "$DB_EXISTS" = "yes" ]; then
    echo "⚠️  Database '$DB_NAME' already exists."
else
    createdb -O $DB_User $DB_NAME
    echo "✅ Database '$DB_NAME' created successfully."
fi

# Grant privileges (just to be safe)
echo "🔑 Granting privileges..."
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_User;"

# Initialize database with admin user and backlog sprint
echo "🌱 Initializing database with default data..."
PGPASSWORD=$DB_PASS psql -h localhost -U $DB_User -d $DB_NAME << 'EOF'
-- 创建admin账户
-- ⚠️  默认密码: admin123 (请在首次登录后立即修改!)
INSERT INTO users (user_name, display_name, password_hash, role)
VALUES (
    'admin',
    '系统管理员',
    '$2b$10$qPmSyPB9C2J8qwivwnFyseMz.s2bKQEhsycDA3GcGBu6e7jc7OvYa',  -- bcrypt hash of 'admin123'
    'admin'
)
ON CONFLICT (user_name) DO NOTHING;

-- 创建Backlog迭代
INSERT INTO sprints (id, sprint_number, start_date, end_date, status)
VALUES (-1, 'BACKLOG', '1970-01-01', '2099-12-31', 'planned')
ON CONFLICT (id) DO NOTHING;

-- 确保序列从1开始
SELECT setval('sprints_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM sprints WHERE id > 0), false);
EOF

if [ $? -eq 0 ]; then
    echo "✅ Admin user created (username: admin)"
    echo "✅ Backlog sprint created (id: -1)"
    echo ""
    echo "⚠️  SECURITY WARNING:"
    echo "   Default password is 'admin123'"
    echo "   Please change it immediately after first login!"
else
    echo "⚠️  Failed to initialize data (tables might not exist yet - run migrations first)"
fi

echo "---------------------------------------"
echo "🎉 Setup Complete!"
echo "Connection String: $CONN_STRING"
echo ""
echo "Next steps:"
echo "  1. cd backend && npm install"
echo "  2. npm run build"
echo "  3. npm run migrate:up all  (run all migrations)"
echo "  4. npm run seed  (if you skipped setup initialization)"
echo "---------------------------------------"
