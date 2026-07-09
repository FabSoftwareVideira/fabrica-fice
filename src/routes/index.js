const router = require('express').Router();
const crypto = require('crypto');
const { pool } = require('../config/database');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const ADMIN_COOKIE_SECRET = process.env.ADMIN_COOKIE_SECRET || process.env.POSTGRES_PASSWORD || 'dev-admin-secret';
const ADMIN_COOKIE_NAME = 'admin_auth';
const ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias

function parseCookies(req) {
    const header = req.headers.cookie || '';
    return header.split(';').reduce((cookies, pair) => {
        const [name, ...rest] = pair.trim().split('=');
        if (!name) return cookies;
        cookies[name] = decodeURIComponent(rest.join('='));
        return cookies;
    }, {});
}

function createAdminToken(user) {
    const expires = Date.now() + ADMIN_COOKIE_MAX_AGE;
    const payload = `${user}:${expires}`;
    const signature = crypto.createHmac('sha256', ADMIN_COOKIE_SECRET).update(payload).digest('hex');
    return `${payload}:${signature}`;
}

function verifyAdminToken(token) {
    if (!token) return false;
    const parts = token.split(':');
    if (parts.length !== 3) return false;

    const [user, expiresStr, signature] = parts;
    const expires = Number(expiresStr);
    if (!user || Number.isNaN(expires) || expires < Date.now()) return false;

    const payload = `${user}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', ADMIN_COOKIE_SECRET).update(payload).digest('hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) return false;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

    return user === ADMIN_USER;
}

function requireAdmin(req, res, next) {
    const cookies = parseCookies(req);
    if (!verifyAdminToken(cookies[ADMIN_COOKIE_NAME])) {
        return res.redirect('/admin/login');
    }
    next();
}

function setAdminCookie(res) {
    const token = createAdminToken(ADMIN_USER);
    res.cookie(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.APP_ENV === 'production',
        maxAge: ADMIN_COOKIE_MAX_AGE,
        path: '/',
    });
}

function clearAdminCookie(res) {
    res.cookie(ADMIN_COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.APP_ENV === 'production',
        maxAge: 0,
        path: '/',
    });
}

router.get('/', (req, res) => {
    res.render('home', { title: 'Fábrica FICE' });
});

router.get('/estande', (req, res) => {
    res.render('booth', { title: 'Stand da Feira' });
});

router.get('/recompensa', (req, res) => {
    res.render('reward', { title: 'Estação de Recompensa' });
});

router.get('/admin/login', (req, res) => {
    res.render('admin-login', { title: 'Login Admin', error: null });
});

router.post('/admin/login', (req, res) => {
    const { user, password } = req.body || {};
    if (user === ADMIN_USER && password === ADMIN_PASSWORD) {
        setAdminCookie(res);
        return res.redirect('/admin');
    }
    res.status(401).render('admin-login', {
        title: 'Login Admin',
        error: 'Usuário ou senha incorretos.',
    });
});

router.get('/admin/logout', (req, res) => {
    clearAdminCookie(res);
    res.redirect('/admin/login');
});

router.get('/admin', requireAdmin, async (req, res) => {
    try {
        const [statsResult, recentResult] = await Promise.all([
            pool.query(`
                SELECT 
                    COUNT(*)::int AS total,
                    COUNT(CASE WHEN reward_given = true THEN 1 END)::int AS redeemed
                FROM visitors
            `),
            pool.query(`
                SELECT id, event_id, reward_given, captured_at
                FROM visitors
                ORDER BY captured_at DESC
                LIMIT 8
            `),
        ]);
        const stats = statsResult.rows[0];
        res.render('admin', {
            title: 'Painel Administrativo',
            stats: {
                totalVisitors: stats.total,
                redeemed: stats.redeemed,
                pending: stats.total - stats.redeemed,
            },
            recent: recentResult.rows,
            error: null,
        });
    } catch (error) {
        res.status(500).render('admin', {
            title: 'Painel Administrativo',
            stats: { totalVisitors: 0, redeemed: 0, pending: 0 },
            recent: [],
            error: 'Falha ao carregar dados do painel. Tente novamente.',
        });
    }
});

router.get('/admin/export', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, event_id, reward_given, captured_at, reward_given_at, notes
            FROM visitors
            ORDER BY captured_at DESC
        `);

        const escapeValue = (value) => {
            if (value === null || value === undefined) return '';
            const text = String(value).replace(/"/g, '""');
            return /[",\n\r]/.test(text) ? `"${text}"` : text;
        };

        const header = ['id', 'event_id', 'reward_given', 'captured_at', 'reward_given_at', 'notes'];
        const rows = result.rows.map((row) => [
            escapeValue(row.id),
            escapeValue(row.event_id),
            escapeValue(row.reward_given),
            escapeValue(row.captured_at),
            escapeValue(row.reward_given_at),
            escapeValue(row.notes),
        ]);

        const csv = '\uFEFF' + [header.join(','), ...rows.map((columns) => columns.join(','))].join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="visitors.csv"');
        res.send(csv);
    } catch (error) {
        res.status(500).render('admin', {
            title: 'Painel Administrativo',
            stats: { totalVisitors: 0, redeemed: 0, pending: 0 },
            recent: [],
            error: 'Falha ao exportar a base de visitantes. Tente novamente.',
        });
    }
});

router.post('/admin/clear', requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM visitors');
        res.redirect('/admin');
    } catch (error) {
        res.status(500).render('admin', {
            title: 'Painel Administrativo',
            stats: { totalVisitors: 0, redeemed: 0, pending: 0 },
            recent: [],
            error: 'Falha ao limpar a base de visitantes. Tente novamente.',
        });
    }
});

router.post('/admin/delete/:id', requireAdmin, async (req, res) => {
    const visitorId = Number(req.params.id);
    if (Number.isNaN(visitorId) || visitorId <= 0) {
        return res.status(400).send('ID inválido.');
    }
    try {
        await pool.query('DELETE FROM visitors WHERE id = $1', [visitorId]);
        res.redirect('/admin');
    } catch (error) {
        res.status(500).render('admin', {
            title: 'Painel Administrativo',
            stats: { totalVisitors: 0, redeemed: 0, pending: 0 },
            recent: [],
            error: 'Falha ao excluir o registro. Tente novamente.',
        });
    }
});

module.exports = router;
