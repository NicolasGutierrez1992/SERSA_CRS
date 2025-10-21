const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

console.log('Mayoristas route loaded'); // Debug log

// GET /mayoristas - Obtener todos los mayoristas (solo admin)
router.get('/', auth, async (req, res) => {
  try {
    console.log('GET /mayoristas called'); // Debug log
    
    // Verificar que sea administrador
    if (req.user.id_rol !== 1) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await pool.query(
      'SELECT id_mayorista, nombre FROM mayoristas ORDER BY nombre'
    );

    console.log('Mayoristas found:', result.rows.length); // Debug log
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching mayoristas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /mayoristas/:id/usuarios - Obtener usuarios asignados a un mayorista
router.get('/:id/usuarios', auth, async (req, res) => {
  try {
    const mayoristaId = parseInt(req.params.id);
    
    // Verificar permisos: admin puede ver todos, mayorista solo los suyos
    if (req.user.id_rol !== 1) {
      // Si no es admin, verificar que sea mayorista y que esté consultando sus propios usuarios
      if (req.user.id_rol !== 2) {
        return res.status(403).json({ message: 'No autorizado' });
      }
      
      // Verificar que el mayorista esté consultando sus propios usuarios
      const userMayorista = await pool.query(
        'SELECT id_mayorista FROM usuarios WHERE id_usuario = $1',
        [req.user.id_usuario]
      );
      
      if (userMayorista.rows.length === 0 || userMayorista.rows[0].id_mayorista !== mayoristaId) {
        return res.status(403).json({ message: 'No autorizado para ver estos usuarios' });
      }
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
        r.nombre as rol,
        m.nombre as mayorista
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      JOIN mayoristas m ON u.id_mayorista = m.id_mayorista
      WHERE u.id_mayorista = $1
      ORDER BY u.nombre
    `;

    const result = await pool.query(query, [mayoristaId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching usuarios by mayorista:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /mayoristas/:id/descargas - Obtener descargas de usuarios de un mayorista
router.get('/:id/descargas', auth, async (req, res) => {
  try {
    const mayoristaId = parseInt(req.params.id);
    const { usuario_id, fecha_inicio, fecha_fin, page = 1, limit = 50 } = req.query;
    
    // Verificar permisos: admin puede ver todos, mayorista solo los suyos
    if (req.user.id_rol !== 1) {
      if (req.user.id_rol !== 2) {
        return res.status(403).json({ message: 'No autorizado' });
      }
      
      // Verificar que el mayorista esté consultando sus propias descargas
      const userMayorista = await pool.query(
        'SELECT id_mayorista FROM usuarios WHERE id_usuario = $1',
        [req.user.id_usuario]
      );
      
      if (userMayorista.rows.length === 0 || userMayorista.rows[0].id_mayorista !== mayoristaId) {
        return res.status(403).json({ message: 'No autorizado para ver estas descargas' });
      }
    }

    let query = `
      SELECT 
        d.id_descarga,
        d.numero_certificado,
        d.fecha_descarga,
        d.ip_descarga,
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        u.empresa as usuario_empresa,
        m.nombre as mayorista_nombre
      FROM descargas d
      JOIN usuarios u ON d.id_usuario = u.id_usuario
      JOIN mayoristas m ON u.id_mayorista = m.id_mayorista
      WHERE u.id_mayorista = $1
    `;

    const queryParams = [mayoristaId];
    let paramCount = 1;

    // Filtrar por usuario específico si se proporciona
    if (usuario_id) {
      paramCount++;
      query += ` AND d.id_usuario = $${paramCount}`;
      queryParams.push(parseInt(usuario_id));
    }

    // Filtrar por fecha si se proporciona
    if (fecha_inicio) {
      paramCount++;
      query += ` AND d.fecha_descarga >= $${paramCount}`;
      queryParams.push(fecha_inicio);
    }

    if (fecha_fin) {
      paramCount++;
      query += ` AND d.fecha_descarga <= $${paramCount}`;
      queryParams.push(fecha_fin);
    }

    // Ordenar y paginar
    query += ` ORDER BY d.fecha_descarga DESC`;
    
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Obtener total de registros para paginación
    let countQuery = `
      SELECT COUNT(*) as total
      FROM descargas d
      JOIN usuarios u ON d.id_usuario = u.id_usuario
      WHERE u.id_mayorista = $1
    `;
    
    const countParams = [mayoristaId];
    let countParamCount = 1;

    if (usuario_id) {
      countParamCount++;
      countQuery += ` AND d.id_usuario = $${countParamCount}`;
      countParams.push(parseInt(usuario_id));
    }

    if (fecha_inicio) {
      countParamCount++;
      countQuery += ` AND d.fecha_descarga >= $${countParamCount}`;
      countParams.push(fecha_inicio);
    }

    if (fecha_fin) {
      countParamCount++;
      countQuery += ` AND d.fecha_descarga <= $${countParamCount}`;
      countParams.push(fecha_fin);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      descargas: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }    });
  } catch (error) {
    console.error('Error fetching descargas by mayorista:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

console.log('Mayoristas routes configured'); // Debug log
module.exports = router;