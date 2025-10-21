const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

console.log('Mayoristas route file loaded');

// GET /mayoristas - Obtener todos los mayoristas (solo admin)
router.get('/', auth, async (req, res) => {
  try {
    console.log('GET /mayoristas endpoint called');
    console.log('User role:', req.user.id_rol);
    
    // Verificar que sea administrador
    if (req.user.id_rol !== 1) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await pool.query(
      'SELECT id_mayorista, nombre FROM mayoristas ORDER BY nombre'
    );

    console.log('Mayoristas query result:', result.rows.length, 'rows');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching mayoristas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

console.log('Mayoristas router configured');
module.exports = router;