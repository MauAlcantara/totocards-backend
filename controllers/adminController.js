const db = require('../config/db');
const bcrypt = require('bcrypt');

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

const crearUsuario = async (req, res) => {
    const { nombre, email, password, rol } = req.body;

    let client;
    try {
        const usuarioExistente = await db.query('SELECT * FROM Usuarios WHERE email = $1', [email]);
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ mensaje: 'Este correo ya está registrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        client = await db.connect();
        await client.query('BEGIN');

        const insercionUsuario = await client.query(
            'INSERT INTO Usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id_usuario, nombre, email, fecha_registro, activo',
            [nombre, email, passwordHash]
        );
        const nuevoUsuario = insercionUsuario.rows[0];

        const nombreRol = rol || 'Usuario';
        const buscarRol = await client.query("SELECT id_rol FROM Roles WHERE nombre_rol = $1", [nombreRol]);
        
        if (buscarRol.rows.length > 0) {
            await client.query(
                'INSERT INTO Usuario_Rol (id_usuario, id_rol) VALUES ($1, $2)',
                [nuevoUsuario.id_usuario, buscarRol.rows[0].id_rol]
            );
        } else {
            throw new Error(`El rol "${nombreRol}" no está configurado en el sistema.`);
        }

        await client.query('COMMIT');
        res.status(201).json({ mensaje: 'Usuario creado exitosamente', usuario: nuevoUsuario });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error al crear usuario:', error);
        res.status(500).json({ mensaje: error.message || 'Error interno al registrar el usuario.' });
    } finally {
        if (client) client.release();
    }
};

const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre, email } = req.body;

    try {
        const resultado = await db.query(
            'UPDATE Usuarios SET nombre = $1, email = $2 WHERE id_usuario = $3 RETURNING id_usuario, nombre, email, fecha_registro, activo',
            [nombre, email, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        res.status(200).json({ mensaje: 'Datos del usuario actualizados con éxito', usuario: resultado.rows[0] });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        if (error.code === '23505') { // Código de PostgreSQL para correos duplicados (Unique Violation)
            return res.status(400).json({ mensaje: 'El correo electrónico ya está en uso por otra cuenta.' });
        }
        res.status(500).json({ mensaje: 'Error al actualizar el usuario.' });
    }
};

const eliminarUsuario = async (req, res) => {
    const { id } = req.params;

    let client;
    try {
        client = await db.connect();
        await client.query('BEGIN');
        
        await client.query('DELETE FROM Usuario_Rol WHERE id_usuario = $1', [id]);

        const resultado = await client.query('DELETE FROM Usuarios WHERE id_usuario = $1 RETURNING *', [id]);

        if (resultado.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        await client.query('COMMIT');
        res.status(200).json({ mensaje: 'Usuario eliminado permanentemente del sistema.' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error al eliminar usuario:', error);
        if (error.code === '23503') {
            return res.status(400).json({ mensaje: 'No se puede eliminar: El usuario tiene compras registradas. Te sugerimos "Deshabilitarlo".' });
        }
        res.status(500).json({ mensaje: 'Error interno al intentar eliminar el usuario.' });
    } finally {
        if (client) client.release();
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
// CRUD PRODUCTOS
// ==========================================
const crearProducto = async (req, res) => { 
    const { nombre, descripcion, precio, stock, categoria, expansion, imagen_url, estado, fecha_lanzamiento } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
        return res.status(400).json({ mensaje: 'El nombre del artículo es obligatorio.' });
    }
    const precioNum = Number(precio);
    if (isNaN(precioNum) || precioNum < 0) {
        return res.status(400).json({ mensaje: 'El precio debe ser un número válido mayor o igual a 0.' });
    }
    const stockNum = parseInt(stock, 10);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
        return res.status(400).json({ mensaje: 'El stock debe ser un número entero no negativo.' });
    }

    try {
        const consulta = `INSERT INTO Productos (nombre, descripcion, precio, stock, categoria, expansion, imagen_url, estado, fecha_lanzamiento) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
        const valores = [nombre.trim(), descripcion || '', precioNum, stockNum, categoria || 'Sobres', expansion || '', imagen_url || '', estado || 'DISPONIBLE', fecha_lanzamiento || null];
        const resultado = await db.query(consulta, valores);
        res.status(201).json({ mensaje: 'Producto creado exitosamente', producto: resultado.rows[0] });
    } catch (error) { 
        console.error('Error al registrar producto:', error);
        res.status(500).json({ mensaje: 'Error interno al registrar el producto.' }); 
    }
};

const actualizarProducto = async (req, res) => { 
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, categoria, expansion, imagen_url, estado, fecha_lanzamiento } = req.body;

    const idNum = parseInt(id, 10);
    if (isNaN(idNum) || idNum <= 0) {
        return res.status(400).json({ mensaje: 'ID de producto inválido.' });
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
        return res.status(400).json({ mensaje: 'El nombre del artículo es obligatorio.' });
    }
    const precioNum = Number(precio);
    if (isNaN(precioNum) || precioNum < 0) {
        return res.status(400).json({ mensaje: 'El precio debe ser un número válido mayor o igual a 0.' });
    }
    const stockNum = parseInt(stock, 10);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
        return res.status(400).json({ mensaje: 'El stock debe ser un número entero no negativo.' });
    }

    try {
        const consulta = `UPDATE Productos SET nombre = $1, descripcion = $2, precio = $3, stock = $4, categoria = $5, expansion = $6, imagen_url = $7, estado = $8, fecha_lanzamiento = $9 WHERE id_producto = $10 RETURNING *`;
        const valores = [nombre.trim(), descripcion || '', precioNum, stockNum, categoria || 'Sobres', expansion || '', imagen_url || '', estado || 'DISPONIBLE', fecha_lanzamiento || null, idNum];
        const resultado = await db.query(consulta, valores);
        if (resultado.rows.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        res.status(200).json({ mensaje: 'Producto actualizado con éxito', producto: resultado.rows[0] });
    } catch (error) { 
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el producto.' }); 
    }
};

const eliminarProducto = async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await db.query('DELETE FROM Productos WHERE id_producto = $1 RETURNING *', [id]);
        if (resultado.rows.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        res.status(200).json({ mensaje: 'Producto eliminado correctamente de la bóveda.' });
    } catch (error) { res.status(500).json({ mensaje: 'No se puede eliminar el producto porque está vinculado a compras de los usuarios.' }); }
};

module.exports = {
    obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, cambiarEstadoUsuario,
    crearProducto, actualizarProducto, eliminarProducto
};