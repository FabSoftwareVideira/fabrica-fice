const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

const EVENT_ID = process.env.EVENT_ID || 'default-event';
const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD || '0.55');

// Faixa de "match ambiguo": distancia um pouco acima do threshold, mas proxima o
// suficiente para merecer conferencia manual em vez de recusa automatica.
const AMBIGUOUS_MARGIN = 0.15;

function toVectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

// POST /api/verify
// Recebe o descritor facial capturado na estacao de recompensa e verifica
// se essa pessoa ja passou pelo stand neste evento.
router.post('/', async (req, res) => {
  try {
    const { embedding } = req.body;

    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return res.status(400).json({ error: 'embedding invalido, esperado array de 128 numeros' });
    }

    const vectorLiteral = toVectorLiteral(embedding);

    const result = await pool.query(
      `SELECT id, reward_given, embedding <-> $1 AS distance
       FROM visitors
       WHERE event_id = $2
       ORDER BY embedding <-> $1
       LIMIT 1`,
      [vectorLiteral, EVENT_ID]
    );

    if (result.rows.length === 0) {
      return res.json({ status: 'not_found' });
    }

    const match = result.rows[0];

    if (match.distance > MATCH_THRESHOLD + AMBIGUOUS_MARGIN) {
      return res.json({ status: 'not_found', distance: match.distance });
    }

    if (match.distance > MATCH_THRESHOLD) {
      // Regra de negocio: match ambiguo cai para conferencia manual do atendente,
      // em vez de aprovar ou negar a recompensa automaticamente.
      return res.json({
        status: 'ambiguous',
        visitor_id: match.id,
        distance: match.distance,
      });
    }

    if (match.reward_given) {
      return res.json({
        status: 'already_redeemed',
        visitor_id: match.id,
      });
    }

    await pool.query(
      `UPDATE visitors
       SET reward_given = true, reward_given_at = now()
       WHERE id = $1`,
      [match.id]
    );

    return res.json({
      status: 'reward_granted',
      visitor_id: match.id,
      distance: match.distance,
    });
  } catch (err) {
    console.error('Erro em /api/verify:', err);
    return res.status(500).json({ error: 'erro interno ao verificar visitante' });
  }
});

module.exports = router;
