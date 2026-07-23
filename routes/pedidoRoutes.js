const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
// Importamos nuestros middlewares de seguridad
const { protegerRuta, requerirPermiso } = require('../middlewares/authMiddleware');

// Ruta súper protegida: Debes tener Token válido Y permiso de 'realizar_checkout'
router.post('/checkout', protegerRuta, requerirPermiso('realizar_checkout'), pedidoController.crearPedido);

module.exports = router;