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
        // Combinamos os dois counts em uma única consulta ao banco
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
        });
    } catch (error) {
        // ... seu tratamento de erro
    }
});

module.exports = router;