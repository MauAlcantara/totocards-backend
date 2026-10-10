const test = require('node:test');
const assert = require('node:assert');

// 1. Lógica de Fin de Semana (Viernes 5, Sábado 6, Domingo 0)
function esFinDeSemana(fecha) {
    const dia = fecha.getDay();
    return (dia === 5 || dia === 6 || dia === 0);
}

// 2. Lógica de Envío Gratuito por Festival de Verano (Junio mes 5 a Agosto mes 7)
function esEnvioGratisVerano(fecha) {
    const mes = fecha.getMonth();
    return (mes >= 5 && mes <= 7);
}

// 3. Cálculo de Descuento de Fin de Semana en ETBs
function calcularPrecioItem(nombre, precioBase, fecha) {
    let precioFinal = Number(precioBase);
    if (esFinDeSemana(fecha) && nombre.toLowerCase().includes('elite trainer box')) {
        precioFinal = precioFinal * 0.90; // 10% de descuento
    }
    return precioFinal;
}

// 4. Validación defensiva de artículos en Checkout
function validarItemCarrito(item) {
    const id = Number(item.id_producto);
    const cantidad = Number(item.cantidad);

    if (!Number.isInteger(id) || id <= 0) {
        return { valido: false, error: 'ID de producto inválido' };
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return { valido: false, error: 'La cantidad debe ser un entero mayor a 0' };
    }
    if (cantidad > 50) {
        return { valido: false, error: 'Excede límite de 50 unidades' };
    }
    return { valido: true, id, cantidad };
}

// 5. Validación de límite en preventas
function validarLimitePreventa(previasCompradas, cantidadNueva) {
    const total = previasCompradas + cantidadNueva;
    return total <= 2;
}

// 6. Determinación de estado según método de pago
function determinarEstadoInicial(metodoPago) {
    return (metodoPago === 'spei') ? 'PENDIENTE' : 'PAGADO';
}

// 7. Validación de orígenes autorizados CORS
function esOrigenPermitido(origin, origenesConfigurados = []) {
    if (!origin) return true;
    const origenesPorDefecto = [
        'http://localhost:4200',
        'http://localhost:3000',
        'https://totocards-frontend.vercel.app',
        'https://totocards.vercel.app',
        'https://totocards-app.vercel.app'
    ];
    const todos = [...new Set([...origenesPorDefecto, ...origenesConfigurados])];
    return todos.includes(origin) || /^https:\/\/totocards([a-zA-Z0-9-]*)\.vercel\.app$/.test(origin);
}

// ==========================================
// SUITE DE PRUEBAS QA DE LÓGICA DE NEGOCIO
// ==========================================

test('Regla de Negocio: Días de Fin de Semana coinciden (Viernes, Sábado, Domingo)', () => {
    // 2026-10-09 es Viernes (5)
    const viernes = new Date(2026, 9, 9);
    assert.strictEqual(esFinDeSemana(viernes), true, 'El viernes debe ser fin de semana');

    // 2026-10-10 es Sábado (6)
    const sabado = new Date(2026, 9, 10);
    assert.strictEqual(esFinDeSemana(sabado), true, 'El sábado debe ser fin de semana');

    // 2026-10-11 es Domingo (0)
    const domingo = new Date(2026, 9, 11);
    assert.strictEqual(esFinDeSemana(domingo), true, 'El domingo debe ser fin de semana');

    // 2026-10-08 es Jueves (4) -> NO debe ser fin de semana (Discrepancia corregida)
    const jueves = new Date(2026, 9, 8);
    assert.strictEqual(esFinDeSemana(jueves), false, 'El jueves NO debe tener descuento de fin de semana');
});

test('Regla de Negocio: Descuento del 10% en Elite Trainer Boxes en Fin de Semana', () => {
    const sabado = new Date(2026, 9, 10);
    const precioBase = 1200;

    const precioConDescuento = calcularPrecioItem('Elite Trainer Box Stellar Crown', precioBase, sabado);
    assert.strictEqual(precioConDescuento, 1080, 'Debe aplicar 10% de descuento en fin de semana');

    const martes = new Date(2026, 9, 6);
    const precioSinDescuento = calcularPrecioItem('Elite Trainer Box Stellar Crown', precioBase, martes);
    assert.strictEqual(precioSinDescuento, 1200, 'Entre semana no debe tener descuento');

    // No debe aplicar a Sobres normales aunque sea fin de semana
    const sobrePrecio = calcularPrecioItem('Sobre Suelto Obsidian Flames', 120, sabado);
    assert.strictEqual(sobrePrecio, 120, 'Sobres no reciben descuento de ETB');
});

test('Regla de Negocio: Envío gratis dinámico en temporada de verano', () => {
    // Julio (mes 6)
    const verano = new Date(2027, 6, 15);
    assert.strictEqual(esEnvioGratisVerano(verano), true, 'En verano el envío debe ser gratuito');

    // Octubre (mes 9)
    const otonio = new Date(2027, 9, 15);
    assert.strictEqual(esEnvioGratisVerano(otonio), false, 'Fuera de verano se cobra envío estándar de $150');
});

test('QA Validación Defensiva: Rechazar manipulación de cantidades en carrito', () => {
    // Caso de ataque: cantidad negativa
    const ataqueNegativo = validarItemCarrito({ id_producto: 1, cantidad: -5 });
    assert.strictEqual(ataqueNegativo.valido, false);

    // Caso de ataque: cantidad flotante
    const ataqueFloat = validarItemCarrito({ id_producto: 1, cantidad: 1.5 });
    assert.strictEqual(ataqueFloat.valido, false);

    // Caso de ataque: cantidad cero
    const ataqueCero = validarItemCarrito({ id_producto: 1, cantidad: 0 });
    assert.strictEqual(ataqueCero.valido, false);

    // Caso de ataque: exceso de volumen
    const ataqueExceso = validarItemCarrito({ id_producto: 1, cantidad: 999 });
    assert.strictEqual(ataqueExceso.valido, false);

    // Caso legítimo
    const itemLegitimo = validarItemCarrito({ id_producto: 3, cantidad: 2 });
    assert.strictEqual(itemLegitimo.valido, true);
    assert.strictEqual(itemLegitimo.cantidad, 2);
});

test('QA Validación Defensiva: Límite estricto de preventas (Máximo 2 unidades)', () => {
    // Cliente compra 1 y ya tenía 1 comprada previamente
    assert.strictEqual(validarLimitePreventa(1, 1), true, 'Permite comprar 2 en total');

    // Cliente compra 2 y ya tenía 1 comprada previamente
    assert.strictEqual(validarLimitePreventa(1, 2), false, 'Rechaza superar 2 unidades');

    // Cliente compra 3 en su primera orden
    assert.strictEqual(validarLimitePreventa(0, 3), false, 'Rechaza comprar más de 2 en una sola orden');
});

test('QA Pasarela de Pagos: Estado inicial según método de pago', () => {
    assert.strictEqual(determinarEstadoInicial('spei'), 'PENDIENTE', 'SPEI debe esperar transferencia bancaria');
    assert.strictEqual(determinarEstadoInicial('tarjeta'), 'PAGADO', 'Tarjeta aprobada debe quedar PAGADO');
    assert.strictEqual(determinarEstadoInicial('paypal'), 'PAGADO', 'PayPal aprobado debe quedar PAGADO');
});

test('QA Seguridad CORS: Permite totocards-frontend.vercel.app y despliegues autorizados', () => {
    assert.strictEqual(esOrigenPermitido('https://totocards-frontend.vercel.app'), true, 'Debe permitir el frontend oficial en Vercel');
    assert.strictEqual(esOrigenPermitido('https://totocards-frontend-git-main.vercel.app'), true, 'Debe permitir subdominios preview de Vercel');
    assert.strictEqual(esOrigenPermitido('https://totocards.vercel.app'), true, 'Debe permitir dominio alternativo en Vercel');
    assert.strictEqual(esOrigenPermitido('http://localhost:4200'), true, 'Debe permitir localhost en desarrollo');
    assert.strictEqual(esOrigenPermitido(null), true, 'Peticiones sin origen (móvil, curl) permitidas');
    assert.strictEqual(esOrigenPermitido('https://sitio-malicioso.com'), false, 'Sitios ajenos bloqueados');
});
