import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import session from 'express-session';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import projectTypeRoutes from './routes/project_types';
import sprintRoutes from './routes/sprints';
import projectRoutes from './routes/projects';
import workbenchRoutes from './routes/workbench';
import reportRoutes from './routes/reports';

dotenv.config();

const app = express();
const port = process.env.PORT || 4004;

app.use(cors({
    origin: 'http://localhost:3003', // Allow frontend
    credentials: true
}));
app.use(express.json());

// Session Config
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set true if using https
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/project-types', projectTypeRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workbench', workbenchRoutes);
app.use('/api/reports', reportRoutes);

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://plugcamp:password@localhost:5432/workos'
});

// Basic health check
app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', time: result.rows[0].now });
    } catch (err) {
        console.error('Database connection error', err);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
