const { Pool } = require('pg');

const host = process.env.POSTGRES_HOST || process.env.PGHOST || (process.env.DOCKER_CONTAINER === 'true' ? 'db' : 'localhost');
const port = Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5432);
const user = process.env.POSTGRES_USER || process.env.PGUSER;
const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;
const database = process.env.POSTGRES_DB || process.env.PGDATABASE;
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
    connectionString
        ? { connectionString }
        : {
            host,
            port,
            user,
            password,
            database,
        }
);

pool.on('error', (err) => {
    console.error('[db] unexpected error on idle client', err.message);
});

module.exports = { pool };