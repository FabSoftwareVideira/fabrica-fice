require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const configuredHost = process.env.POSTGRES_HOST || 'localhost';
const host = configuredHost === 'db' && process.env.DOCKER_CONTAINER !== 'true'
  ? 'localhost'
  : configuredHost;

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
    host,
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  };

const pool = new Pool(poolConfig);

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema aplicado com sucesso.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Erro ao aplicar schema:', err);
  process.exit(1);
});
