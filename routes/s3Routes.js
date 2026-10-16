const express = require('express');
const router = express.Router();
const s3Controller = require('../controllers/s3Controller');

// Si deseas protegerlo para que solo usuarios autenticados suban archivos:
// const { protegerRuta } = require('../middlewares/authMiddleware');
// router.post('/presigned-url', protegerRuta, s3Controller.obtenerPresignedUrl);

router.post('/presigned-url', s3Controller.obtenerPresignedUrl);
router.post('/confirmar-subida', s3Controller.confirmarSubida);

module.exports = router;