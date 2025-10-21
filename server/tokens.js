const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const router = express.Router();
const SECRET = process.env.TOKEN_SECRET || 'mi_clave_secreta';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'mi_refresh_secreto';

// Guardar refresh tokens en memoria (puedes usar la base de datos para producción)
let refreshTokens = [];

// Endpoint para obtener un nuevo access token usando refresh token
router.post('/refresh', async (req, res) => {
  const { token } = req.body;
  if (!token || !refreshTokens.includes(token)) {
    return res.status(403).json({ message: 'Refresh token inválido' });
  }
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    const accessToken = jwt.sign({ cuit: payload.cuit, id_usuario: payload.id_usuario, id_rol: payload.id_rol }, SECRET, { expiresIn: '15m' });
    res.json({ accessToken });
  } catch (err) {
    res.status(403).json({ message: 'Refresh token inválido' });
  }
});

// Endpoint para revocar refresh token (admin)
router.post('/revoke', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Falta el token' });
  refreshTokens = refreshTokens.filter(t => t !== token);
  res.json({ message: 'Sesión revocada correctamente' });
});

// Endpoint para login que devuelve access y refresh token
router.post('/login', async (req, res) => {
  // ...existing login logic...
  // Si login exitoso:
  // const accessToken = jwt.sign({ ...payload }, SECRET, { expiresIn: '15m' });
  // const refreshToken = jwt.sign({ ...payload }, REFRESH_SECRET, { expiresIn: '7d' });
  // refreshTokens.push(refreshToken);
  // res.json({ accessToken, refreshToken, id_rol });
});

module.exports = router;
