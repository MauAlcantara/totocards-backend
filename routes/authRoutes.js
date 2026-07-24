const express = require('express');
const router = express.Router();
const db = require('../config/db'); // ✅ Agregamos la importación de la BD
const authController = require('../controllers/authController');
const { protegerRuta } = require('../middlewares/authMiddleware');

// Rutas de tipo POST para datos sensibles
router.post('/registro', authController.registrar);
router.post('/login', authController.login);

// Ruta para actualizar nombre y avatar del perfil
router.put('/actualizar-perfil', protegerRuta, async (req, res) => {
    const id_usuario = req.usuario.id;
    const { nombre, avatar } = req.body;

    try {
        await db.query('UPDATE Usuarios SET nombre = $1, avatar = $2 WHERE id_usuario = $3', 
            [nombre, avatar, id_usuario]
        );
        res.status(200).json({ mensaje: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ mensaje: 'Error al actualizar perfil' });
    }
});

module.exports = router;