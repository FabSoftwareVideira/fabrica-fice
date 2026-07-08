require('dotenv').config();
const express = require('express');
const path = require('path');
const { pool } = require('./config/database');
const cors = require('cors');

const captureRoute = require('./routes/capture');
const verifyRoute = require('./routes/verify');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/index'));
// app.use('/api', require('./routes/api'));
app.use('/api/capture', captureRoute);
app.use('/api/verify', verifyRoute);

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'ok',
            version: process.env.APP_VERSION || 'dev',
            env: process.env.APP_ENV || 'development',
            db: 'connected',
        });
    } catch {
        res.status(503).json({ status: 'error', db: 'disconnected' });
    }
});

module.exports = app;