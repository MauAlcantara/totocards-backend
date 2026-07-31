const { Pool } = require('pg');
require('dotenv').config();

// 1. Verificamos si estamos en producción (Render/Neon) leyendo DATABASE_URL
const isProduction = !!process.env.DATABASE_URL;

const pool = new Pool(
    isProduction
        ? {
              // Configuración para Render / Neon.tech
              connectionString: process.env.DATABASE_URL,
              ssl: {
                  rejectUnauthorized: false // Obligatorio para Neon en la nube
              }
          }
        : {
              // Configuración para Desarrollo Local (tu computadora)
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