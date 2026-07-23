const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de tipo POST porque el usuario nos está enviando datos sensibles
router.post('/registro', authController.registrar);
router.post('/login', authController.login);

module.exports = router;