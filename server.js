const express = require('express');
const cors = require('cors');
require('dotenv').config();
const productoRoutes = require('./routes/productoRoutes');
const authRoutes = require('./routes/authRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactoRoutes = require('./routes/contactoRoutes');
const wearableRoutes = require('./routes/wearableRoutes');
const db = require('./config/db');
const app = express();

// Configuración de CORS con soporte para Vercel y dominios autorizados
const origenesConfigurados = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

const origenesPorDefecto = [
    'http://localhost:4200',
    'http://localhost:3000',
    'https://totocards-frontend.vercel.app',
    'https://totocards.vercel.app',
    'https://totocards-app.vercel.app'
];

const todosLosOrigenes = [...new Set([...origenesPorDefecto, ...origenesConfigurados])];

const corsOptions = {
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (ej. curl, Postman o SSR server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        // Permitir si está en la lista explícita o coincide con dominios/previews de TotoCards en Vercel
        const esPermitido = todosLosOrigenes.includes(origin) || 
            /^https:\/\/totocards([a-zA-Z0-9-]*)\.vercel\.app$/.test(origin);

        if (esPermitido) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Origen bloqueado por política de seguridad: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '3mb' })); 

app.use('/api/productos', productoRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contacto', contactoRoutes);
app.use('/api/wearable', wearableRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('¡El backend de TotoCards está funcionando a la perfección!');
});

// Middleware centralizado de manejo de errores
app.use((err, req, res, next) => {
    console.error('⚠️ [Error Handler]:', err.message);
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ mensaje: err.message });
    }
    res.status(err.status || 500).json({ 
        mensaje: err.message || 'Error interno del servidor en TotoCards.' 
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de TotoCards corriendo en el puerto ${PORT}`);
});