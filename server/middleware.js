const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  console.log('Verifying token:', token);
  if (!token) return res.status(403).send('Token requerido');
  try {
    req.user = jwt.verify(token, process.env.TOKEN_SECRET);
    next();
  } catch {
    res.status(401).send('Token inválido');
  }
}

module.exports = { verifyToken };