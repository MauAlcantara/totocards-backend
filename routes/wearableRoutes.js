const express = require('express');
const router = express.Router();
const wearableController = require('../controllers/wearableController');

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
