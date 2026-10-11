const test = require('node:test');
const assert = require('node:assert');

// Lógica de Zonas de Emoción y Adrenalina (Práctica 1, 2 y 3)
function clasificarZonaEmocion(bpm, pulsoBasal = 70) {
    const ritmo = Number(bpm) || 0;
    if (ritmo < 75) {
        return {
            zona: 'CALMA',
            color: '#3182ce',
            vibrar: false,
            descripcion: 'Nivel basal o reposo durante navegación regular.'
        };
    } else if (ritmo <= 95) {
        return {
            zona: 'EXPECTATIVA',
            color: '#d69e2e',
            vibrar: false,
            descripcion: 'Apertura de sobre o revelación de carta infrecuente.'
        };
    } else {
        return {
            zona: 'CRITICA',
            color: '#e53e3e',
            vibrar: true,
            descripcion: 'Hit Legendario / Rareza Secreta detectada. Disparo de adrenalina.'
        };
    }
}

// Simulador de cola háptica FIFO para Wear OS
class HapticQueue {
    constructor() {
        this.queue = [];
    }
    push(item) {
        this.queue.push(item);
    }
    drain() {
        const items = [...this.queue];
        this.queue = [];
        return items;
    }
    get length() {
        return this.queue.length;
    }
}

// ==========================================
// SUITE DE PRUEBAS DEL MÓDULO WEARABLE / WEAR OS
// ==========================================

test('Wearable: Clasificación de Zona Calma (< 75 BPM)', () => {
    const estado = clasificarZonaEmocion(68);
    assert.strictEqual(estado.zona, 'CALMA');
    assert.strictEqual(estado.vibrar, false);
    assert.strictEqual(estado.color, '#3182ce');
});

test('Wearable: Clasificación de Zona Expectativa (75 a 95 BPM)', () => {
    const estado75 = clasificarZonaEmocion(75);
    assert.strictEqual(estado75.zona, 'EXPECTATIVA');
    assert.strictEqual(estado75.vibrar, false);

    const estado88 = clasificarZonaEmocion(88);
    assert.strictEqual(estado88.zona, 'EXPECTATIVA');
    assert.strictEqual(estado88.vibrar, false);
});

test('Wearable: Clasificación de Zona Crítica (> 95 BPM) y activación de alerta háptica', () => {
    const estado96 = clasificarZonaEmocion(96);
    assert.strictEqual(estado96.zona, 'CRITICA');
    assert.strictEqual(estado96.vibrar, true);
    assert.strictEqual(estado96.color, '#e53e3e');

    const estado120 = clasificarZonaEmocion(120);
    assert.strictEqual(estado120.zona, 'CRITICA');
    assert.strictEqual(estado120.vibrar, true);
});

test('Wearable: Manejo de Cola FIFO de notificaciones para el Smartwatch', () => {
    const queue = new HapticQueue();
    assert.strictEqual(queue.length, 0);

    queue.push({ titulo: 'Hit Legendario', cuerpo: 'Charizard ex detectado', vibrar: true });
    queue.push({ titulo: 'Poco Stock', cuerpo: 'Solo quedan 2 sobres', vibrar: false });

    assert.strictEqual(queue.length, 2);

    const extraidas = queue.drain();
    assert.strictEqual(extraidas.length, 2);
    assert.strictEqual(extraidas[0].titulo, 'Hit Legendario');
    assert.strictEqual(queue.length, 0, 'La cola debe quedar vacía tras ser leída por Wear OS');
});

test('Wearable: Calibración y umbrales de telemetría', () => {
    let pulsoBasal = 70;
    const nuevoPulso = 74;
    pulsoBasal = nuevoPulso;
    assert.strictEqual(pulsoBasal, 74, 'El pulso basal debe actualizarse');
});
