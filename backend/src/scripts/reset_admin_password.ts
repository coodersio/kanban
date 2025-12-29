import pool from '../db/connection';
import bcrypt from 'bcrypt';

const reset = async () => {
    try {
        const passwordHash = await bcrypt.hash('admin123', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE user_name = $2', [passwordHash, 'admin']);
        console.log('✅ Admin password reset to: admin123');
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset failed:', err);
        process.exit(1);
    }
};

reset();
