const { Pool } = require('pg');
require('dotenv').config();

const isProduction = !!process.env.DATABASE_URL;

const pool = new Pool(
    isProduction
        ? {
              // Configuración para Render / Neon.tech
              connectionString: process.env.DATABASE_URL,
              ssl: {
                  rejectUnauthorized: false 
              }
          }
        : {
              // Configuración para Desarrollo Local 
              user: process.env.DB_USER || 'postgres',
              host: process.env.DB_HOST || 'localhost',
              database: process.env.DB_NAME || 'totocards_db',
              password: process.env.DB_PASSWORD || '100605',
              port: process.env.DB_PORT || 5432,
          }
);

pool.on('connect', () => {
    console.log(`✅ Conexión exitosa a la base de datos de TotoCards (${isProduction ? 'Nube / Neon' : 'Local'})`);
});

pool.on('error', (err, client) => {
    console.error('⚠️ Conexión inactiva cerrada por Neon.tech (Se reconectará sola)');
});

module.exports = pool;