const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protegerRuta } = require('../middlewares/authMiddleware');

// Rutas de tipo POST porque el usuario nos está enviando datos sensibles
router.post('/registro', authController.registrar);
router.post('/login', authController.login);

// Ruta para actualizar nombre y avatar del perfil
router.put('/actualizar-perfil', protegerRuta, async (req, res) => {
    const id_usuario = req.usuario.id;
    const { nombre, avatar } = req.body; // Ahora también recibimos el avatar

    try {
        // El UPDATE reemplaza automáticamente la foto anterior por la nueva
        await db.query('UPDATE Usuarios SET nombre = $1, avatar = $2 WHERE id_usuario = $3', 
            [nombre, avatar, id_usuario]
        );
        res.status(200).json({ mensaje: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al actualizar perfil' });
    }
});

module.exports = router;