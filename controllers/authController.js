const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_totocards_2026';

const registrar = async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        const usuarioExistente = await db.query('SELECT * FROM Usuarios WHERE email = $1', [email]);
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ mensaje: 'Este correo ya está registrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await db.query('BEGIN');

        const insercionUsuario = await db.query(
            'INSERT INTO Usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id_usuario, nombre, email',
            [nombre, email, passwordHash]
        );
        const nuevoUsuario = insercionUsuario.rows[0];

        const buscarRol = await db.query("SELECT id_rol FROM Roles WHERE nombre_rol = 'Usuario'");
        const idRolUsuario = buscarRol.rows[0].id_rol;

        await db.query(
            'INSERT INTO Usuario_Rol (id_usuario, id_rol) VALUES ($1, $2)',
            [nuevoUsuario.id_usuario, idRolUsuario]
        );
        await db.query('COMMIT');

        res.status(201).json({ mensaje: 'Usuario registrado con éxito', usuario: nuevoUsuario });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error en registro:', error);
        res.status(500).json({ mensaje: 'Error interno al procesar el registro.' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const resultadoUsuario = await db.query('SELECT * FROM Usuarios WHERE email = $1', [email]);
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

        const token = jwt.sign(
            { id: usuario.id_usuario, roles: roles, permisos: permisos, avatar: usuario.avatar },
            JWT_SECRET,
            { expiresIn: '3h' }
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

module.exports = { registrar, login };