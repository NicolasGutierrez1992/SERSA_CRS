const express = require('express');
const pool = require('./db');
const { verifyToken, requireAdmin } = require('./middleware');
const router = express.Router();

// Función helper para registrar auditoría
async function registrarAuditoria(actor_id, accion, objetivo_tipo, objetivo_id, ip, antes = null, despues = null) {
  try {
    await pool.query(
      'INSERT INTO auditoria (actor_id, accion, objetivo_tipo, objetivo_id, ip, antes, despues) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [actor_id, accion, objetivo_tipo, objetivo_id, ip, antes ? JSON.stringify(antes) : null, despues ? JSON.stringify(despues) : null]
    );
  } catch (err) {
    console.error('Error registrando auditoría:', err);
  }
}

// Consultar historial de auditoría con filtros (solo admins)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { accion, actor_id, desde, hasta, objetivo_tipo } = req.query;
  const { page = 1, limit = 50 } = req.query;
  
  let query = `
    SELECT a.*, u.nombre as actor_nombre 
    FROM auditoria a
    LEFT JOIN users u ON a.actor_id = u.id_usuario
    WHERE 1=1
  `;
  let params = [];

  if (accion) {
    query += ' AND a.accion = $' + (params.length + 1);
    params.push(accion);
  }
  if (actor_id) {
    query += ' AND a.actor_id = $' + (params.length + 1);
    params.push(actor_id);
  }
  if (objetivo_tipo) {
    query += ' AND a.objetivo_tipo = $' + (params.length + 1);
    params.push(objetivo_tipo);
  }
  if (desde) {
    query += ' AND a.timestamp >= $' + (params.length + 1);
    params.push(desde);
  }
  if (hasta) {
    query += ' AND a.timestamp <= $' + (params.length + 1);
    params.push(hasta);
  }

  query += ' ORDER BY a.timestamp DESC';
  
  // Paginación
  const offset = (page - 1) * limit;
  query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);

  try {
    const result = await pool.query(query, params);
    
    // Contar total para paginación
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM auditoria a
      WHERE 1=1
    `;
    let countParams = [];
    if (accion) {
      countQuery += ' AND a.accion = $' + (countParams.length + 1);
      countParams.push(accion);
    }
    if (actor_id) {
      countQuery += ' AND a.actor_id = $' + (countParams.length + 1);
      countParams.push(actor_id);
    }
    if (objetivo_tipo) {
      countQuery += ' AND a.objetivo_tipo = $' + (countParams.length + 1);
      countParams.push(objetivo_tipo);
    }
    if (desde) {
      countQuery += ' AND a.timestamp >= $' + (countParams.length + 1);
      countParams.push(desde);
    }
    if (hasta) {
      countQuery += ' AND a.timestamp <= $' + (countParams.length + 1);
      countParams.push(hasta);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      auditorias: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error consultando auditoría:', err);
    res.status(500).json({ message: 'Error al consultar auditoría' });
  }
});

module.exports = { router, registrarAuditoria };
