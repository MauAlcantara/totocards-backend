const express = require('express');
const router = express.Router();
const db = require('../config/db');
const pedidoController = require('../controllers/pedidoController');
const { protegerRuta, requerirPermiso } = require('../middlewares/authMiddleware');

// Ruta de Checkout
router.post('/checkout', protegerRuta, requerirPermiso('realizar_checkout'), pedidoController.crearPedido);

// Ruta de Mis Compras
router.get('/mis-compras', protegerRuta, pedidoController.obtenerMisCompras);

// Ruta de Detalle de Pedido
router.get('/:id', protegerRuta, pedidoController.obtenerPedidoPorId);

module.exports = router;