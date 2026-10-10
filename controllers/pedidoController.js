const db = require('../config/db');

const crearPedido = async (req, res) => {
    const id_usuario = req.usuarioLogueado.id;
    const { items, metodo_pago } = req.body; 

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ mensaje: 'El carrito está vacío o los datos son inválidos.' });
    }

    // Validación defensiva y consolidación de cantidades (evitar manipulación de precios/duplicados)
    const mapaItems = new Map();
    for (const item of items) {
        const id = Number(item.id_producto);
        const cantidad = Number(item.cantidad);

        if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
            return res.status(400).json({ mensaje: 'Cada artículo debe tener un ID y una cantidad válida mayor a 0.' });
        }

        if (cantidad > 50) {
            return res.status(400).json({ mensaje: 'No es posible comprar más de 50 unidades de un solo artículo.' });
        }

        mapaItems.set(id, (mapaItems.get(id) || 0) + cantidad);
    }

    let client; 

    try {
        client = await db.connect();
        await client.query('BEGIN');

        const fechaActual = new Date();
        const diaSemana = fechaActual.getDay();
        const mesActual = fechaActual.getMonth();

        // Viernes (5), Sábado (6) o Domingo (0)
        const esFinDeSemana = (diaSemana === 5 || diaSemana === 6 || diaSemana === 0);
        // Festival de Verano: Junio (mes 5) a Agosto (mes 7) de cada año
        const envioGratisVerano = (mesActual >= 5 && mesActual <= 7);

        let subtotalCalculado = 0;
        const itemsAProcesar = [];

        for (const [id_producto, cantidad] of mapaItems.entries()) {
            // Bloqueo pesimista FOR UPDATE para evitar condiciones de carrera (Race Condition)
            const checkProducto = await client.query(
                'SELECT id_producto, nombre, stock, precio, estado FROM Productos WHERE id_producto = $1 FOR UPDATE', 
                [id_producto]
            );
            
            if (checkProducto.rows.length === 0) {
                throw new Error(`El producto con ID ${id_producto} ya no está disponible en la tienda.`);
            }

            const productoReal = checkProducto.rows[0];

            if (productoReal.estado === 'PREVENTA') {
                const consultaHistorial = await client.query(
                    `SELECT COALESCE(SUM(dp.cantidad), 0) AS total_comprado
                     FROM Detalles_Pedido dp
                     JOIN Pedidos p ON dp.id_pedido = p.id_pedido
                     WHERE p.id_usuario = $1 AND dp.id_producto = $2 AND p.estado_pedido != 'CANCELADO'`,
                    [id_usuario, id_producto]
                );

                const previasCompradas = parseInt(consultaHistorial.rows[0].total_comprado, 10);
                if (previasCompradas + cantidad > 2) {
                    throw new Error(`Límite alcanzado para la preventa "${productoReal.nombre}". Máximo 2 por cliente.`);
                }
            }

            if (productoReal.stock < cantidad) {
                throw new Error(`Stock insuficiente para: ${productoReal.nombre}. Solo quedan ${productoReal.stock} en inventario.`);
            }

            let precioFinalItem = Number(productoReal.precio);
            
            if (esFinDeSemana && productoReal.nombre.toLowerCase().includes('elite trainer box')) {
                precioFinalItem = precioFinalItem * 0.90; // 10% de descuento de fin de semana
            }

            subtotalCalculado += (precioFinalItem * cantidad);

            itemsAProcesar.push({
                id_producto,
                cantidad,
                precio_real: precioFinalItem
            });
        }

        const costoEnvio = envioGratisVerano ? 0 : 150.00;
        const totalCalculado = subtotalCalculado + costoEnvio;

        const estadoInicial = (metodo_pago === 'spei') ? 'PENDIENTE' : 'PAGADO';

        const insercionPedido = await client.query(
            'INSERT INTO Pedidos (id_usuario, total, estado_pedido) VALUES ($1, $2, $3) RETURNING id_pedido',
            [id_usuario, totalCalculado, estadoInicial]
        );
        const id_pedido = insercionPedido.rows[0].id_pedido;

        for (let item of itemsAProcesar) {
            await client.query(
                'INSERT INTO Detalles_Pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
                [id_pedido, item.id_producto, item.cantidad, item.precio_real]
            );

            await client.query(
                'UPDATE Productos SET stock = stock - $1 WHERE id_producto = $2',
                [item.cantidad, item.id_producto]
            );
        }

        await client.query('COMMIT');

        const codigo_orden = `TCG-${String(id_pedido).padStart(4, '0')}`;
        const mensajeConfirmacion = (metodo_pago === 'spei')
            ? `¡Orden registrada! Pedido #${codigo_orden} pendiente de conciliación bancaria SPEI.`
            : `¡Compra asegurada! Pedido #${codigo_orden} en preparación.`;

        res.status(201).json({ 
            mensaje: mensajeConfirmacion, 
            id_pedido, 
            codigo_orden,
            estado_pedido: estadoInicial,
            total: totalCalculado
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error procesando el checkout:', error);
        res.status(400).json({ mensaje: error.message || 'Error al conectar con la base de datos.' });
    } finally {
        if (client) client.release();
    }
};

const obtenerMisCompras = async (req, res) => {
    try {
        const id_usuario = req.usuarioLogueado.id;
        const consultaSQL = `
            SELECT p.*,
                   EXISTS (
                       SELECT 1 
                       FROM Detalles_Pedido dp
                       JOIN Productos prod ON dp.id_producto = prod.id_producto
                       WHERE dp.id_pedido = p.id_pedido AND prod.estado = 'PREVENTA'
                   ) AS es_preventa
            FROM Pedidos p 
            WHERE p.id_usuario = $1 
            ORDER BY p.fecha_creacion DESC
        `;
        
        const resultado = await db.query(consultaSQL, [id_usuario]);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ mensaje: 'Error al consultar el historial de compras' });
    }
};

const obtenerPedidoPorId = async (req, res) => {
    try {
        const id_pedido = parseInt(req.params.id, 10);
        if (isNaN(id_pedido) || id_pedido <= 0) {
            return res.status(400).json({ mensaje: 'ID de pedido inválido.' });
        }
        const id_usuario = req.usuarioLogueado.id;

        const pedido = await db.query('SELECT * FROM Pedidos WHERE id_pedido = $1 AND id_usuario = $2', [id_pedido, id_usuario]);
        
        if (pedido.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Pedido no encontrado o no autorizado.' });
        }

        const detalles = await db.query(`
            SELECT dp.cantidad, dp.precio_unitario, prod.nombre, prod.imagen_url, prod.id_producto
            FROM Detalles_Pedido dp
            JOIN Productos prod ON dp.id_producto = prod.id_producto
            WHERE dp.id_pedido = $1
        `, [id_pedido]);

        res.status(200).json({
            pedido: pedido.rows[0],
            detalles: detalles.rows
        });

    } catch (error) {
        console.error('Error al obtener detalle del pedido:', error);
        res.status(500).json({ mensaje: 'Error al cargar los detalles de la compra.' });
    }
};

module.exports = { crearPedido, obtenerMisCompras, obtenerPedidoPorId };