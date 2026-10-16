const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');

const obtenerPresignedUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ mensaje: 'Nombre y tipo de archivo requeridos.' });
    }

    // Clave única para evitar sobreescribir archivos con el mismo nombre
    const fileKey = `uploads/${Date.now()}_${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType
    });

    // Enlace temporal con vigencia de 5 minutos (300 segundos)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    res.json({
      uploadUrl,
      fileKey,
      publicUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`
    });
  } catch (error) {
    console.error('Error al generar la URL preasignada:', error);
    res.status(500).json({ mensaje: 'Error al generar la URL preasignada en AWS S3.' });
  }
};

// POST /api/s3/confirmar-subida
const confirmarSubida = async (req, res) => {
  try {
    const { s3_key, publicUrl, tipo_mime, id_usuario } = req.body;
    
    const query = `
      INSERT INTO Archivos_S3 (s3_key, url_publica, tipo_mime, id_usuario)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const resultado = await db.query(query, [s3_key, publicUrl, tipo_mime, id_usuario]);
    
    res.status(201).json({
      mensaje: 'Metadatos guardados con éxito en la base de datos.',
      archivo: resultado.rows[0]
    });
  } catch (error) {
    console.error('Error al guardar metadatos en Neon:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar metadatos.' });
  }
};

module.exports = { obtenerPresignedUrl, confirmarSubida };