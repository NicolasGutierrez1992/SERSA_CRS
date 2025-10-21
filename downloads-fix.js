// QUICK FIX para downloads.js
// Reemplazar el endpoint GET / con esta versión simplificada

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { estado, usuario_id, controlador_id, fecha_desde, fecha_hasta, cuit, page = 1, limit = 50 } = req.query;
  
  console.log('[GET /downloads] Filters received:', { estado, usuario_id, controlador_id, fecha_desde, fecha_hasta, cuit, page, limit });
  
  try {
    // Query simplificada SIN JOIN con certificados_v2
    let query = `
      SELECT 
        d.*,
        d.certificado_nombre,
        u.nombre as usuario_nombre, 
        u.cuit
      FROM descargas d
      JOIN users u ON d.id_usuario = u.id_usuario
      WHERE 1=1
    `;
    let params = [];
    
    if (estado) {
      query += ' AND d.estado = $' + (params.length + 1);
      params.push(estado);
    }
    
    if (usuario_id) {
      query += ' AND d.id_usuario = $' + (params.length + 1);
      params.push(usuario_id);
    }
    
    if (cuit) {
      query += ' AND u.cuit ILIKE $' + (params.length + 1);
      params.push(`%${cuit}%`);
    }
    
    if (controlador_id) {
      query += ' AND d.controlador_id = $' + (params.length + 1);
      params.push(controlador_id);
    }
    
    if (fecha_desde) {
      query += ' AND d.fecha >= $' + (params.length + 1);
      params.push(fecha_desde);
    }
    
    if (fecha_hasta) {
      query += ' AND d.fecha <= $' + (params.length + 1);
      params.push(fecha_hasta);
    }
    
    query += ' ORDER BY d.fecha DESC';
    
    // Paginación
    const offset = (page - 1) * limit;
    query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    console.log('[GET /downloads] Final query:', query);
    console.log('[GET /downloads] Query params:', params);
    
    const result = await pool.query(query, params);
    console.log('[GET /downloads] Found', result.rows.length, 'downloads');
    
    // Contar total (sin paginación)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM descargas d
      JOIN users u ON d.id_usuario = u.id_usuario
      WHERE 1=1
    `;
    let countParams = [];
    
    if (estado) {
      countQuery += ' AND d.estado = $' + (countParams.length + 1);
      countParams.push(estado);
    }
    
    if (usuario_id) {
      countQuery += ' AND d.id_usuario = $' + (countParams.length + 1);
      countParams.push(usuario_id);
    }
    
    if (cuit) {
      countQuery += ' AND u.cuit ILIKE $' + (countParams.length + 1);
      countParams.push(`%${cuit}%`);
    }
    
    if (controlador_id) {
      countQuery += ' AND d.controlador_id = $' + (countParams.length + 1);
      countParams.push(controlador_id);
    }
    
    if (fecha_desde) {
      countQuery += ' AND d.fecha >= $' + (countParams.length + 1);
      countParams.push(fecha_desde);
    }
    
    if (fecha_hasta) {
      countQuery += ' AND d.fecha <= $' + (countParams.length + 1);
      countParams.push(fecha_hasta);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    console.log('[GET /downloads] Total count:', total);
    console.log('[GET /downloads] Sending response with', result.rows.length, 'downloads');
    
    res.json({
      descargas: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('[GET /downloads] Error:', err);
    res.status(500).json({ message: 'Error al listar descargas' });
  }
});