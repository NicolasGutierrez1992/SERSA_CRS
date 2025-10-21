const jwt = require('jsonwebtoken');
const pool = require('./db');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('Authorization header:', authHeader);
  
  if (!authHeader) {
    return res.status(403).json({ message: 'Token requerido' });
  }
  
  // Extraer el token del formato "Bearer {token}"
  let token;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remover "Bearer "
  } else {
    token = authHeader; // Compatibilidad con formato anterior
  }
  
  if (!token) {
    return res.status(403).json({ message: 'Token requerido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET || 'mi_clave_secreta');
    console.log('Token decoded:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ message: 'Token inválido' });
  }
}

// Middleware para verificar rol admin
function requireAdmin(req, res, next) {
  if (req.user && req.user.id_rol === 1) {
    return next();
  }
  return res.status(403).json({ message: 'Acceso denegado: solo administradores' });
}

module.exports = { verifyToken, requireAdmin };