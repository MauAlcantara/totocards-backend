const express = require('express');
const cors = require('cors');
require('dotenv').config();
const productoRoutes = require('./routes/productoRoutes');
const authRoutes = require('./routes/authRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const db = require('./config/db');
const app = express();

// Middlewares obligatorios
app.use(cors());
app.use(express.json()); 

app.use('/api/productos', productoRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/admin', adminRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('¡El backend de TotoCards está funcionando a la perfección!');
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de TotoCards corriendo en el puerto ${PORT}`);
});