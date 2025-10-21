const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { verifyToken, requireAdmin } = require('./middleware');
const { registrarAuditoria } = require('./audit');
const router = express.Router();

// Crear usuario
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { nombre, cuit, mail, password, id_rol, limite_descargas } = req.body;
  if (!nombre || !cuit || !mail || !password || !id_rol) {
    return res.status(400).json({ message: 'Faltan datos requeridos' });
  }
  // Validación mínima de contraseña (solo no vacía)
  if (!password || password.trim().length === 0) {
    return res.status(400).json({ 
      message: 'La contraseña no puede estar vacía' 
    });
  }

  try {
    // Verificar si el CUIT ya existe
    const existingUser = await pool.query('SELECT id_usuario FROM users WHERE cuit = $1', [cuit]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe un usuario con ese CUIT' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (nombre, cuit, mail, password, status, id_rol, limite_descargas, must_change_password, created_by, created_at) VALUES ($1, $2, $3, $4, 1, $5, $6, TRUE, $7, NOW()) RETURNING id_usuario',
      [nombre, cuit, mail, hashedPassword, id_rol, limite_descargas || 5, req.user.id_usuario]
    );

    const nuevoUsuarioId = result.rows[0].id_usuario;

    // Registrar auditoría
    await registrarAuditoria(
      req.user.id_usuario,
      'CREATE_USER',
      'users',
      nuevoUsuarioId.toString(),
      req.ip,
      null,
      { nombre, cuit, mail, id_rol, limite_descargas }
    );

    res.json({ message: 'Usuario creado correctamente', id_usuario: nuevoUsuarioId });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Error de unicidad
      res.status(400).json({ message: 'Ya existe un usuario con ese CUIT o email' });
    } else {
      res.status(500).json({ message: 'Error al crear usuario' });
    }
  }
});

// Listar usuarios
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.cuit,
        u.mail,
        u.limite_descargas,
        u.status,
        u.created_at,
        u.ultimo_login,
        u.id_rol,
        u.id_mayorista,
        r.rol,
        m.nombre as mayorista
      FROM users u
      JOIN roles r ON u.id_rol = r.id_rol
      LEFT JOIN mayoristas m ON u.id_mayorista = m.id_mayorista
      WHERE u.status = 1
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar usuarios' });
  }
});

// GET /users/me - Obtener información del usuario logueado
router.get('/me', verifyToken, async (req, res) => {
  try {
    console.log('GET /users/me called for user ID:', req.user.id_usuario);
    
    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.cuit,
        u.mail,
        u.limite_descargas,
        u.status,
        u.created_at,
        u.ultimo_login,
        u.id_rol,
        u.id_mayorista,
        r.rol,
        m.nombre as mayorista
      FROM users u
      JOIN roles r ON u.id_rol = r.id_rol
      LEFT JOIN mayoristas m ON u.id_mayorista = m.id_mayorista
      WHERE u.id_usuario = $1
    `;
    
    const result = await pool.query(query, [req.user.id_usuario]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    console.log('User data from DB:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in /users/me:', err);
    res.status(500).json({ message: 'Error al obtener información del usuario' });
  }
});

// Listar roles disponibles
router.get('/roles', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar roles' });
  }
});

// Listar mayoristas
router.get('/mayoristas', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mayoristas');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar mayoristas' });
  }
});

// Editar usuario
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { nombre, cuit, mail, password, id_rol, limite_descargas } = req.body;
  const { id } = req.params;
  try {
    let query, params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET nombre = $1, cuit = $2, mail = $3, password = $4, id_rol = $5, limite_descargas = $6 WHERE id_usuario = $7';
      params = [nombre, cuit, mail, hashedPassword, id_rol, limite_descargas || 5, id];
    } else {
      query = 'UPDATE users SET nombre = $1, cuit = $2, mail = $3, id_rol = $4, limite_descargas = $5 WHERE id_usuario = $6';
      params = [nombre, cuit, mail, id_rol, limite_descargas || 5, id];
    }
    await pool.query(query, params);
    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
});

// Eliminar usuario (soft delete)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET status = 0 WHERE id_usuario = $1', [id]);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
});

// PUT /users/:id/mayorista - Actualizar mayorista de un usuario (solo admin)
router.put('/:id/mayorista', verifyToken, requireAdmin, async (req, res) => {
  try {
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
      `UPDATE users 
       SET id_mayorista = $1
       WHERE id_usuario = $2 
       RETURNING id_usuario, nombre, id_mayorista`,
      [id_mayorista, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Registrar en auditoría si existe la tabla
    try {
      await registrarAuditoria(
        req.user.id_usuario,
        'UPDATE_MAYORISTA',
        'users',
        usuarioId.toString(),
        req.ip,
        { accion: 'cambio_mayorista' },
        { id_mayorista, timestamp: new Date() }
      );
    } catch (auditError) {
      console.log('No se pudo registrar en auditoría:', auditError.message);
    }

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
