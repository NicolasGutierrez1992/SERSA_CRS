const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /roles - Obtener todos los roles (solo admin)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.id_rol !== 1) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await pool.query(
      'SELECT id_rol, nombre FROM roles ORDER BY id_rol'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;