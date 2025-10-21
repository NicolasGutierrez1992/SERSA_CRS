const express = require('express');
const pool = require('./db');
const { verifyToken } = require('./middleware');
const router = express.Router();

// Middleware para verificar rol admin
function requireAdmin(req, res, next) {
  if (req.user && req.user.id_rol === 1) {
    return next();
  }
  return res.status(403).json({ message: 'Acceso denegado: solo administradores' });
}

// Exportar usuarios en CSV
router.get('/usuarios/csv', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE status = 1');
    const rows = result.rows;
    let csv = 'id_usuario,nombre,mail,id_rol\n';
    csv += rows.map(u => `${u.id_usuario},"${u.nombre}","${u.mail}",${u.id_rol}`).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('usuarios.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al exportar usuarios' });
  }
});

// Exportar descargas en CSV con filtro de fechas
router.get('/descargas/csv', verifyToken, requireAdmin, async (req, res) => {
  const { desde, hasta } = req.query;
  let query = 'SELECT * FROM certificados';
  let params = [];
  if (desde && hasta) {
    query += ' WHERE fechaGeneracionn BETWEEN $1 AND $2';
    params = [desde, hasta];
  }
  try {
    const result = await pool.query(query, params);
    const rows = result.rows;
    let csv = 'id_certificado,id_usuario,serie,fechaGeneracionn,estado\n';
    csv += rows.map(d => `${d.id_certificado},${d.id_usuario},"${d.serie}",${d.fechaGeneracionn},${d.estado}`).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('descargas.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al exportar descargas' });
  }
});

// Exportar auditoría en CSV
router.get('/auditoria/csv', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit');
    const rows = result.rows;
    let csv = 'id_audit,id_usuario,accion,detalle,fecha\n';
    csv += rows.map(a => `${a.id_audit},${a.id_usuario},"${a.accion}","${a.detalle}",${a.fecha}`).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('auditoria.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al exportar auditoría' });
  }
});

module.exports = router;
