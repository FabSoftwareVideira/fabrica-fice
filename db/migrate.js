require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('[db] schema aplicado com sucesso.');
  return true;
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error('[db] erro ao aplicar schema:', err);
    process.exit(1);
  });
}

module.exports = { migrate };
