const db = require('../config/db');

const crearPedido = async (req, res) => {
    // Obtenemos el ID del usuario desde el Token JWT (inyectado por el middleware)
    const id_usuario = req.usuarioLogueado.id;
    const { items, total } = req.body; 
    // "items" será un arreglo que Angular nos mandará: [{id_producto, cantidad, precio_unitario}]

    try {
        // Iniciamos una TRANSACCIÓN SQL (Todo o Nada)
        await db.query('BEGIN');

        // 1. Crear el Pedido General
        const insercionPedido = await db.query(
            'INSERT INTO Pedidos (id_usuario, total, estado_pedido) VALUES ($1, $2, $3) RETURNING id_pedido',
            [id_usuario, total, 'PAGADO']
        );
        const id_pedido = insercionPedido.rows[0].id_pedido;

        // 2. Insertar cada producto en Detalles_Pedido y restar el Stock
        for (let item of items) {
            // Verificar que haya stock suficiente antes de cobrar
            const checkStock = await db.query('SELECT stock, nombre FROM Productos WHERE id_producto = $1', [item.id_producto]);
            if (checkStock.rows[0].stock < item.cantidad) {
                throw new Error(`Stock insuficiente para la carta: ${checkStock.rows[0].nombre}`);
            }

            // Insertar el detalle
            await db.query(
                'INSERT INTO Detalles_Pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
                [id_pedido, item.id_producto, item.cantidad, item.precio_unitario]
            );

            // Restar el inventario de la bóveda
            await db.query(
                'UPDATE Productos SET stock = stock - $1 WHERE id_producto = $2',
                [item.cantidad, item.id_producto]
            );
        }

        // Si todo salió perfecto, guardamos los cambios de forma permanente
        await db.query('COMMIT');
        res.status(201).json({ mensaje: '¡Compra exitosa! Tu pedido está siendo preparado.', id_pedido });

    } catch (error) {
        // Si hay CUALQUIER error (falta de stock, caída de red), deshacemos todo
        await db.query('ROLLBACK');
        console.error('Error procesando el checkout:', error);
        res.status(400).json({ mensaje: error.message || 'Error al procesar el pago.' });
    }
};

module.exports = { crearPedido };