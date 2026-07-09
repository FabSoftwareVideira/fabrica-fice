const router = require('express').Router();
const { pool } = require('../config/database');

router.get('/', (req, res) => {
    res.render('home', { title: 'Fábrica FICE' });
});

router.get('/estande', (req, res) => {
    res.render('booth', { title: 'Stand da Feira' });
});

router.get('/recompensa', (req, res) => {
    res.render('reward', { title: 'Estação de Recompensa' });
});

router.get('/admin', async (req, res) => {
    try {
        const [visitorsResult, redeemedResult, recentResult] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS total FROM visitors'),
            pool.query('SELECT COUNT(*)::int AS redeemed FROM visitors WHERE reward_given = true'),
            pool.query(`
                SELECT id, event_id, reward_given, captured_at
                FROM visitors
                ORDER BY captured_at DESC
                LIMIT 8
            `),
        ]);

        res.render('admin', {
            title: 'Painel Administrativo',
            stats: {
                totalVisitors: visitorsResult.rows[0].total,
                redeemed: redeemedResult.rows[0].redeemed,
                pending: visitorsResult.rows[0].total - redeemedResult.rows[0].redeemed,
            },
            recent: recentResult.rows,
        });
    } catch (error) {
        console.error('Erro ao carregar admin:', error);
        res.render('admin', {
            title: 'Painel Administrativo',
            stats: { totalVisitors: 0, redeemed: 0, pending: 0 },
            recent: [],
            error: 'Não foi possível carregar os dados no momento.',
        });
    }
});

module.exports = router;