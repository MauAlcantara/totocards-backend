const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('FATAL: La variable de entorno JWT_SECRET no está configurada.');
}


const registrar = async (req, res) => {
    const { nombre, email, password } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 100) {
        return res.status(400).json({ mensaje: 'El nombre debe tener entre 2 y 100 caracteres.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim()) || email.trim().length > 120) {
        return res.status(400).json({ mensaje: 'Por favor ingresa un correo electrónico válido.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 100) {
        return res.status(400).json({ mensaje: 'La contraseña debe contener entre 6 y 100 caracteres.' });
    }

    let client;
    try {
        const usuarioExistente = await db.query('SELECT * FROM Usuarios WHERE email = $1', [email.trim().toLowerCase()]);
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ mensaje: 'Este correo ya está registrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        client = await db.connect();
        await client.query('BEGIN');

        const insercionUsuario = await client.query(
            'INSERT INTO Usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id_usuario, nombre, email',
            [nombre.trim(), email.trim().toLowerCase(), passwordHash]
        );
        const nuevoUsuario = insercionUsuario.rows[0];

        const buscarRol = await client.query("SELECT id_rol FROM Roles WHERE nombre_rol = 'Usuario'");
        if (buscarRol.rows.length === 0) {
            throw new Error('El rol por defecto "Usuario" no está configurado en el sistema.');
        }
        const idRolUsuario = buscarRol.rows[0].id_rol;

        await client.query(
            'INSERT INTO Usuario_Rol (id_usuario, id_rol) VALUES ($1, $2)',
            [nuevoUsuario.id_usuario, idRolUsuario]
        );
        await client.query('COMMIT');

        res.status(201).json({ mensaje: 'Usuario registrado con éxito', usuario: nuevoUsuario });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error en registro:', error);
        res.status(500).json({ mensaje: 'Error interno al procesar el registro.' });
    } finally {
        if (client) client.release();
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ mensaje: 'Por favor ingresa correo y contraseña válidos.' });
    }

    try {
        const resultadoUsuario = await db.query('SELECT * FROM Usuarios WHERE email = $1', [email.trim().toLowerCase()]);
        if (resultadoUsuario.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
        }
        
        const usuario = resultadoUsuario.rows[0];

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
        }
        
        if (usuario.activo === false) {
            return res.status(403).json({
                mensaje: 'Tu cuenta ha sido deshabilitada temporalmente por un Administrador. Contacta a soporte.'
            });
        }

        const consultaRoles = `
            SELECT r.nombre_rol, p.nombre_permiso 
            FROM Usuario_Rol ur
            JOIN Roles r ON ur.id_rol = r.id_rol
            LEFT JOIN Rol_Permiso rp ON r.id_rol = rp.id_rol
            LEFT JOIN Permisos p ON rp.id_permiso = p.id_permiso
            WHERE ur.id_usuario = $1
        `;
        const resultadoRoles = await db.query(consultaRoles, [usuario.id_usuario]);

        const roles = [...new Set(resultadoRoles.rows.map(row => row.nombre_rol))];
        const permisos = [...new Set(resultadoRoles.rows.filter(row => row.nombre_permiso).map(row => row.nombre_permiso))];

        const payloadLigero = {
            id: usuario.id_usuario,
            nombre: usuario.nombre,
            email: usuario.email,
            roles: roles,
            permisos: permisos
        };

        const token = jwt.sign(
            payloadLigero, 
            JWT_SECRET, 
            { expiresIn: '8h' } 
        );

        res.status(200).json({
            mensaje: 'Autenticación exitosa',
            token: token,
            usuario: { 
                id_usuario: usuario.id_usuario, 
                nombre: usuario.nombre, 
                email: usuario.email, 
                roles: roles, 
                permisos: permisos, 
                avatar: usuario.avatar 
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error del servidor en el inicio de sesión.' });
    }
};

const actualizarPerfil = async (req, res) => {
    const id_usuario = req.usuarioLogueado.id;
    const { nombre, avatar } = req.body;

    // Validación defensiva del nombre
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 80) {
        return res.status(400).json({ mensaje: 'El nombre debe tener entre 2 y 80 caracteres válidos.' });
    }

    // Validación del avatar (prevención de DoS y XSS)
    if (avatar) {
        if (typeof avatar !== 'string') {
            return res.status(400).json({ mensaje: 'Formato de avatar no reconocido.' });
        }

        // Límite de tamaño: ~2.5 MB en texto base64
        if (avatar.length > 2.5 * 1024 * 1024) {
            return res.status(400).json({ mensaje: 'La imagen de perfil supera el tamaño máximo permitido de 2 MB.' });
        }

        const esDataUriValida = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar);
        const esHttpsValido = /^https:\/\/[^\s<>"']+$/.test(avatar);

        if (!esDataUriValida && !esHttpsValido) {
            return res.status(400).json({ 
                mensaje: 'Formato de imagen inválido. Solo se admiten imágenes JPG, PNG o WEBP seguras.' 
            });
        }
    }

    try {
        await db.query(
            'UPDATE Usuarios SET nombre = $1, avatar = $2 WHERE id_usuario = $3', 
            [nombre.trim(), avatar || null, id_usuario]
        );
        res.status(200).json({ 
            mensaje: 'Perfil actualizado exitosamente',
            usuario: {
                id_usuario,
                nombre: nombre.trim(),
                avatar: avatar || null
            }
        });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ mensaje: 'Error interno al actualizar perfil' });
    }
};

module.exports = { registrar, login, actualizarPerfil };