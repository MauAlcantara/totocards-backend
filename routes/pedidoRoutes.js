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
        
        // 🔥 CONSULTA AVANZADA: Usa EXISTS para saber si el pedido incluye una Preventa
        const consultaSQL = `
            SELECT p.*,
                   EXISTS (
                       SELECT 1 
                       FROM Detalles_Pedido dp
                       JOIN Productos prod ON dp.id_producto = prod.id_producto
                       WHERE dp.id_pedido = p.id_pedido AND prod.estado = 'PREVENTA'
                   ) AS es_preventa
            FROM Pedidos p 
            WHERE p.id_usuario = $1 
            ORDER BY p.fecha_creacion DESC
        `;
        
        const resultado = await db.query(consultaSQL, [id_usuario]);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ mensaje: 'Error al consultar el historial de compras' });
    }
});

module.exports = router;