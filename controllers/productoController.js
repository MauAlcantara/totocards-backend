const db = require('../config/db');

const obtenerProductos = async (req, res) => {
    try {
        const resultado = await db.query('SELECT * FROM Productos ORDER BY id_producto ASC');
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener los productos:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al cargar el catálogo.' });
    }
};

const obtenerProductoPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await db.query('SELECT * FROM Productos WHERE id_producto = $1', [id]);
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Carta o caja no encontrada en el inventario.' });
        }
        
        res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};
const obtenerPreventas = async (req, res) => {
    try {
        const resultado = await db.query("SELECT * FROM Productos WHERE estado = 'PREVENTA' ORDER BY fecha_lanzamiento ASC");
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener preventas:', error);
        res.status(500).json({ mensaje: 'Error al cargar las preventas.' });
    }
};

const buscarProductos = async (req, res) => {
    const { q } = req.query; 
    
    if (!q) {
        return res.status(200).json([]); 
    }

    try {
        const consulta = `
            SELECT id_producto, nombre, imagen_url, precio, categoria 
            FROM Productos 
            WHERE nombre ILIKE $1 
            LIMIT 5
        `;
        const resultado = await db.query(consulta, [`%${q}%`]); 
        
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error en la búsqueda predictiva:', error);
        res.status(500).json({ mensaje: 'Error al buscar productos.' });
    }
};

module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    obtenerPreventas,
    buscarProductos
};