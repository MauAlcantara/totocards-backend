const db = require('../config/db');

const crearPedido = async (req, res) => {
    // Obtenemos el ID del usuario desde el Token JWT
    const id_usuario = req.usuarioLogueado.id;
    const { items } = req.body; 

    // 1. Validar que el carrito no venga vacío o corrupto
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ mensaje: 'El carrito está vacío o los datos son inválidos.' });
    }

    try {
        // Iniciamos una TRANSACCIÓN SQL (Todo o Nada)
        await db.query('BEGIN');

        let totalCalculado = 0;

        // 2. Recorremos los items para validar Stock y calcular el Precio REAL en el servidor
        for (let item of items) {
            const checkProducto = await db.query('SELECT nombre, stock, precio FROM Productos WHERE id_producto = $1', [item.id_producto]);
            
            if (checkProducto.rows.length === 0) {
                throw new Error(`El producto con ID ${item.id_producto} ya no está disponible.`);
            }

            const productoReal = checkProducto.rows[0];

            if (productoReal.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para: ${productoReal.nombre}. Solo quedan ${productoReal.stock}.`);
            }

            // Sumamos el precio real de la BD, no el que manda Angular (Seguridad e-commerce)
            totalCalculado += (productoReal.precio * item.cantidad);
            
            // Guardamos el precio real temporalmente en el objeto para insertarlo en los detalles
            item.precio_real = productoReal.precio;
        }

        // 3. Crear el Pedido General con el total protegido
        const insercionPedido = await db.query(
            'INSERT INTO Pedidos (id_usuario, total, estado_pedido) VALUES ($1, $2, $3) RETURNING id_pedido',
            [id_usuario, totalCalculado, 'PAGADO']
        );
        const id_pedido = insercionPedido.rows[0].id_pedido;

        // 4. Insertar cada detalle y descontar del inventario real
        for (let item of items) {
            await db.query(
                'INSERT INTO Detalles_Pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
                [id_pedido, item.id_producto, item.cantidad, item.precio_real]
            );

            await db.query(
                'UPDATE Productos SET stock = stock - $1 WHERE id_producto = $2',
                [item.cantidad, item.id_producto]
            );
        }

        // Si todo salió perfecto, guardamos los cambios de forma permanente
        await db.query('COMMIT');
        res.status(201).json({ mensaje: '¡Compra exitosa! Tu pedido está siendo preparado.', id_pedido });

    } catch (error) {
        // Si falta stock, si un precio no coincide o si la red se cae, deshacemos TODO
        await db.query('ROLLBACK');
        console.error('Error procesando el checkout:', error);
        res.status(400).json({ mensaje: error.message || 'Error al procesar el pago.' });
    }
};

module.exports = { crearPedido };