import pool from '../db/connection';
import bcrypt from 'bcrypt';

const seed = async () => {
    try {
        console.log('🌱 Seeding database...');

        const passwordHash = await bcrypt.hash('admin123', 10);

        // Insert Admin User
        await pool.query(`
            INSERT INTO users (user_name, display_name, password_hash, role)
            VALUES ($1, $2, $3, 'admin')
            ON CONFLICT (user_name) DO NOTHING
        `, ['admin', 'Administrator', passwordHash]);

        console.log('✅ Admin user created: admin / admin123');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
