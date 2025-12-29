#!/bin/bash

# Configuration
DB_User="plugcamp"
DB_PASS="password"
DB_NAME="workos"

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
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "⚠️  Database '$DB_NAME' already exists."
else
    createdb -O $DB_User $DB_NAME
    echo "✅ Database '$DB_NAME' created successfully."
fi

# Grant privileges (just to be safe)
echo "🔑 Granting privileges..."
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_User;"

echo "---------------------------------------"
echo "🎉 Setup Complete!"
echo "Connection String: postgres://$DB_User:$DB_PASS@localhost:5432/$DB_NAME"
echo "---------------------------------------"
