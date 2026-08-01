const db = require('../config/db');

const crearPedido = async (req, res) => {
    const id_usuario = req.usuarioLogueado.id;
    const { items } = req.body; 

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ mensaje: 'El carrito está vacío o los datos son inválidos.' });
    }

    let client; 

    try {
        client = await db.connect();
        await client.query('BEGIN');

        const fechaActual = new Date();
        const diaSemana = fechaActual.getDay();
        const mesActual = fechaActual.getMonth();
        const anioActual = fechaActual.getFullYear();

        const esFinDeSemana = (diaSemana === 4 || diaSemana === 5 || diaSemana === 6 || diaSemana === 0);
        const envioGratisVerano = (anioActual === 2026 && mesActual >= 5 && mesActual <= 7);

        let subtotalCalculado = 0;

        for (let item of items) {
            const checkProducto = await client.query(
                'SELECT nombre, stock, precio, estado FROM Productos WHERE id_producto = $1', 
                [item.id_producto]
            );
            
            if (checkProducto.rows.length === 0) {
                throw new Error(`El producto con ID ${item.id_producto} ya no está disponible.`);
            }

            const productoReal = checkProducto.rows[0];

            if (productoReal.estado === 'PREVENTA') {
                const consultaHistorial = await client.query(
                    `SELECT COALESCE(SUM(dp.cantidad), 0) AS total_comprado
                     FROM Detalles_Pedido dp
                     JOIN Pedidos p ON dp.id_pedido = p.id_pedido
                     WHERE p.id_usuario = $1 AND dp.id_producto = $2 AND p.estado_pedido != 'CANCELADO'`,
                    [id_usuario, item.id_producto]
                );

                const previasCompradas = parseInt(consultaHistorial.rows[0].total_comprado, 10);
                if (previasCompradas + item.cantidad > 2) {
                    throw new Error(`Límite alcanzado para la preventa "${productoReal.nombre}".`);
                }
            }

            if (productoReal.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para: ${productoReal.nombre}. Solo quedan ${productoReal.stock}.`);
            }

            let precioFinalItem = Number(productoReal.precio);
            
            if (esFinDeSemana && productoReal.nombre.toLowerCase().includes('elite trainer box')) {
                precioFinalItem = precioFinalItem * 0.90; // 10% de descuento
            }

            subtotalCalculado += (precioFinalItem * item.cantidad);
            item.precio_real = precioFinalItem;
        }

        const costoEnvio = envioGratisVerano ? 0 : 150.00;
        const totalCalculado = subtotalCalculado + costoEnvio;

        const insercionPedido = await client.query(
            'INSERT INTO Pedidos (id_usuario, total, estado_pedido) VALUES ($1, $2, $3) RETURNING id_pedido',
            [id_usuario, totalCalculado, 'PAGADO']
        );
        const id_pedido = insercionPedido.rows[0].id_pedido;

        for (let item of items) {
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
        res.status(201).json({ mensaje: `¡Compra exitosa! Pedido #${codigo_orden} en preparación.`, id_pedido, codigo_orden });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error procesando el checkout:', error);
        res.status(400).json({ mensaje: error.message || 'Error al conectar con la base de datos.' });
    } finally {
        if (client) client.release();
    }
};

module.exports = { crearPedido };