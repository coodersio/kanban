import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import path from 'path';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import projectTypeRoutes from './routes/project_types';
import sprintRoutes from './routes/sprints';
import projectRoutes from './routes/projects';
import workbenchRoutes from './routes/workbench';
import reportRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard';
import pool from './db/connection';

dotenv.config();

const app = express();
const port = process.env.PORT || 4004;
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true
}));
app.use(express.json());

// Session Config
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
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
app.use('/api/dashboard', dashboardRoutes);
const publicDir = path.join(__dirname, 'public');
if (isProduction) {
    app.use(express.static(publicDir));
}

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
if (isProduction) {
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/health') {
            return next();
        }
        return res.sendFile(path.join(publicDir, 'index.html'));
    });
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
