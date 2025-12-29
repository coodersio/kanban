import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://plugcamp:password@localhost:5432/workos'
});

async function resetPassword() {
    const password = 'password';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    try {
        await pool.query('UPDATE users SET password_hash = $1 WHERE user_name = $2', [hash, 'admin']);
        console.log('Password for admin reset to "password"');
    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        await pool.end();
    }
}

resetPassword();
