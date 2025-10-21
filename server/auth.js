const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { verifyToken, requireAdmin } = require('./middleware');
const { registrarAuditoria } = require('./audit');
const router = express.Router();
const SECRET = process.env.TOKEN_SECRET || 'mi_clave_secreta';

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login de usuario
 *     description: Obtiene un token JWT si las credenciales son válidas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cuit:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 id_rol:
 *                   type: integer
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', async (req, res) => {
  const { cuit, password } = req.body;
  console.log('Login intento:', { cuit });
  if (!cuit || !password) {
    console.log('Faltan datos requeridos');
    return res.status(400).json({ message: 'CUIT/CUIL y contraseña son requeridos' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE cuit = $1 AND status = 1', [cuit]);
    console.log('Resultado consulta usuario:', result.rows);
    const user = result.rows[0];
    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    console.log('Contraseña ingresada:', password);
    console.log('Hash almacenado:', user.password);
    const valid = await bcrypt.compare(password, user.password);
    console.log('¿La contraseña coincide?', valid);
    if (!valid) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }    // Actualizar ultimo_login
    await pool.query('UPDATE users SET ultimo_login = NOW() WHERE id_usuario = $1', [user.id_usuario]);

    if (user.must_change_password) {
      console.log('Usuario debe cambiar contraseña');
      return res.status(200).json({ 
        must_change_password: true, 
        id_usuario: user.id_usuario,
        message: 'Debe cambiar su contraseña antes de continuar'
      });
    }    // Genera access token y refresh token
    const payload = { 
      cuit: user.cuit, 
      id_usuario: user.id_usuario, 
      id_rol: user.id_rol,
      rol: user.id_rol === 1 ? 'Administrador' : user.id_rol === 2 ? 'Mayorista' : 'Distribuidor'
    };
    const accessToken = jwt.sign(payload, SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET || 'mi_refresh_secreto', { expiresIn: '7d' });

    // Registrar auditoría de login exitoso
    await registrarAuditoria(
      user.id_usuario,
      'LOGIN',
      'users',
      user.id_usuario.toString(),
      req.ip
    );    res.json({ 
      accessToken, 
      refreshToken, 
      id_rol: user.id_rol, 
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      rol: user.id_rol === 1 ? 'Administrador' : user.id_rol === 2 ? 'Mayorista' : 'Distribuidor'
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

router.post('/register', async (req, res) => {
  const { nombre, mail, password, id_rol } = req.body;
  if (!nombre || !mail || !password || !id_rol) {
    return res.status(400).json({ message: 'Faltan datos requeridos' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (nombre, mail, password, status, id_rol) VALUES ($1, $2, $3, 1, $4)',
      [nombre, mail, hashedPassword, id_rol]
    );
    res.json({ message: 'Usuario registrado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
});

// Endpoint para cambio de contraseña (primer login o cambio voluntario)
router.post('/change-password', async (req, res) => {
  const { id_usuario, newPassword, currentPassword } = req.body;
  
  if (!id_usuario || !newPassword) {
    return res.status(400).json({ message: 'Faltan datos requeridos' });
  }
  // Validación mínima de contraseña (solo no vacía)
  if (!newPassword || newPassword.trim().length === 0) {
    return res.status(400).json({
      message: 'La contraseña no puede estar vacía.'
    });
  }try {
    // Verificar contraseña actual si se proporciona (para usuarios logueados)
    if (currentPassword) {
      const user = await pool.query('SELECT password FROM users WHERE id_usuario = $1', [id_usuario]);
      if (user.rows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      
      const validCurrentPassword = await bcrypt.compare(currentPassword, user.rows[0].password);
      if (!validCurrentPassword) {
        return res.status(401).json({ message: 'Contraseña actual incorrecta' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, must_change_password = FALSE, updated_at = NOW() WHERE id_usuario = $2',
      [hashedPassword, id_usuario]
    );

    // Registrar auditoría
    await registrarAuditoria(
      id_usuario,
      'CHANGE_PASSWORD',
      'users',
      id_usuario.toString(),
      req.ip
    );

    res.json({ message: 'Contraseña cambiada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al cambiar la contraseña' });
  }
});

// Endpoint para que el admin pueda resetear la contraseña de un usuario
router.post('/admin/reset-password', verifyToken, requireAdmin, async (req, res) => {
  const { id_usuario, nuevaPassword } = req.body;
  
  if (!id_usuario || !nuevaPassword) {
    return res.status(400).json({ message: 'Faltan datos requeridos' });
  }
  // Validación mínima de contraseña (solo no vacía)
  if (!nuevaPassword || nuevaPassword.trim().length === 0) {
    return res.status(400).json({
      message: 'La contraseña no puede estar vacía.'
    });
  }

  try {
    // Obtener datos del usuario antes del cambio
    const userBefore = await pool.query('SELECT cuit, nombre FROM users WHERE id_usuario = $1', [id_usuario]);
    if (userBefore.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, must_change_password = TRUE, updated_at = NOW() WHERE id_usuario = $2',
      [hashedPassword, id_usuario]
    );

    // Registrar auditoría
    await registrarAuditoria(
      req.user.id_usuario,
      'RESET_PASSWORD',
      'users',
      id_usuario.toString(),
      req.ip,
      { must_change_password: false },
      { must_change_password: true }
    );

    res.json({ message: 'Contraseña reseteada y usuario marcado para cambio obligatorio.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al resetear la contraseña' });
  }
});

module.exports = router;
