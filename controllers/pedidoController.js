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

        let totalCalculado = 0;

        for (let item of items) {
            // 1. Consultamos los datos reales del producto en la BD
            const checkProducto = await client.query(
                'SELECT nombre, stock, precio, estado FROM Productos WHERE id_producto = $1', 
                [item.id_producto]
            );
            
            if (checkProducto.rows.length === 0) {
                throw new Error(`El producto con ID ${item.id_producto} ya no está disponible.`);
            }

            const productoReal = checkProducto.rows[0];

            // 🔥 VALIDACIÓN ACUMULADA DE PREVENTAS POR USUARIO
            if (productoReal.estado === 'PREVENTA') {
                const consultaHistorial = await client.query(
                    `SELECT COALESCE(SUM(dp.cantidad), 0) AS total_comprado
                     FROM Detalles_Pedido dp
                     JOIN Pedidos p ON dp.id_pedido = p.id_pedido
                     WHERE p.id_usuario = $1 AND dp.id_producto = $2 AND p.estado_pedido != 'CANCELADO'`,
                    [id_usuario, item.id_producto]
                );

                const previasCompradas = parseInt(consultaHistorial.rows[0].total_comprado, 10);

                // Si lo que ya compró en el pasado + lo que quiere comprar ahora supera 2:
                if (previasCompradas + item.cantidad > 2) {
                    const disponibles = Math.max(0, 2 - previasCompradas);
                    if (disponibles === 0) {
                        throw new Error(`Límite alcanzado: Ya has reservado el máximo permitido (2 unidades) de "${productoReal.nombre}" en compras anteriores.`);
                    } else {
                        throw new Error(`Límite superado: Ya compraste ${previasCompradas} unidad(es) de "${productoReal.nombre}". Solo puedes reservar ${disponibles} más.`);
                    }
                }
            }

            // 2. Verificar Stock
            if (productoReal.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para: ${productoReal.nombre}. Solo quedan ${productoReal.stock}.`);
            }

            totalCalculado += (productoReal.precio * item.cantidad);
            item.precio_real = productoReal.precio;
        }

        // 3. Crear el Pedido
        const insercionPedido = await client.query(
            'INSERT INTO Pedidos (id_usuario, total, estado_pedido) VALUES ($1, $2, $3) RETURNING id_pedido',
            [id_usuario, totalCalculado, 'PAGADO']
        );
        const id_pedido = insercionPedido.rows[0].id_pedido;

        // 4. Insertar Detalles y Descontar Stock
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

        res.status(201).json({ 
            mensaje: `¡Reserva exitosa! Tu pedido #${codigo_orden} está confirmado.`, 
            id_pedido,
            codigo_orden 
        });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Error procesando el checkout:', error);
        res.status(400).json({ mensaje: error.message || 'Error al conectar con la base de datos.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = { crearPedido };