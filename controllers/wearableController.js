// Controlador de Telemetría y Notificaciones para Wear OS / Dispositivos Inteligentes

let estadoWearable = {
    conectado: true,
    dispositivo: 'Wear OS Emulator (XL Round)',
    modelo: 'Wear OS · 1.28"',
    protocolo: 'Bridge HTTP / 10.0.2.2 (GATT Emulado)',
    bpm: 78,
    bateria: 100,
    modo: 'MODO APERTURA',
    latenciaMs: 150,
    pulsoBasal: 70,
    ultimaLectura: new Date().toISOString()
};

// Cola de notificaciones pendientes para el emulador Wear OS (Práctica 4)
let notificacionesPendientes = [];

// Recibir telemetría desde el emulador de Wear OS (POST /api/wearable/telemetria)
const recibirTelemetria = (req, res) => {
    const { bpm, bateria, modo, dispositivo, latenciaMs } = req.body;

    if (bpm !== undefined) {
        const bpmNum = parseInt(bpm, 10);
        if (!isNaN(bpmNum) && bpmNum >= 30 && bpmNum <= 240) {
            estadoWearable.bpm = bpmNum;
        }
    }

    if (bateria !== undefined) {
        const batNum = parseInt(bateria, 10);
        if (!isNaN(batNum) && batNum >= 0 && batNum <= 100) {
            estadoWearable.bateria = batNum;
        }
    }

    if (modo) estadoWearable.modo = String(modo).trim();
    if (dispositivo) estadoWearable.dispositivo = String(dispositivo).trim();
    if (latenciaMs) estadoWearable.latenciaMs = Number(latenciaMs);

    estadoWearable.conectado = true;
    estadoWearable.ultimaLectura = new Date().toISOString();

    // Detección automática de pico crítico para generar alerta háptica (Pág. 15 del reporte)
    if (estadoWearable.bpm > 95) {
        notificacionesPendientes.push({
            id: Date.now(),
            titulo: '¡Alerta de Pulso!',
            mensaje: `Pico de ${estadoWearable.bpm} BPM alcanzado`,
            icono: 'corazon',
            vibrar: true,
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        mensaje: 'Telemetría registrada correctamente',
        estado: estadoWearable
    });
};

// Consultar telemetría actual (GET /api/wearable/telemetria)
const obtenerTelemetria = (req, res) => {
    res.status(200).json(estadoWearable);
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
    notificacionesPendientes.push(nuevaAlerta);

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

    // Regla de concisión técnica exigida en la Pág. 15 (setContentTitle / setContentText)
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

    notificacionesPendientes.push(notificacion);

    res.status(201).json({
        mensaje: 'Notificación encolada para Wear OS',
        notificacion
    });
};

// Obtener y consumir notificaciones pendientes desde el Wear OS (GET /api/wearable/notificaciones)
const consumirNotificaciones = (req, res) => {
    const pendientes = [...notificacionesPendientes];
    // Limpiar cola una vez consumidas por el emulador
    notificacionesPendientes = [];

    res.status(200).json({
        total: pendientes.length,
        notificaciones: pendientes
    });
};

// Calibrar pulso basal (POST /api/wearable/calibrar)
const recalibrarPulsoBasal = (req, res) => {
    const { pulsoBasal } = req.body;
    if (pulsoBasal && !isNaN(Number(pulsoBasal))) {
        estadoWearable.pulsoBasal = Number(pulsoBasal);
    } else {
        estadoWearable.pulsoBasal = estadoWearable.bpm || 70;
    }

    res.status(200).json({
        mensaje: 'Pulso basal recalibrado',
        pulsoBasal: estadoWearable.pulsoBasal
    });
};

// Desvincular / Vincular dispositivo
const cambiarEstadoConexion = (req, res) => {
    const { conectado } = req.body;
    estadoWearable.conectado = Boolean(conectado);
    if (!estadoWearable.conectado) {
        estadoWearable.bpm = 0;
    } else {
        estadoWearable.bpm = 75;
    }

    res.status(200).json({
        mensaje: estadoWearable.conectado ? 'Dispositivo vinculado' : 'Dispositivo desvinculado',
        estado: estadoWearable
    });
};

module.exports = {
    recibirTelemetria,
    obtenerTelemetria,
    probarVibracion,
    enviarNotificacion,
    consumirNotificaciones,
    recalibrarPulsoBasal,
    cambiarEstadoConexion
};
