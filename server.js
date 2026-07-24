const express = require('express');
const cors = require('cors');
require('dotenv').config();
const productoRoutes = require('./routes/productoRoutes');
const authRoutes = require('./routes/authRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');

// Importar la conexión a la base de datos
const db = require('./config/db');

const app = express();

// Middlewares obligatorios
app.use(cors()); // Permite que Angular (puerto 4200) se comunique con Express sin bloqueos
app.use(express.json()); // Permite que el servidor lea datos en formato JSON

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