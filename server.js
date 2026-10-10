const express = require('express');
const cors = require('cors');
require('dotenv').config();
const productoRoutes = require('./routes/productoRoutes');
const authRoutes = require('./routes/authRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactoRoutes = require('./routes/contactoRoutes');
const db = require('./config/db');
const app = express();

// Configuración restrictiva de CORS (seguridad de dominios autorizados)
const origenesPermitidos = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        'http://localhost:4200',
        'http://localhost:3000',
        'https://totocards.vercel.app',
        'https://totocards-app.vercel.app'
      ];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (ej. curl, Postman o health checks en despliegue) o desde dominios autorizados
        if (!origin || origenesPermitidos.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Acceso no autorizado por la política CORS de TotoCards.'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '3mb' })); 

app.use('/api/productos', productoRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contacto', contactoRoutes);

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