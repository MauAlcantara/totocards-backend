const db = require('../config/db');

// ==========================================
// CRUD USUARIOS
// ==========================================
const obtenerUsuarios = async (req, res) => {
    try {
        const resultado = await db.query('SELECT id_usuario, nombre, email, fecha_registro, activo FROM Usuarios ORDER BY id_usuario ASC');
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener usuarios.' });
    }
};

const cambiarEstadoUsuario = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;

    try {
        await db.query('UPDATE Usuarios SET activo = $1 WHERE id_usuario = $2', [activo, id]);
        res.status(200).json({ 
            mensaje: `El usuario ha sido ${activo ? 'habilitado' : 'deshabilitado'} exitosamente.` 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al cambiar el estado del usuario.' });
    }
};

// ==========================================
// CRUD PRODUCTOS (Crear, Editar Todo excepto ID, Eliminar)
// ==========================================

// 1. CREAR PRODUCTO
const crearProducto = async (req, res) => {
    const { nombre, descripcion, precio, stock, categoria, expansion, imagen_url, estado, fecha_lanzamiento } = req.body;

    try {
        const consulta = `
            INSERT INTO Productos (nombre, descripcion, precio, stock, categoria, expansion, imagen_url, estado, fecha_lanzamiento)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const valores = [nombre, descripcion, precio, stock, categoria, expansion, imagen_url, estado, fecha_lanzamiento];
        const resultado = await db.query(consulta, valores);

        res.status(201).json({ mensaje: 'Producto creado exitosamente', producto: resultado.rows[0] });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ mensaje: 'Error interno al registrar el producto.' });
    }
};

// 2. ACTUALIZAR PRODUCTO (Edita todo menos el ID)
const actualizarProducto = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, categoria, expansion, imagen_url, estado, fecha_lanzamiento } = req.body;

    try {
        const consulta = `
            UPDATE Productos 
            SET nombre = $1, descripcion = $2, precio = $3, stock = $4, 
                categoria = $5, expansion = $6, imagen_url = $7, estado = $8, fecha_lanzamiento = $9
            WHERE id_producto = $10 
            RETURNING *
        `;
        const valores = [nombre, descripcion, precio, stock, categoria, expansion, imagen_url, estado, fecha_lanzamiento, id];
        const resultado = await db.query(consulta, valores);
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        }

        res.status(200).json({ mensaje: 'Producto actualizado con éxito', producto: resultado.rows[0] });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el producto.' });
    }
};

// 3. ELIMINAR PRODUCTO
const eliminarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const resultado = await db.query('DELETE FROM Productos WHERE id_producto = $1 RETURNING *', [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        }

        res.status(200).json({ mensaje: 'Producto eliminado correctamente de la bóveda.' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ mensaje: 'No se puede eliminar el producto porque está vinculado a compras de los usuarios.' });
    }
};

module.exports = {
    obtenerUsuarios,
    cambiarEstadoUsuario,
    crearProducto,
    actualizarProducto,
    eliminarProducto
};