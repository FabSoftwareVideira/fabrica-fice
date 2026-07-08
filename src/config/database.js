const { Pool } = require('pg');

const host = process.env.POSTGRES_HOST || (process.env.DOCKER_CONTAINER === 'true' ? 'db' : 'localhost');

const pool = new Pool({
    host,
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

pool.on('error', (err) => {
    console.error('[db] unexpected error on idle client', err.message);
});

module.exports = { pool };