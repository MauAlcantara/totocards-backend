const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');

router.get('/', productoController.obtenerProductos);
router.get('/preventas', productoController.obtenerPreventas);
router.get('/buscar', productoController.buscarProductos);
router.get('/:id', productoController.obtenerProductoPorId);



module.exports = router;