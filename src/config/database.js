const { Pool } = require('pg');

const host = process.env.POSTGRES_HOST || process.env.PGHOST || (process.env.DOCKER_CONTAINER === 'true' ? 'db' : 'localhost');
const port = Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5432);
const user = process.env.POSTGRES_USER || process.env.PGUSER;
const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;
const database = process.env.POSTGRES_DB || process.env.PGDATABASE;
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
    connectionString
        ? {
            connectionString,
            max: 20, // Máximo de conexões no pool (ajuste conforme o plano do seu banco)
            idleTimeoutMillis: 30000, // Tempo para fechar conexões ociosas (30s)
            connectionTimeoutMillis: 2000, // Tempo máximo para esperar por uma conexão disponível (2s)
        }
        : {
            host,
            port,
            user,
            password,
            database,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            keepAlive: true, // Mantém a conexão viva para evitar timeouts
        }
);

pool.on('error', (err) => {
    console.error('[db] unexpected error on idle client', err.message);
});

module.exports = { pool };