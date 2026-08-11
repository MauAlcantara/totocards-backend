const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protegerRuta, requerirPermiso } = require('../middlewares/authMiddleware');
const contactoController = require('../controllers/contactoController');

// ==========================================
// RUTAS CRUD USUARIOS
// ==========================================
router.get('/usuarios', protegerRuta, requerirPermiso('ver_dashboard'), adminController.obtenerUsuarios);
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

// ==========================================
// RUTAS DE CONTACTO
// ==========================================
router.get('/mensajes', protegerRuta, requerirPermiso('ver_dashboard'), contactoController.obtenerMensajes);
router.put('/mensajes/:id/leido', protegerRuta, requerirPermiso('ver_dashboard'), contactoController.marcarLeido);

module.exports = router;