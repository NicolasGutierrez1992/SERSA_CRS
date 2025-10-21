const express = require('express');
const router = express.Router();
const pool = require('./db');
const { verifyToken, requireAdmin } = require('./middleware');

console.log('Mayoristas route loaded');

// GET /mayoristas - Obtener todos los mayoristas (solo admin)
router.get('/', verifyToken, requireAdmin, async (req, res) => {  try {
    console.log('GET /mayoristas called');
    
    const result = await pool.query(
      'SELECT id_mayorista, nombre FROM mayoristas ORDER BY nombre'
    );

    console.log('Mayoristas found:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching mayoristas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /mayoristas/:id/usuarios - Obtener usuarios asignados a un mayorista
router.get('/:id/usuarios', verifyToken, async (req, res) => {
  try {
    const mayoristaId = parseInt(req.params.id);
    console.log('GET usuarios - Mayorista ID:', mayoristaId, 'User role:', req.user.id_rol, 'User ID:', req.user.id_usuario);
    
    // Verificar permisos: admin puede ver todos, mayorista solo los suyos
    if (req.user.id_rol !== 1) {
      // Si no es admin, verificar que sea mayorista y que esté consultando sus propios usuarios
      if (req.user.id_rol !== 2) {
        return res.status(403).json({ message: 'No autorizado' });
      }      // Verificar que el mayorista esté consultando sus propios usuarios
      const userMayorista = await pool.query(
        'SELECT id_mayorista FROM users WHERE id_usuario = $1',
        [req.user.id_usuario]
      );
      
      console.log('User mayorista query result:', userMayorista.rows);
      
      if (userMayorista.rows.length === 0) {
        console.log('No mayorista found for user:', req.user.id_usuario);
        return res.status(403).json({ message: 'Usuario sin mayorista asignado' });
      }
      
      const userMayoristaId = userMayorista.rows[0].id_mayorista;
      console.log('User mayorista ID:', userMayoristaId, 'Requested mayorista ID:', mayoristaId);
      
      if (userMayoristaId !== mayoristaId) {
        return res.status(403).json({ 
          message: `No autorizado. Usuario pertenece a mayorista ${userMayoristaId}, pero solicita mayorista ${mayoristaId}` 
        });
      }
    }    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.mail as email,
        u.limite_descargas,
        u.status as activo,
        u.created_at,
        r.rol,
        m.nombre as mayorista
      FROM users u
      JOIN roles r ON u.id_rol = r.id_rol
      JOIN mayoristas m ON u.id_mayorista = m.id_mayorista
      WHERE u.id_mayorista = $1
      ORDER BY u.nombre
    `;    const result = await pool.query(query, [mayoristaId]);
    console.log('Query executed, found', result.rows.length, 'usuarios');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching usuarios by mayorista:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /mayoristas/:id/descargas - Obtener descargas de usuarios de un mayorista
router.get('/:id/descargas', verifyToken, async (req, res) => {
  try {    const mayoristaId = parseInt(req.params.id);
    const { usuario_id, fecha_inicio, fecha_fin, estado, page = 1, limit = 50 } = req.query;
    
    console.log('GET descargas - Mayorista ID:', mayoristaId);
    console.log('Query params:', { usuario_id, fecha_inicio, fecha_fin, estado, page, limit });
    console.log('User role:', req.user.id_rol, 'User ID:', req.user.id_usuario);
    
    // Verificar permisos: admin puede ver todos, mayorista solo los suyos
    if (req.user.id_rol !== 1) {
      if (req.user.id_rol !== 2) {
        return res.status(403).json({ message: 'No autorizado' });
      }
        // Verificar que el mayorista esté consultando sus propias descargas
      const userMayorista = await pool.query(
        'SELECT id_mayorista FROM users WHERE id_usuario = $1',
        [req.user.id_usuario]
      );
      
      if (userMayorista.rows.length === 0 || userMayorista.rows[0].id_mayorista !== mayoristaId) {
        return res.status(403).json({ message: 'No autorizado para ver estas descargas' });
      }
    }

    let query = `
      SELECT 
        d.id_descarga,
        d.certificado_nombre,
        d.fecha,        d.estado,        u.nombre as usuario_nombre,
        u.mail as usuario_email,
        u.cuit as usuario_cuit,
        m.nombre as mayorista_nombre
      FROM descargas d
      JOIN users u ON d.id_usuario = u.id_usuario
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
    }    // Filtrar por fecha si se proporciona
    if (fecha_inicio) {
      paramCount++;
      query += ` AND d.fecha >= $${paramCount}`;
      queryParams.push(fecha_inicio);
    }

    if (fecha_fin) {
      paramCount++;
      query += ` AND d.fecha <= $${paramCount}`;
      queryParams.push(fecha_fin);
    }

    // Filtrar por estado si se proporciona
    if (estado) {
      paramCount++;
      query += ` AND d.estado = $${paramCount}`;
      queryParams.push(estado);
    }

    // Ordenar y paginar
    query += ` ORDER BY d.fecha DESC`;
    
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    console.log('query ' , query)
    queryParams.push(offset);    const result = await pool.query(query, queryParams);

    console.log('Descargas query executed with params:', queryParams);
    console.log('Found', result.rows.length, 'descargas');

    // Obtener total de registros para paginación
    let countQuery = `      SELECT COUNT(*) as total
      FROM descargas d
      JOIN users u ON d.id_usuario = u.id_usuario
      WHERE u.id_mayorista = $1
    `;
    
    const countParams = [mayoristaId];
    let countParamCount = 1;

    if (usuario_id) {
      countParamCount++;
      countQuery += ` AND d.id_usuario = $${countParamCount}`;
      countParams.push(parseInt(usuario_id));
    }    if (fecha_inicio) {
      countParamCount++;
      countQuery += ` AND d.fecha >= $${countParamCount}`;
      countParams.push(fecha_inicio);
    }

    if (fecha_fin) {
      countParamCount++;
      countQuery += ` AND d.fecha <= $${countParamCount}`;
      countParams.push(fecha_fin);
    }

    if (estado) {
      countParamCount++;
      countQuery += ` AND d.estado = $${countParamCount}`;
      countParams.push(estado);
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
      }
    });
  } catch (error) {
    console.error('Error fetching descargas by mayorista:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

console.log('Mayoristas routes configured');
module.exports = router;