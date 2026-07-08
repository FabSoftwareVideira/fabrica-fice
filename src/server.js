const app = require('./app');
const { migrate } = require('../db/migrate');

const PORT = process.env.PORT || 3000;

migrate()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`[server] running on port ${PORT}`);
            console.log(`[server] env: ${process.env.APP_ENV || 'development'}`);
            console.log(`[server] version: ${process.env.APP_VERSION || 'dev'}`);
        });
    })
    .catch((err) => {
        console.error('[server] falha ao inicializar o schema do banco:', err);
        process.exit(1);
    });