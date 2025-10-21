const express = require('express');
const pool = require('./db');
const { verifyToken, requireAdmin } = require('./middleware');
const { registrarAuditoria } = require('./audit');
const { verificarLimiteDescargas, notificarLimiteAlcanzado } = require('./limitesControl');
const router = express.Router();

// Iniciar proceso de descarga de certificado
router.post('/start', verifyToken, async (req, res) => {
  const { certificateId } = req.body;
  const userId = req.user.id_usuario;
  
  if (!certificateId) {
    return res.status(400).json({ message: 'ID de certificado requerido' });
  }

  try {
    // Verificar si el usuario puede descargar
    const limitCheck = await verificarLimiteDescargas(userId);
    
    if (!limitCheck.canDownload) {
      // Notificar intento de descarga bloqueada
      await notificarLimiteAlcanzado(userId, limitCheck.pendingCount, limitCheck.limit, 'blocked');
      
      return res.status(403).json({
        message: limitCheck.message,
        pendingCount: limitCheck.pendingCount,
        limit: limitCheck.limit
      });
    }

    // Verificar que el certificado existe
    const certResult = await pool.query(
      'SELECT * FROM certificados_v2 WHERE id_certificado = $1',
      [certificateId]
    );

    if (certResult.rows.length === 0) {
      return res.status(404).json({ message: 'Certificado no encontrado' });
    }

    const certificate = certResult.rows[0];

    // Crear registro de descarga
    const downloadResult = await pool.query(
      'INSERT INTO descargas (id_usuario, id_certificado, controlador_id, ip_origen, logs) VALUES ($1, $2, $3, $4, $5) RETURNING id_descarga',
      [
        userId,
        certificateId,
        certificate.controlador_id,
        req.ip,
        JSON.stringify([{ timestamp: new Date(), message: 'Descarga iniciada', step: 'INIT' }])
      ]
    );    const downloadId = downloadResult.rows[0].id_descarga;

    // TEMPORAL: Comentar auditoría hasta resolver problema UUID
    /*
    // Registrar auditoría
    await registrarAuditoria(
      userId,
      'START_DOWNLOAD',
      'descargas',
      downloadId.toString(),
      req.ip,
      null,
      { certificateId, status: 'started' }
    );
    */

    // Verificar si necesita notificar sobre límite
    const newPendingCount = limitCheck.pendingCount + 1;
    const percentage = (newPendingCount / limitCheck.limit) * 100;

    if (percentage >= 100) {
      await notificarLimiteAlcanzado(userId, newPendingCount, limitCheck.limit, '100%');
    } else if (percentage >= 80) {
      await notificarLimiteAlcanzado(userId, newPendingCount, limitCheck.limit, '80%');
    }

    res.json({
      downloadId,
      message: 'Descarga iniciada correctamente',
      pendingCount: newPendingCount,
      limit: limitCheck.limit,
      percentage: Math.round(percentage)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar descarga' });
  }
});

// Obtener estado y logs de una descarga
router.get('/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_usuario;
  
  try {    let query = `
      SELECT d.*, d.certificado_nombre, u.nombre as usuario_nombre
      FROM descargas d
      JOIN users u ON d.id_usuario = u.id_usuario
      WHERE d.id_descarga = $1
    `;
    
    let params = [id];
    
    // Si no es admin, solo puede ver sus propias descargas
    if (req.user.id_rol !== 1) {
      query += ' AND d.id_usuario = $2';
      params.push(userId);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Descarga no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener estado de descarga' });
  }
});

// Listar todas las descargas (solo admin) con filtros
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  const { estado, usuario_id, controlador_id, fecha_desde, fecha_hasta, cuit, page = 1, limit = 50 } = req.query;
  console.log('[GET /downloads] Filters received:', { estado, usuario_id, controlador_id, fecha_desde, fecha_hasta, cuit, page, limit });
  
  try {    let query = `
      SELECT 
        d.*,
        COALESCE(d.certificado_nombre, 'Certificado') as certificado_nombre,
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
    
    // Contar total  
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
    
    const countResult = await pool.query(countQuery, countParams);    const total = parseInt(countResult.rows[0].total);
    
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
    console.error(err);
    res.status(500).json({ message: 'Error al listar descargas' });
  }
});

// Listar descargas por usuario (usuarios ven solo las suyas)
router.get('/usuario/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_usuario;
  
  // Si no es admin, solo puede ver sus propias descargas
  if (req.user.id_rol !== 1 && parseInt(id) !== userId) {
    return res.status(403).json({ message: 'Solo puede ver sus propias descargas' });
  }
  
  try {    const result = await pool.query(`
      SELECT d.*, d.certificado_nombre 
      FROM descargas d
      WHERE d.id_usuario = $1
      ORDER BY d.fecha DESC
    `, [id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar descargas de usuario' });
  }
});

// Cambio masivo de estado (solo admin) - DEBE IR ANTES QUE /:id/estado
router.put('/batch/estado', verifyToken, requireAdmin, async (req, res) => {
  const { ids, estado } = req.body;
  
  console.log('[BATCH CHANGE] Request body:', req.body);
  console.log('[BATCH CHANGE] IDs type:', typeof ids, 'IDs value:', ids);
  console.log('[BATCH CHANGE] Estado:', estado);
  
  if (!ids || !Array.isArray(ids) || !estado || !['Pendiente de Facturar', 'Facturado'].includes(estado)) {
    console.log('[BATCH CHANGE] Validation failed:', { 
      hasIds: !!ids, 
      isArray: Array.isArray(ids), 
      hasEstado: !!estado, 
      validEstado: ['Pendiente de Facturar', 'Facturado'].includes(estado) 
    });
    return res.status(400).json({ message: 'Datos inválidos' });
  }
  
  try {
    console.log('[BATCH CHANGE] Iniciando cambio masivo:', { ids, estado });
    
    // Debug: Verificar tipos de los IDs
    console.log('[BATCH CHANGE] Debugging IDs:');
    ids.forEach((id, index) => {
      console.log(`  ID ${index}: "${id}" (type: ${typeof id}, length: ${String(id).length})`);
    });
    
    // Intentar actualización con loop individual para evitar problemas con ANY()
    const updatedIds = [];
    let errorOccurred = false;
    
    for (const id of ids) {
      try {
        console.log(`[BATCH CHANGE] Procesando ID: "${id}"`);
        const result = await pool.query(
          'UPDATE descargas SET estado = $1 WHERE id_descarga = $2 RETURNING id_descarga',
          [estado, id]
        );
        
        if (result.rows.length > 0) {
          updatedIds.push(result.rows[0].id_descarga);
          console.log(`[BATCH CHANGE] ID "${id}" actualizado exitosamente`);
        } else {
          console.log(`[BATCH CHANGE] ID "${id}" no encontrado en BD`);
        }
        
      } catch (idError) {
        console.error(`[BATCH CHANGE] Error procesando ID "${id}":`, idError.message);
        errorOccurred = true;
        // Continuar con los demás IDs en lugar de fallar completamente
      }
    }
    
    if (errorOccurred && updatedIds.length === 0) {
      return res.status(500).json({ 
        message: 'Error al procesar los IDs. Verifique el formato de los datos.',
        error: 'Invalid ID format'
      });
    }
    
    console.log('[BATCH CHANGE] Actualizadas:', updatedIds.length, 'descargas');
    console.log('[BATCH CHANGE] IDs actualizados:', updatedIds);
    
    res.json({ 
      message: `${updatedIds.length} descargas actualizadas correctamente`,
      updated: updatedIds.length,
      updatedIds: updatedIds
    });
    
  } catch (err) {
    console.error('[BATCH CHANGE] Error completo:', err);
    console.error('[BATCH CHANGE] Stack trace:', err.stack);
    res.status(500).json({ 
      message: 'Error al actualizar estados en lote',
      error: err.message 
    });
  }
});

// Cambiar estado de una descarga (solo admin) - DEBE IR DESPUÉS DE /batch/estado
router.put('/:id/estado', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  console.log('[INDIVIDUAL CHANGE] Request params:', req.params);
  console.log('[INDIVIDUAL CHANGE] Request body:', req.body);
  console.log('[INDIVIDUAL CHANGE] ID:', id, 'Estado:', estado);
  
  if (!estado || !['Pendiente de Facturar', 'Facturado'].includes(estado)) {
    return res.status(400).json({ message: 'Estado inválido' });
  }
  
  try {
    // Obtener datos antes del cambio
    const beforeResult = await pool.query('SELECT * FROM descargas WHERE id_descarga = $1', [id]);
    if (beforeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Descarga no encontrada' });
    }
    
    const before = beforeResult.rows[0];

    // Actualizar estado
    await pool.query(
      'UPDATE descargas SET estado = $1 WHERE id_descarga = $2',
      [estado, id]
    );
    
    console.log('[INDIVIDUAL CHANGE] Estado actualizado exitosamente');
    
    // TEMPORAL: Comentar auditoría hasta resolver problema UUID
    /*
    // Registrar auditoría
    await registrarAuditoria(
      req.user.id_usuario,
      'CHANGE_DOWNLOAD_STATUS',
      'descargas',
      id.toString(),
      req.ip,
      { estado: before.estado },
      { estado }
    );
    */
    
    res.json({ message: 'Estado actualizado correctamente' });
  } catch (err) {
    console.error('[INDIVIDUAL CHANGE] Error:', err);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
});

// TEMPORAL: Endpoint de debugging para verificar tipos de datos
router.post('/debug/ids', verifyToken, requireAdmin, async (req, res) => {
  const { ids } = req.body;
  
  console.log('[DEBUG] Request body:', req.body);
  console.log('[DEBUG] IDs type:', typeof ids);
  console.log('[DEBUG] IDs array:', ids);
  
  if (Array.isArray(ids)) {
    ids.forEach((id, index) => {
      console.log(`[DEBUG] ID ${index}: "${id}" (type: ${typeof id}, length: ${String(id).length})`);
    });
  }
  
  try {
    // Verificar estructura de tabla descargas
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'descargas' AND column_name = 'id_descarga'
    `);
    
    console.log('[DEBUG] Campo id_descarga:', tableStructure.rows);
    
    // Verificar algunos registros existentes
    const sampleData = await pool.query('SELECT id_descarga, pg_typeof(id_descarga) as tipo FROM descargas LIMIT 3');
    console.log('[DEBUG] Datos de ejemplo:', sampleData.rows);
    
    res.json({
      receivedIds: ids,
      tableStructure: tableStructure.rows,
      sampleData: sampleData.rows
    });
  } catch (err) {
    console.error('[DEBUG] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener certificados disponibles para descarga
router.get('/certificates/available', verifyToken, async (req, res) => {
  const { controlador_id, search } = req.query;
  
  try {
    let query = 'SELECT * FROM certificados_v2 WHERE 1=1';
    let params = [];
    
    if (controlador_id) {
      query += ' AND controlador_id = $' + (params.length + 1);
      params.push(controlador_id);
    }
    
    if (search) {
      query += ' AND (nombre ILIKE $' + (params.length + 1) + ' OR controlador_id ILIKE $' + (params.length + 1) + ')';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener certificados disponibles' });
  }
});

// Obtener detalle de certificado antes de descarga
router.get('/certificates/:id/preview', verifyToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM certificados_v2 WHERE id_certificado = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Certificado no encontrado' });
    }
    
    const certificate = result.rows[0];
    
    // Agregar información adicional como tamaño estimado, etc.
    res.json({
      ...certificate,
      estimated_size: '2.5 KB', // Ejemplo
      download_time_estimate: '5 segundos' // Ejemplo
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener detalle del certificado' });
  }
});

// Obtener resumen de descargas para un usuario
router.get('/usuario/:id/summary', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_usuario;
  
  // Si no es admin, solo puede ver su propio resumen
  if (req.user.id_rol !== 1 && parseInt(id) !== userId) {
    return res.status(403).json({ message: 'Solo puede ver su propio resumen' });
  }
  
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_descargas,
        COUNT(CASE WHEN estado = 'Pendiente de Facturar' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'Facturado' THEN 1 END) as facturadas,
        u.limite_descargas,
        u.nombre
      FROM descargas d
      RIGHT JOIN users u ON d.id_usuario = u.id_usuario
      WHERE u.id_usuario = $1
      GROUP BY u.id_usuario, u.limite_descargas, u.nombre
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const summary = result.rows[0];
    const percentage = summary.limite_descargas > 0 ? 
      Math.round((summary.pendientes / summary.limite_descargas) * 100) : 0;
    
    res.json({
      ...summary,
      percentage_used: percentage,
      can_download: summary.pendientes < summary.limite_descargas
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener resumen' });
  }
});

// Crear una nueva descarga
router.post('/create', verifyToken, async (req, res) => {
  const { 
    id_certificado, 
    controlador_id, 
    certificado_nombre, 
    marca, 
    modelo, 
    numeroSerie, 
    certificado_pem 
  } = req.body;
  
  if (!id_certificado && !certificado_nombre) {
    return res.status(400).json({ message: 'ID de certificado o nombre de certificado es requerido' });
  }

  try {
    // Verificar límites del usuario
    const userResult = await pool.query(
      'SELECT limite_descargas, nombre FROM users WHERE id_usuario = $1',
      [req.user.id_usuario]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];
    const limit = user.limite_descargas || 5;

    // Contar descargas pendientes
    const pendingResult = await pool.query(
      'SELECT COUNT(*) as count FROM descargas WHERE id_usuario = $1 AND estado = $2',
      [req.user.id_usuario, 'Pendiente de Facturar']
    );

    const pendingCount = parseInt(pendingResult.rows[0].count);

    if (pendingCount >= limit) {
      return res.status(403).json({ 
        message: `Ha alcanzado el límite de ${limit} descargas pendientes. Contacte al administrador.`,
        canDownload: false,
        pendingCount,
        limit
      });
    }

    // Crear registro de descarga
    const downloadResult = await pool.query(
      `INSERT INTO descargas (
        id_usuario, id_certificado, controlador_id, estado, fecha, 
        tamaño, checksum, certificado_nombre, marca, modelo, numero_serie, certificado_pem
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11) 
      RETURNING id_descarga`,
      [
        req.user.id_usuario,
        id_certificado || null,
        controlador_id || numeroSerie || null,
        'Pendiente de Facturar',
        certificado_pem ? certificado_pem.length : 2048,
        certificado_pem ? 'sha256:' + require('crypto').createHash('sha256').update(certificado_pem).digest('hex').substring(0, 16) : 'sha256:' + Math.random().toString(36).substring(2, 15),
        certificado_nombre || `Certificado RTI ${marca || ''} ${modelo || ''} ${numeroSerie || ''}`.trim(),
        marca || null,
        modelo || null,
        numeroSerie || null,
        certificado_pem || null
      ]
    );    const downloadId = downloadResult.rows[0].id_descarga;

    // TEMPORAL: Comentar auditoría hasta resolver problema UUID
    /*
    // Registrar auditoría
    await registrarAuditoria(
      req.user.id_usuario,
      'DOWNLOAD_CERTIFICATE',
      'descargas',
      downloadId.toString(),
      req.ip,
      null,
      { 
        id_certificado, 
        controlador_id: controlador_id || numeroSerie, 
        certificado_nombre,
        marca, 
        modelo, 
        numeroSerie,
        estado: 'Pendiente de Facturar' 
      }
    );
    */

    res.status(201).json({
      message: 'Descarga registrada exitosamente',
      id_descarga: downloadId,
      estado: 'Pendiente de Facturar'
    });

  } catch (err) {
    console.error('Error creating download:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener límites de descarga del usuario
router.get('/limits', verifyToken, async (req, res) => {
  try {
    console.log('[GET /limits] Solicitud de límites para usuario:', req.user.id_usuario);
    
    const userResult = await pool.query(
      'SELECT limite_descargas FROM users WHERE id_usuario = $1',
      [req.user.id_usuario]
    );

    if (userResult.rows.length === 0) {
      console.log('[GET /limits] Usuario no encontrado:', req.user.id_usuario);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const limit = userResult.rows[0].limite_descargas || 5;

    // Contar descargas pendientes
    const pendingResult = await pool.query(
      'SELECT COUNT(*) as count FROM descargas WHERE id_usuario = $1 AND estado = $2',
      [req.user.id_usuario, 'Pendiente de Facturar']
    );

    const pending = parseInt(pendingResult.rows[0].count);
    const percentage = limit > 0 ? (pending / limit) * 100 : 0;

    const limitsData = {
      pending,
      limit,
      percentage,
      canDownload: pending < limit
    };

    console.log('[GET /limits] Enviando límites:', limitsData);
    
    // Asegurar que se envíe como JSON
    res.setHeader('Content-Type', 'application/json');
    res.json(limitsData);

  } catch (err) {
    console.error('[GET /limits] Error getting download limits:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener descargas del usuario (historial personal)
router.get('/my-downloads', verifyToken, async (req, res) => {
  const { page = 1, limit = 10, estado, fechaDesde, fechaHasta, controlador } = req.query;
  
  let query = `
    SELECT d.*, 
           COALESCE(d.certificado_nombre, 'Certificado RTI') as certificado_nombre,
           COALESCE(d.marca, '') as marca,
           COALESCE(d.modelo, '') as modelo,
           COALESCE(d.numero_serie, d.controlador_id, '') as numero_serie
    FROM descargas d
    WHERE d.id_usuario = $1
  `;
  let params = [req.user.id_usuario];

  if (estado) {
    query += ' AND d.estado = $' + (params.length + 1);
    params.push(estado);
  }
  if (controlador) {
    query += ' AND d.controlador_id ILIKE $' + (params.length + 1);
    params.push(`%${controlador}%`);
  }
  if (fechaDesde) {
    query += ' AND d.fecha >= $' + (params.length + 1);
    params.push(fechaDesde);
  }
  if (fechaHasta) {
    query += ' AND d.fecha <= $' + (params.length + 1);
    params.push(fechaHasta);
  }

  query += ' ORDER BY d.fecha DESC';
  
  // Paginación
  const offset = (page - 1) * limit;
  query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);

  try {
    const result = await pool.query(query, params);
    
    // Contar total para paginación
    let countQuery = 'SELECT COUNT(*) as total FROM descargas WHERE id_usuario = $1';
    let countParams = [req.user.id_usuario];
    
    if (estado) {
      countQuery += ' AND estado = $' + (countParams.length + 1);
      countParams.push(estado);
    }
    if (controlador) {
      countQuery += ' AND controlador_id ILIKE $' + (countParams.length + 1);
      countParams.push(`%${controlador}%`);
    }
    if (fechaDesde) {
      countQuery += ' AND fecha >= $' + (countParams.length + 1);
      countParams.push(fechaDesde);
    }
    if (fechaHasta) {
      countQuery += ' AND fecha <= $' + (countParams.length + 1);
      countParams.push(fechaHasta);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      downloads: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error getting user downloads:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Descargar certificado existente por ID
router.get('/download/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id_usuario;
    
    console.log('[GET /download/:id] Descarga solicitada - ID:', id, 'Usuario:', userId);
    
    // Verificar que el certificado pertenezca al usuario o sea admin
    const downloadQuery = req.user.id_rol === 1 ? 
      'SELECT * FROM descargas WHERE id_descarga = $1' :
      'SELECT * FROM descargas WHERE id_descarga = $1 AND id_usuario = $2';
    
    const downloadParams = req.user.id_rol === 1 ? [id] : [id, userId];
    
    const result = await pool.query(downloadQuery, downloadParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Certificado no encontrado o sin permisos' });
    }
    
    const download = result.rows[0];
    
    if (!download.certificado_pem) {
      return res.status(404).json({ message: 'Contenido del certificado no disponible' });
    }
    
    console.log('[GET /download/:id] Enviando certificado:', download.certificado_nombre);
      // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/x-pem-file');
    res.setHeader('Content-Disposition', `attachment; filename="${download.certificado_nombre}"`);
    res.send(download.certificado_pem);
    
    // TEMPORAL: Comentar auditoría hasta resolver problema UUID
    /*
    // Registrar auditoría de re-descarga
    await registrarAuditoria(
      userId,
      'RE_DOWNLOAD_CERTIFICATE',
      'descargas',
      id.toString(),
      req.ip,
      null,
      { 
        certificado_nombre: download.certificado_nombre,
        controlador_id: download.controlador_id
      }
    );
    */
    
  } catch (err) {
    console.error('[GET /download/:id] Error:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
