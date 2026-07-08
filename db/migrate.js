require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function waitForDatabase(maxAttempts = 20, delayMs = 2000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) {
        throw err;
      }
      console.warn(`[db] ainda aguardando o banco (${attempt}/${maxAttempts}): ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

async function migrate() {
  await waitForDatabase();
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
