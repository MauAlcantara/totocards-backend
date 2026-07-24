const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_totocards_2026';

// REGISTRO CON ASIGNACIÓN AUTOMÁTICA DE ROL
const registrar = async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        // Verificar existencia de correo
        const usuarioExistente = await db.query('SELECT * FROM Usuarios WHERE email = $1', [email]);
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ mensaje: 'Este correo ya está registrado.' });
        }

        // Hash de contraseña (Seguridad)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Iniciamos una transacción SQL para asegurar el registro completo
        await db.query('BEGIN');

        // 1. Insertar el usuario
        const insercionUsuario = await db.query(
            'INSERT INTO Usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id_usuario, nombre, email',
            [nombre, email, passwordHash]
        );
        const nuevoUsuario = insercionUsuario.rows[0];

        // 2. Buscar el ID del rol estándar 'Usuario'
        const buscarRol = await db.query("SELECT id_rol FROM Roles WHERE nombre_rol = 'Usuario'");
        const idRolUsuario = buscarRol.rows[0].id_rol;

        // 3. Vincular al usuario con su rol en la tabla intermedia Usuario_Rol
        await db.query(
            'INSERT INTO Usuario_Rol (id_usuario, id_rol) VALUES ($1, $2)',
            [nuevoUsuario.id_usuario, idRolUsuario]
        );

        // Confirmamos los cambios en PostgreSQL
        await db.query('COMMIT');

        res.status(201).json({ mensaje: 'Usuario registrado con éxito', usuario: nuevoUsuario });

    } catch (error) {
        await db.query('ROLLBACK'); // Si algo falla, deshace los pasos anteriores
        console.error('Error en registro:', error);
        res.status(500).json({ mensaje: 'Error interno al procesar el registro.' });
    }
};

// LOGIN CON EXTRACCIÓN DE ROLES Y PERMISOS RELACIONALES
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validación: Buscar usuario
        const resultadoUsuario = await db.query('SELECT * FROM Usuarios WHERE email = $1', [email]);
        if (resultadoUsuario.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
        }
        const usuario = resultadoUsuario.rows[0];

        // Validación: Verificar Hash de contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
        }
        
        // Validación: cuenta activa
        if (usuario.activo === false) {
            return res.status(403).json({
                mensaje: 'Tu cuenta ha sido deshabilitada temporalmente por un Administrador. Contacta a soporte.'
            });
        }

        // Obtener el Rol y Permisos del usuario mediante JOINS relacionales
        const consultaRoles = `
            SELECT r.nombre_rol, p.nombre_permiso 
            FROM Usuario_Rol ur
            JOIN Roles r ON ur.id_rol = r.id_rol
            LEFT JOIN Rol_Permiso rp ON r.id_rol = rp.id_rol
            LEFT JOIN Permisos p ON rp.id_permiso = p.id_permiso
            WHERE ur.id_usuario = $1
        `;
        const resultadoRoles = await db.query(consultaRoles, [usuario.id_usuario]);

        // Mapeamos los roles y permisos del usuario (evitando duplicados)
        const roles = [...new Set(resultadoRoles.rows.map(row => row.nombre_rol))];
        const permisos = [...new Set(resultadoRoles.rows.filter(row => row.nombre_permiso).map(row => row.nombre_permiso))];

        // Firmar Token con JWT incluyendo claims de autorización
        const token = jwt.sign(
            { id: usuario.id_usuario, roles: roles, permisos: permisos },
            JWT_SECRET,
            { expiresIn: '3h' }
        );

        res.status(200).json({
            mensaje: 'Autenticación exitosa',
            token: token,
            usuario: { nombre: usuario.nombre, email: usuario.email, roles: roles, permisos: permisos, avatar: avatar, }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error del servidor en el inicio de sesión.' });
    }
};

module.exports = { registrar, login };