// Controlador de Telemetría y Notificaciones para Wear OS / Dispositivos Inteligentes
// Arquitectura Multi-Tenant por Usuario (Smartwatch desacoplado por cuenta)

// Mapas de persistencia en memoria indexados por ID de usuario
const estadosPorUsuario = new Map();
const notificacionesPorUsuario = new Map();
let ultimoUsuarioVinculado = '1';

// Estado inicial: ¡Desvinculado por defecto para todos los usuarios!
const getEstadoDefecto = () => ({
    conectado: false, // Desvinculado por defecto
    dispositivo: 'Wear OS XL Round',
    modelo: 'Wear OS · 1.28"',
    protocolo: 'Bridge HTTP / 10.0.2.2 (GATT Emulado)',
    bpm: 0,
    bateria: 100,
    modo: 'DESCONECTADO',
    latenciaMs: 150,
    pulsoBasal: 70,
    ultimaLectura: null
});

// Resuelve el ID del usuario objetivo:
// 1. Token JWT en sesión activa (req.usuarioLogueado.id)
// 2. Header explícito 'x-user-id'
// 3. Campo 'id_usuario' en body o query
// 4. Último usuario que vinculó su reloj en la sesión del servidor (o '1')
const resolverIdUsuario = (req) => {
    if (req.usuarioLogueado && req.usuarioLogueado.id) {
        return String(req.usuarioLogueado.id);
    }
    if (req.headers && req.headers['x-user-id']) {
        return String(req.headers['x-user-id']);
    }
    if (req.body && req.body.id_usuario) {
        return String(req.body.id_usuario);
    }
    if (req.query && req.query.id_usuario) {
        return String(req.query.id_usuario);
    }
    return ultimoUsuarioVinculado || '1';
};

const obtenerEstadoUsuario = (idUsuario) => {
    const key = String(idUsuario);
    if (!estadosPorUsuario.has(key)) {
        estadosPorUsuario.set(key, getEstadoDefecto());
    }
    return estadosPorUsuario.get(key);
};

const obtenerColaUsuario = (idUsuario) => {
    const key = String(idUsuario);
    if (!notificacionesPorUsuario.has(key)) {
        notificacionesPorUsuario.set(key, []);
    }
    return notificacionesPorUsuario.get(key);
};

// Recibir telemetría desde el emulador de Wear OS (POST /api/wearable/telemetria)
const recibirTelemetria = (req, res) => {
    const idUsuario = resolverIdUsuario(req);
    const estado = obtenerEstadoUsuario(idUsuario);
    const cola = obtenerColaUsuario(idUsuario);

    const { bpm, bateria, modo, dispositivo, latenciaMs } = req.body;

    if (bpm !== undefined) {
        const bpmNum = parseInt(bpm, 10);
        if (!isNaN(bpmNum) && bpmNum >= 30 && bpmNum <= 240) {
            estado.bpm = bpmNum;
        }
    }

    if (bateria !== undefined) {
        const batNum = parseInt(bateria, 10);
        if (!isNaN(batNum) && batNum >= 0 && batNum <= 100) {
            estado.bateria = batNum;
        }
    }

    if (modo) estado.modo = String(modo).trim();
    if (dispositivo) estado.dispositivo = String(dispositivo).trim();
    if (latenciaMs) estado.latenciaMs = Number(latenciaMs);

    estado.ultimaLectura = new Date().toISOString();

    // Detección automática de pico crítico para generar alerta háptica
    if (estado.conectado && estado.bpm > 95) {
        cola.push({
            id: Date.now(),
            titulo: '¡Alerta de Pulso!',
            mensaje: `Pico de ${estado.bpm} BPM alcanzado`,
            icono: 'corazon',
            vibrar: true,
            timestamp: new Date().toISOString()
        });
    }

    res.status(200).json({
        mensaje: 'Telemetría registrada correctamente',
        id_usuario: idUsuario,
        estado: estado
    });
};

// Consultar telemetría actual del usuario (GET /api/wearable/telemetria)
const obtenerTelemetria = (req, res) => {
    const idUsuario = resolverIdUsuario(req);
    const estado = obtenerEstadoUsuario(idUsuario);
    res.status(200).json({ ...estado, id_usuario: idUsuario });
};

// Probar vibración háptica en el reloj (POST /api/wearable/vibrar)
const probarVibracion = (req, res) => {
    const idUsuario = resolverIdUsuario(req);
    const cola = obtenerColaUsuario(idUsuario);

    const nuevaAlerta = {
        id: Date.now(),
        titulo: 'Prueba Háptica',
        mensaje: 'Vibración detonada desde TotoCards Web',
        icono: 'vibracion',
        vibrar: true,
        timestamp: new Date().toISOString()
    };
    cola.push(nuevaAlerta);

    res.status(200).json({
        mensaje: 'Señal de vibración enviada al smartwatch',
        id_usuario: idUsuario,
        notificacion: nuevaAlerta
    });
};

// Enviar notificación al smartwatch (POST /api/wearable/notificacion) - Práctica 4
const enviarNotificacion = (req, res) => {
    const idUsuario = resolverIdUsuario(req);
    const cola = obtenerColaUsuario(idUsuario);
    const { titulo, mensaje, icono, vibrar } = req.body;

    if (!titulo || !mensaje) {
        return res.status(400).json({ mensaje: 'Título y mensaje son requeridos para la notificación.' });
    }

    // Regla de concisión técnica en pantalla circular (setContentTitle / setContentText)
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

    cola.push(notificacion);

    res.status(201).json({
        mensaje: 'Notificación encolada para Wear OS',
        id_usuario: idUsuario,
        notificacion
    });
};

// Obtener y consumir notificaciones pendientes desde el Wear OS (GET /api/wearable/notificaciones)
const consumirNotificaciones = (req, res) => {
    const idUsuario = resolverIdUsuario(req);
    const cola = obtenerColaUsuario(idUsuario);
    const pendientes = [...cola];
    notificacionesPorUsuario.set(String(idUsuario), []);

    res.status(200).json({
        id_usuario: idUsuario,
        total: pendientes.length,
        notificaciones: pendientes
    });
};

// Calibrar pulso basal (POST /api/wearable/calibrar)
const recalibrarPulsoBasal = (req, res) => {
    const idUsuario = resolverIdUsuario(req);
    const estado = obtenerEstadoUsuario(idUsuario);
    const { pulsoBasal } = req.body;

    if (pulsoBasal && !isNaN(Number(pulsoBasal))) {
        estado.pulsoBasal = Number(pulsoBasal);
    } else {
        estado.pulsoBasal = estado.bpm || 70;
    }

    res.status(200).json({
        mensaje: 'Pulso basal recalibrado',
        id_usuario: idUsuario,
        pulsoBasal: estado.pulsoBasal
    });
};

// Desvincular / Vincular dispositivo individual por usuario (POST /api/wearable/estado)
const cambiarEstadoConexion = (req, res) => {
    const idUsuario = resolverIdUsuario(req);
    const estado = obtenerEstadoUsuario(idUsuario);
    const { conectado } = req.body;

    estado.conectado = Boolean(conectado);
    if (!estado.conectado) {
        estado.bpm = 0;
        estado.modo = 'DESCONECTADO';
    } else {
        estado.bpm = 75;
        estado.modo = 'MODO APERTURA';
        ultimoUsuarioVinculado = String(idUsuario);
    }

    res.status(200).json({
        mensaje: estado.conectado ? 'Dispositivo vinculado al usuario' : 'Dispositivo desvinculado del usuario',
        id_usuario: idUsuario,
        estado: estado
    });
};

// Encolar notificación directamente desde otros controladores (ej. pedidoController al comprar)
const encolarNotificacionParaUsuario = (idUsuario, notif) => {
    const cola = obtenerColaUsuario(idUsuario);
    const tituloConciso = String(notif.titulo || 'Alerta').trim().slice(0, 30);
    const mensajeCondensado = String(notif.mensaje || '').trim().slice(0, 45);

    cola.push({
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
