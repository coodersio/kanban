import pool from '../db/connection';
import bcrypt from 'bcrypt';

const createUsers = async () => {
    try {
        console.log('🌱 Creating test users...');

        const passwordHash = await bcrypt.hash('123456', 10);

        // Developer
        await pool.query(`
            INSERT INTO users (user_name, display_name, password_hash, role)
            VALUES ($1, $2, $3, 'developer')
            ON CONFLICT (user_name) DO NOTHING
        `, ['dev', 'Developer One', passwordHash]);

        // External
        await pool.query(`
            INSERT INTO users (user_name, display_name, password_hash, role)
            VALUES ($1, $2, $3, 'external')
            ON CONFLICT (user_name) DO NOTHING
        `, ['ext', 'External User', passwordHash]);

        console.log('✅ Users created: dev / 123456, ext / 123456');

        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    }
};

createUsers();
