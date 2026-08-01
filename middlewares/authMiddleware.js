const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_totocards_2026';

const protegerRuta = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mensaje: 'Acceso denegado. No se encontró una sesión activa.' });
    }

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        req.usuarioLogueado = verificado; 
        next();
    } catch (error) {
        return res.status(403).json({ mensaje: 'Sesión inválida o expirada.' });
    }
};

const requerirPermiso = (permisoRequerido) => {
    return (req, res, next) => {
        const { permisos } = req.usuarioLogueado;
        
        if (!permisos || !permisos.includes(permisoRequerido)) {
            return res.status(403).json({ mensaje: 'Acceso denegado. No tienes los privilegios necesarios.' });
        }
        next();
    };
};

module.exports = { protegerRuta, requerirPermiso };