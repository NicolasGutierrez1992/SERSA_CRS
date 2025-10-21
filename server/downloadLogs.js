const express = require('express');
const pool = require('./db');
const router = express.Router();

// Guardar log de descarga
router.post('/', async (req, res) => {
  const { id_certificado, paso, mensaje, estado } = req.body;
  if (!id_certificado || !paso || !mensaje) {
    return res.status(400).json({ message: 'Faltan datos requeridos' });
  }
  try {
    await pool.query(
      'INSERT INTO download_logs (id_certificado, paso, mensaje, estado, fecha) VALUES ($1, $2, $3, $4, NOW())',
      [id_certificado, paso, mensaje, estado || 'info']
    );
    res.json({ message: 'Log de descarga guardado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar log de descarga' });
  }
});

// Consultar logs de descarga por certificado
router.get('/:id_certificado', async (req, res) => {
  const { id_certificado } = req.params;
  try {
    const result = await pool.query('SELECT * FROM download_logs WHERE id_certificado = $1 ORDER BY fecha', [id_certificado]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al consultar logs de descarga' });
  }
});

module.exports = router;
