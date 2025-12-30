import pool from '../db/connection';
import bcrypt from 'bcrypt';

const seed = async () => {
    try {
        console.log('🌱 Seeding database...');

        // 1. Insert Admin User
        const passwordHash = await bcrypt.hash('admin123', 10);
        await pool.query(`
            INSERT INTO users (user_name, display_name, password_hash, role)
            VALUES ($1, $2, $3, 'admin')
            ON CONFLICT (user_name) DO NOTHING
        `, ['admin', '系统管理员', passwordHash]);
        console.log('✅ Admin user created: admin / admin123');

        // 2. Ensure Backlog sprint exists
        await pool.query(`
            INSERT INTO sprints (id, sprint_number, start_date, end_date, status)
            VALUES (-1, 'BACKLOG', '1970-01-01', '2099-12-31', 'planned')
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('✅ Backlog sprint ensured (id: -1)');

        // 3. Ensure sequence starts from 1 for regular sprints
        await pool.query(`
            SELECT setval('sprints_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM sprints WHERE id > 0), false)
        `);
        console.log('✅ Sprint sequence configured');

        console.log('\n🎉 Database seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
