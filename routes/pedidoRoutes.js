const express = require('express');
const router = express.Router();
const db = require('../config/db');
const pedidoController = require('../controllers/pedidoController');
const { protegerRuta, requerirPermiso } = require('../middlewares/authMiddleware');

// Ruta de Checkout
router.post('/checkout', protegerRuta, requerirPermiso('realizar_checkout'), pedidoController.crearPedido);

// Ruta de Mis Compras
router.get('/mis-compras', protegerRuta, async (req, res) => {
    try {
        const id_usuario = req.usuarioLogueado.id;
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

router.get('/:id', protegerRuta, async (req, res) => {
    try {
        const id_pedido = req.params.id;
        const id_usuario = req.usuarioLogueado.id;

        const pedido = await db.query('SELECT * FROM Pedidos WHERE id_pedido = $1 AND id_usuario = $2', [id_pedido, id_usuario]);
        
        if (pedido.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Pedido no encontrado o no autorizado.' });
        }

        const detalles = await db.query(`
            SELECT dp.cantidad, dp.precio_unitario, prod.nombre, prod.imagen_url, prod.id_producto
            FROM Detalles_Pedido dp
            JOIN Productos prod ON dp.id_producto = prod.id_producto
            WHERE dp.id_pedido = $1
        `, [id_pedido]);

        res.status(200).json({
            pedido: pedido.rows[0],
            detalles: detalles.rows
        });

    } catch (error) {
        console.error('Error al obtener detalle del pedido:', error);
        res.status(500).json({ mensaje: 'Error al cargar los detalles de la compra.' });
    }
});

module.exports = router;