const db = require('../config/db');

// Función para obtener TODOS los productos
const obtenerProductos = async (req, res) => {
    try {
        // Hacemos la consulta a PostgreSQL
        const resultado = await db.query('SELECT * FROM Productos ORDER BY id_producto ASC');
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener los productos:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al cargar el catálogo.' });
    }
};

// Función para obtener UN SOLO producto por su ID (Para los Detalles de Producto)
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
// Función para obtener SOLO las preventas
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
    const { q } = req.query; // Capturamos el término de búsqueda de la URL (?q=charizard)
    
    if (!q) {
        return res.status(200).json([]); // Si no hay término, devolvemos arreglo vacío
    }

    try {
        // Usamos ILIKE para búsquedas parciales e insensibles a mayúsculas
        const consulta = `
            SELECT id_producto, nombre, imagen_url, precio, categoria 
            FROM Productos 
            WHERE nombre ILIKE $1 
            LIMIT 5
        `;
        // El % rodea la palabra para buscarla en cualquier parte del nombre
        const resultado = await db.query(consulta, [`%${q}%`]); 
        
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error en la búsqueda predictiva:', error);
        res.status(500).json({ mensaje: 'Error al buscar productos.' });
    }
};

// Exportamos las funciones para que las rutas las puedan usar
module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    obtenerPreventas,
    buscarProductos
};