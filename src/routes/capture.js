const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

const EVENT_ID = process.env.EVENT_ID || 'default-event';
const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD || '0.55');

function toVectorLiteral(embedding) {
  // pgvector espera um literal tipo '[0.1,0.2,...]'
  return `[${embedding.join(',')}]`;
}

// POST /api/capture
// Recebe o descritor facial (128 numeros) gerado no navegador no stand
// e registra o visitante, evitando duplicar quem tirou foto 2x por engano.
router.post('/', async (req, res) => {
  try {
    const { embedding } = req.body;

    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return res.status(400).json({ error: 'embedding invalido, esperado array de 128 numeros' });
    }

    const vectorLiteral = toVectorLiteral(embedding);

    // Regra de negocio: antes de criar um novo registro, verifica se ja existe
    // um visitante muito parecido registrado neste mesmo evento (evita duplicata
    // por foto tirada duas vezes no stand).
    const existing = await pool.query(
      `SELECT id, embedding <-> $1 AS distance
       FROM visitors
       WHERE event_id = $2
       ORDER BY embedding <-> $1
       LIMIT 1`,
      [vectorLiteral, EVENT_ID]
    );

    if (existing.rows.length > 0 && existing.rows[0].distance <= MATCH_THRESHOLD) {
      return res.json({
        status: 'already_registered',
        visitor_id: existing.rows[0].id,
        distance: existing.rows[0].distance,
      });
    }

    const inserted = await pool.query(
      `INSERT INTO visitors (event_id, embedding)
       VALUES ($1, $2)
       RETURNING id, captured_at`,
      [EVENT_ID, vectorLiteral]
    );

    return res.status(201).json({
      status: 'registered',
      visitor_id: inserted.rows[0].id,
      captured_at: inserted.rows[0].captured_at,
    });
  } catch (err) {
    console.error('Erro em /api/capture:', err);
    return res.status(500).json({ error: 'erro interno ao registrar visitante' });
  }
});

module.exports = router;
