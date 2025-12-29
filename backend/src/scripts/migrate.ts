import fs from 'fs';
import path from 'path';
import pool from '../db/connection';

const migrate = async () => {
    // Basic migration runner: reads all .sql files in migrations dir and executes them.
    // NOTE: This is naive and doesn't track applied migrations in a table (yet).
    // It's idempotent only if the SQL files are written carefully (e.g. IF NOT EXISTS).

    // For now, since we know 001 is already applied (mostly) and 002 is safe (ALTER TABLE),
    // we will just run them sequentially. 
    // Ideally, we should check a schema_migrations table. 
    // Given the current status (001 run manually/earlier), running 001 again might fail if it's not idempotent.
    // So let's just make it run a specific file if provided, or default to all?
    // Actually, looking at 001, it uses CREATE TABLE without IF NOT EXISTS. Running it again will FAIL.

    // Quick fix: Update this script to run specific file provided as arg, or 002 specifically.
    // Or better: Let's just make it run the file we request or all.

    const target = process.argv[2];
    const migrationsDir = path.join(__dirname, '../../migrations');

    if (!target) {
        console.log('Please provide a migration file name (e.g. 002_add_project_description.sql) or "all" to run all (dangerous if not idempotent)');
        process.exit(1);
    }

    let files = [];
    if (target === 'all') {
        files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    } else {
        files = [target];
    }

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`Running migration: ${file}`);
            const sql = fs.readFileSync(filePath, 'utf8');
            try {
                await pool.query(sql);
                console.log(`Completed: ${file}`);
            } catch (err) {
                console.error(`Failed: ${file}`, err);
                // Don't exit, try next? No, fail fast.
                process.exit(1);
            }
        } else {
            console.error(`File not found: ${filePath}`);
        }
    }
    process.exit(0);
};

migrate();
