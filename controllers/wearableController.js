// Controlador de Telemetría y Notificaciones para Wear OS / Dispositivos Inteligentes

// Estado global activo de sincronización directa entre Emulador y Dashboard Web
let estadoGlobal = {
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

let colaGlobal = [];

// Mapas opcionales por usuario (para aislamiento cuando se requiera vincular/desvincular cuentas específicas)
const estadosPorUsuario = new Map();
const notificacionesPorUsuario = new Map();
let ultimoUsuarioVinculado = '1';

const getEstadoDefecto = () => ({
    ...estadoGlobal,
    conectado: true,
    bpm: estadoGlobal.bpm || 78,
    ultimaLectura: new Date().toISOString()
});

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
            estadoGlobal.bpm = bpmNum;
        }
    }

    if (bateria !== undefined) {
        const batNum = parseInt(bateria, 10);
        if (!isNaN(batNum) && batNum >= 0 && batNum <= 100) {
            estado.bateria = batNum;
            estadoGlobal.bateria = batNum;
        }
    }

    if (modo) {
        estado.modo = String(modo).trim();
        estadoGlobal.modo = String(modo).trim();
    }
    if (dispositivo) {
        estado.dispositivo = String(dispositivo).trim();
        estadoGlobal.dispositivo = String(dispositivo).trim();
    }
    if (latenciaMs) {
        estado.latenciaMs = Number(latenciaMs);
        estadoGlobal.latenciaMs = Number(latenciaMs);
    }

    // El emulador está transmitiendo activamente, por lo que el enlace está 100% activo
    estado.conectado = true;
    estadoGlobal.conectado = true;
    estado.ultimaLectura = new Date().toISOString();
    estadoGlobal.ultimaLectura = estado.ultimaLectura;

    // Detección de picos para alertas hápticas en el reloj
    if (estado.bpm > 95) {
        const alertaPico = {
            id: Date.now(),
            titulo: '¡Alerta de Pulso!',
            mensaje: `Pico de ${estado.bpm} BPM alcanzado`,
            icono: 'corazon',
            vibrar: true,
            timestamp: new Date().toISOString()
        };
        cola.push(alertaPico);
        colaGlobal.push(alertaPico);
    }

    res.status(200).json({
        mensaje: 'Telemetría registrada correctamente',
        id_usuario: idUsuario,
        conectado: true,
        estado: estado
    });
};

// Consultar telemetría actual (GET /api/wearable/telemetria)
const obtenerTelemetria = (req, res) => {
    const idUsuario = resolverIdUsuario(req);
    const estado = obtenerEstadoUsuario(idUsuario);
    
    // Si el estado por usuario tiene BPM, usarlo; de lo contrario sincronizar con el estado global activo
    const telemetriaFinal = {
        ...estadoGlobal,
        ...estado,
        bpm: (estado.bpm && estado.bpm > 0) ? estado.bpm : estadoGlobal.bpm,
        conectado: estado.conectado !== undefined ? estado.conectado : estadoGlobal.conectado
    };

    res.status(200).json({ ...telemetriaFinal, id_usuario: idUsuario });
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
    colaGlobal.push(nuevaAlerta);

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
    colaGlobal.push(notificacion);

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
    
    // Consumir tanto de la cola del usuario como de la cola global
    const pendientes = [...cola, ...colaGlobal];
    notificacionesPorUsuario.set(String(idUsuario), []);
    colaGlobal = [];

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

    const valor = (pulsoBasal && !isNaN(Number(pulsoBasal))) ? Number(pulsoBasal) : (estado.bpm || 70);
    estado.pulsoBasal = valor;
    estadoGlobal.pulsoBasal = valor;

    res.status(200).json({
        mensaje: 'Pulso basal recalibrado',
        id_usuario: idUsuario,
        pulsoBasal: valor
    });
};

// Desvincular / Vincular dispositivo (POST /api/wearable/estado)
const cambiarEstadoConexion = (req, res) => {
    const idUsuario = resolverIdUsuario(req);
    const estado = obtenerEstadoUsuario(idUsuario);
    const { conectado } = req.body;

    const nuevoEstado = Boolean(conectado);
    estado.conectado = nuevoEstado;
    estadoGlobal.conectado = nuevoEstado;

    if (!nuevoEstado) {
        estado.bpm = 0;
        estado.modo = 'DESCONECTADO';
    } else {
        estado.bpm = 78;
        estado.modo = 'MODO APERTURA';
        ultimoUsuarioVinculado = String(idUsuario);
    }

    res.status(200).json({
        mensaje: nuevoEstado ? 'Dispositivo vinculado' : 'Dispositivo desvinculado',
        id_usuario: idUsuario,
        estado: estado
    });
};

// Encolar notificación directamente desde otros controladores (ej. pedidoController al comprar)
const encolarNotificacionParaUsuario = (idUsuario, notif) => {
    const cola = obtenerColaUsuario(idUsuario);
    const tituloConciso = String(notif.titulo || 'Alerta').trim().slice(0, 30);
    const mensajeCondensado = String(notif.mensaje || '').trim().slice(0, 45);

    const item = {
        id: Date.now(),
        titulo: tituloConciso,
        mensaje: mensajeCondensado,
        icono: notif.icono || 'compra',
        vibrar: notif.vibrar !== undefined ? Boolean(notif.vibrar) : true,
        timestamp: new Date().toISOString()
    };

    cola.push(item);
    colaGlobal.push(item);
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
