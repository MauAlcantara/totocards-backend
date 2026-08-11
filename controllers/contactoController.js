const db = require("../config/db");

// Recibir mensaje desde la página de Contacto
const enviarMensaje = async (req, res) => {
  const { nombre, email, mensaje } = req.body;
  try {
    await db.query(
      "INSERT INTO Mensajes_Soporte (nombre, email, mensaje) VALUES ($1, $2, $3)",
      [nombre, email, mensaje],
    );
    res
      .status(201)
      .json({ mensaje: "Mensaje recibido. Te contactaremos pronto." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al enviar el mensaje de soporte." });
  }
};

// Ver todos los mensajes
const obtenerMensajes = async (req, res) => {
  try {
    const resultado = await db.query(
      "SELECT * FROM Mensajes_Soporte ORDER BY fecha_envio DESC",
    );
    res.status(200).json(resultado.rows);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al obtener la bandeja de entrada." });
  }
};

// Marcar como leído
const marcarLeido = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "UPDATE Mensajes_Soporte SET leido = TRUE WHERE id_mensaje = $1",
      [id],
    );
    res.status(200).json({ mensaje: "Mensaje marcado como leído." });
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al actualizar el estado del mensaje." });
  }
};

module.exports = { enviarMensaje, obtenerMensajes, marcarLeido };
