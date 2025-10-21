const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /usuarios - Obtener todos los usuarios (solo admin)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.id_rol !== 1) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.email,
        u.empresa,
        u.limite_descargas,
        u.activo,
        u.created_at,
        u.id_rol,
        u.id_mayorista,
        r.nombre as rol,
        m.nombre as mayorista
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      LEFT JOIN mayoristas m ON u.id_mayorista = m.id_mayorista
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /usuarios/:id - Obtener un usuario por ID (solo admin)
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.user.id_rol !== 1) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const usuarioId = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM usuarios WHERE id_usuario = $1', [usuarioId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /usuarios - Crear un nuevo usuario (solo admin)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.id_rol !== 1) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { nombre, email, password, id_rol, empresa, limite_descargas, id_mayorista } = req.body;
    
    // Validar que el mayorista existe
    if (id_mayorista) {
      const mayoristaCheck = await pool.query(
        'SELECT id_mayorista FROM mayoristas WHERE id_mayorista = $1',
        [id_mayorista]
      );

      if (mayoristaCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Mayorista no válido' });
      }
    }

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, id_rol, empresa, limite_descargas, id_mayorista, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id_usuario, nombre, email, id_rol, empresa, limite_descargas, id_mayorista`,
      [nombre, email, password, id_rol, empresa || null, limite_descargas || 10, id_mayorista || 1]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === '23505') { // duplicate key error
      res.status(400).json({ message: 'El email ya está registrado' });
    } else {
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
});

// PUT /usuarios/:id - Actualizar un usuario por ID (solo admin)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.id_rol !== 1) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const usuarioId = parseInt(req.params.id);
    const { nombre, email, id_rol } = req.body;

    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre = $1, email = $2, id_rol = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id_usuario = $4 
       RETURNING id_usuario, nombre, email, id_rol`,
      [nombre, email, id_rol, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /usuarios/:id - Eliminar un usuario por ID (solo admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.id_rol !== 1) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const usuarioId = parseInt(req.params.id);
    const result = await pool.query('DELETE FROM usuarios WHERE id_usuario = $1 RETURNING id_usuario', [usuarioId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /usuarios/:id/mayorista - Actualizar mayorista de un usuario (solo admin)
router.put('/:id/mayorista', auth, async (req, res) => {
  try {
    // Solo administradores pueden cambiar mayorista
    if (req.user.id_rol !== 1) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const usuarioId = parseInt(req.params.id);
    const { id_mayorista } = req.body;

    // Validar que el mayorista existe
    const mayoristaCheck = await pool.query(
      'SELECT id_mayorista FROM mayoristas WHERE id_mayorista = $1',
      [id_mayorista]
    );

    if (mayoristaCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Mayorista no válido' });
    }

    // Actualizar el mayorista del usuario
    const result = await pool.query(
      `UPDATE usuarios 
       SET id_mayorista = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id_usuario = $2 
       RETURNING id_usuario, nombre, id_mayorista`,
      [id_mayorista, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO auditoria (id_usuario, accion, tabla, id_registro, datos_anteriores, datos_nuevos)
       VALUES ($1, 'UPDATE_MAYORISTA', 'usuarios', $2, $3, $4)`,
      [
        req.user.id_usuario,
        usuarioId,
        JSON.stringify({ accion: 'cambio_mayorista' }),
        JSON.stringify({ id_mayorista, timestamp: new Date() })
      ]
    );

    res.json({ 
      message: 'Mayorista actualizado exitosamente',
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user mayorista:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;