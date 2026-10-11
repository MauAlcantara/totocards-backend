const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const wearableController = require('../controllers/wearableController');

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware de extracción de sesión opcional para aislar el dispositivo por cuenta de usuario
const autenticarOpcional = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token && JWT_SECRET) {
        try {
            req.usuarioLogueado = jwt.verify(token, JWT_SECRET);
        } catch (_) {}
    }
    next();
};

router.use(autenticarOpcional);

// Rutas de Telemetría (comunicación con emulador de Wear OS y dashboard Web)
router.get('/telemetria', wearableController.obtenerTelemetria);
router.post('/telemetria', wearableController.recibirTelemetria);

// Rutas de Actuación Háptica y Notificaciones (Práctica 4)
router.post('/vibrar', wearableController.probarVibracion);
router.post('/notificacion', wearableController.enviarNotificacion);
router.get('/notificaciones', wearableController.consumirNotificaciones);

// Calibración y Estado de Dispositivo (Práctica 1)
router.post('/calibrar', wearableController.recalibrarPulsoBasal);
router.post('/estado', wearableController.cambiarEstadoConexion);

module.exports = router;
