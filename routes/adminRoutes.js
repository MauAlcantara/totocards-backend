const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protegerRuta, requerirPermiso } = require('../middlewares/authMiddleware');

// ==========================================
// RUTAS CRUD USUARIOS
// ==========================================
router.get('/usuarios', protegerRuta, requerirPermiso('ver_dashboard'), adminController.obtenerUsuarios);

// 🔥 LAS 3 NUEVAS RUTAS
router.post('/usuarios', protegerRuta, requerirPermiso('ver_dashboard'), adminController.crearUsuario);
router.put('/usuarios/:id', protegerRuta, requerirPermiso('ver_dashboard'), adminController.actualizarUsuario);
router.delete('/usuarios/:id', protegerRuta, requerirPermiso('ver_dashboard'), adminController.eliminarUsuario);

// Ruta de estado
router.put('/usuarios/:id/estado', protegerRuta, requerirPermiso('ver_dashboard'), adminController.cambiarEstadoUsuario);

// ==========================================
// RUTAS CRUD PRODUCTOS
// ==========================================
router.post('/productos', protegerRuta, requerirPermiso('gestionar_productos'), adminController.crearProducto);
router.put('/productos/:id', protegerRuta, requerirPermiso('gestionar_productos'), adminController.actualizarProducto);
router.delete('/productos/:id', protegerRuta, requerirPermiso('gestionar_productos'), adminController.eliminarProducto);

module.exports = router;