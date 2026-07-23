const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protegerRuta, requerirPermiso } = require('../middlewares/authMiddleware');

// ==========================================
// CRUD USUARIOS: Obtener todos los usuarios de TotoCards
// ==========================================
router.get('/usuarios', protegerRuta, requerirPermiso('ver_dashboard'), async (req, res) => {
    try {
        const resultado = await db.query('SELECT id_usuario, nombre, email, fecha_registro, activo FROM Usuarios ORDER BY id_usuario ASC');
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener usuarios.' });
    }
});

router.put('/usuarios/:id/estado', protegerRuta, requerirPermiso('ver_dashboard'), async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body; // Recibimos el nuevo estado (true o false)

    try {
        await db.query('UPDATE Usuarios SET activo = $1 WHERE id_usuario = $2', [activo, id]);
        res.status(200).json({ 
            mensaje: `El usuario ha sido ${activo ? 'habilitado' : 'deshabilitado'} exitosamente.` 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al cambiar el estado del usuario.' });
    }
});

// ==========================================
// 📦 CRUD PRODUCTOS: Actualizar Stock y Estado (Disponible / Preventa / Agotado)
// ==========================================
router.put('/productos/:id', protegerRuta, requerirPermiso('gestionar_productos'), async (req, res) => {
    const { id } = req.params;
    const { stock, estado, precio } = req.body; // El admin manda el nuevo stock, estado o precio

    try {
        const consulta = `
            UPDATE Productos 
            SET stock = $1, estado = $2, precio = $3 
            WHERE id_producto = $4 
            RETURNING *
        `;
        const resultado = await db.query(consulta, [stock, estado, precio, id]);
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado.' });
        }

        res.status(200).json({ mensaje: 'Producto actualizado con éxito', producto: resultado.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al actualizar el producto.' });
    }
});

module.exports = router;