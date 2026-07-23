const express = require('express');
const router = express.Router();

// Importamos la lógica que acabamos de crear en el controlador
const productoController = require('../controllers/productoController');

// Definimos los endpoints y los conectamos con su respectiva función
// Cuando alguien entre a '/' (que será /api/productos), ejecuta obtenerProductos
router.get('/', productoController.obtenerProductos);

router.get('/preventas', productoController.obtenerPreventas);

router.get('/buscar', productoController.buscarProductos);

// Cuando alguien entre a '/:id', ejecuta obtenerProductoPorId
router.get('/:id', productoController.obtenerProductoPorId);



module.exports = router;