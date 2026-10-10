const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const authController = require('../controllers/authController');
const { protegerRuta } = require('../middlewares/authMiddleware');

// Rutas de tipo POST para datos sensibles
router.post('/registro', authController.registrar);
router.post('/login', authController.login);

// Ruta para actualizar nombre y avatar del perfil
router.put('/actualizar-perfil', protegerRuta, authController.actualizarPerfil);

module.exports = router;