const express = require('express');
const router = express.Router();
const db = require('../config/db');
const pedidoController = require('../controllers/pedidoController');
const { protegerRuta, requerirPermiso } = require('../middlewares/authMiddleware');

// 1. Ruta de Checkout: Requiere token y permiso de 'realizar_checkout'
router.post('/checkout', protegerRuta, requerirPermiso('realizar_checkout'), pedidoController.crearPedido);

// 2. Ruta de Mis Compras: Requiere token activo para consultar historial
router.get('/mis-compras', protegerRuta, async (req, res) => {
    try {
        const id_usuario = req.usuarioLogueado.id;
        
        // Consultamos las compras del usuario logueado en la base de datos
        const resultado = await db.query(
            'SELECT * FROM Pedidos WHERE id_usuario = $1 ORDER BY fecha_creacion DESC',
            [id_usuario]
        );
        
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ mensaje: 'Error al consultar el historial de compras' });
    }
});

module.exports = router;