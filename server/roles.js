const express = require('express');
const router = express.Router();
const pool = require('./db');
const { verifyToken, requireAdmin } = require('./middleware');

// GET /roles - Obtener todos los roles (solo admin)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_rol, rol FROM roles ORDER BY id_rol'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;