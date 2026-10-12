// Controlador de Telemetría y Notificaciones para Wear OS / Dispositivos Inteligentes

// Estado global y reactivo de telemetría entre Wear OS (Emulador/Físico) y Frontend Web
let estadoGlobal = {
    conectado: true,
    dispositivo: 'Wear OS Emulator (XL Round)',
    modelo: 'Wear OS · 1.28"',
    protocolo: 'Bridge HTTP / 10.0.2.2 (GATT Emulado)',
    bpm: 78,
    bateria: 100,
    modo: 'MODO APERTURA',
    latenciaMs: 120,
    pulsoBasal: 70,
    ultimaLectura: new Date().toISOString()
};

// Cola de notificaciones pendientes para Wear OS (Práctica 4)
let colaNotificaciones = [];

// Recibir telemetría desde el emulador de Wear OS (POST /api/wearable/telemetria)
const recibirTelemetria = (req, res) => {
    const { bpm, bateria, modo, dispositivo, latenciaMs } = req.body;

    if (bpm !== undefined) {
        const bpmNum = parseInt(bpm, 10);
        if (!isNaN(bpmNum) && bpmNum >= 30 && bpmNum <= 240) {
            estadoGlobal.bpm = bpmNum;
        }
    }

    if (bateria !== undefined) {
        const batNum = parseInt(bateria, 10);
        if (!isNaN(batNum) && batNum >= 0 && batNum <= 100) {
            estadoGlobal.bateria = batNum;
        }
    }

    if (modo) estadoGlobal.modo = String(modo).trim();
    if (dispositivo) estadoGlobal.dispositivo = String(dispositivo).trim();
    if (latenciaMs) estadoGlobal.latenciaMs = Number(latenciaMs);

    estadoGlobal.conectado = true;
    estadoGlobal.ultimaLectura = new Date().toISOString();

    // Detección automática de pico crítico para generar alerta háptica (Pág. 15 del reporte)
    if (estadoGlobal.bpm > 95) {
        const yaExisteAlerta = colaNotificaciones.some(n => n.icono === 'corazon' && (Date.now() - n.id < 5000));
        if (!yaExisteAlerta) {
            colaNotificaciones.push({
                id: Date.now(),
                titulo: '¡Alerta de Pulso!',
                mensaje: `Pico de ${estadoGlobal.bpm} BPM alcanzado`,
                icono: 'corazon',
                vibrar: true,
                timestamp: new Date().toISOString()
            });
        }
    }

    res.status(200).json({
        mensaje: 'Telemetría registrada correctamente',
        conectado: true,
        estado: estadoGlobal
    });
};

// Consultar telemetría actual (GET /api/wearable/telemetria)
const obtenerTelemetria = (req, res) => {
    res.status(200).json(estadoGlobal);
};

// Probar vibración háptica en el reloj (POST /api/wearable/vibrar)
const probarVibracion = (req, res) => {
    const nuevaAlerta = {
        id: Date.now(),
        titulo: 'Prueba Háptica',
        mensaje: 'Vibración detonada desde TotoCards Web',
        icono: 'vibracion',
        vibrar: true,
        timestamp: new Date().toISOString()
    };
    colaNotificaciones.push(nuevaAlerta);

    res.status(200).json({
        mensaje: 'Señal de vibración enviada al smartwatch',
        notificacion: nuevaAlerta
    });
};

// Enviar notificación al smartwatch (POST /api/wearable/notificacion) - Práctica 4
const enviarNotificacion = (req, res) => {
    const { titulo, mensaje, icono, vibrar } = req.body;

    if (!titulo || !mensaje) {
        return res.status(400).json({ mensaje: 'Título y mensaje son requeridos para la notificación.' });
    }

    const tituloConciso = String(titulo).trim().slice(0, 30);
    const mensajeCondensado = String(mensaje).trim().slice(0, 45);

    const notificacion = {
        id: Date.now(),
        titulo: tituloConciso,
        mensaje: mensajeCondensado,
        icono: icono || 'alerta',
        vibrar: vibrar !== undefined ? Boolean(vibrar) : true,
        timestamp: new Date().toISOString()
    };

    colaNotificaciones.push(notificacion);

    res.status(201).json({
        mensaje: 'Notificación encolada para Wear OS',
        notificacion
    });
};

// Obtener y consumir notificaciones pendientes desde el Wear OS (GET /api/wearable/notificaciones)
const consumirNotificaciones = (req, res) => {
    const pendientes = [...colaNotificaciones];
    colaNotificaciones = [];

    res.status(200).json({
        total: pendientes.length,
        notificaciones: pendientes
    });
};

// Calibrar pulso basal (POST /api/wearable/calibrar)
const recalibrarPulsoBasal = (req, res) => {
    const { pulsoBasal } = req.body;
    const valor = (pulsoBasal && !isNaN(Number(pulsoBasal))) ? Number(pulsoBasal) : (estadoGlobal.bpm || 70);
    estadoGlobal.pulsoBasal = valor;

    res.status(200).json({
        mensaje: 'Pulso basal recalibrado',
        pulsoBasal: valor
    });
};

// Desvincular / Vincular dispositivo (POST /api/wearable/estado)
const cambiarEstadoConexion = (req, res) => {
    const { conectado } = req.body;
    const nuevoEstado = Boolean(conectado);
    estadoGlobal.conectado = nuevoEstado;

    if (!nuevoEstado) {
        estadoGlobal.bpm = 0;
        estadoGlobal.modo = 'DESCONECTADO';
    } else {
        estadoGlobal.bpm = 78;
        estadoGlobal.modo = 'MODO APERTURA';
    }

    res.status(200).json({
        mensaje: nuevoEstado ? 'Dispositivo vinculado' : 'Dispositivo desvinculado',
        estado: estadoGlobal
    });
};

// Encolar notificación directamente desde otros controladores (ej. pedidoController al comprar)
const encolarNotificacionParaUsuario = (idUsuario, notif) => {
    const tituloConciso = String(notif.titulo || 'Alerta').trim().slice(0, 30);
    const mensajeCondensado = String(notif.mensaje || '').trim().slice(0, 45);

    colaNotificaciones.push({
        id: Date.now(),
        titulo: tituloConciso,
        mensaje: mensajeCondensado,
        icono: notif.icono || 'compra',
        vibrar: notif.vibrar !== undefined ? Boolean(notif.vibrar) : true,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    recibirTelemetria,
    obtenerTelemetria,
    probarVibracion,
    enviarNotificacion,
    consumirNotificaciones,
    recalibrarPulsoBasal,
    cambiarEstadoConexion,
    encolarNotificacionParaUsuario
};
