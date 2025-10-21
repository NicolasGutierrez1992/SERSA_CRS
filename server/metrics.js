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

// Endpoint de métricas generales
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('[GET /metrics] Obteniendo métricas del sistema');

    // Ejecutar consultas básicas primero
    const [
      usuariosResult,
      descargasResult,
      pendientesResult,
      facturadasResult,
      certificadosResult,
      usuariosAdminResult,
      descargasHoyResult,
      descargasSemanaResult,
      usuariosLimiteResult
    ] = await Promise.all([
      // Usuarios activos (status = 1)
      pool.query('SELECT COUNT(*) as count FROM users WHERE status = 1'),
      
      // Total de descargas
      pool.query('SELECT COUNT(*) as count FROM descargas'),
      
      // Descargas pendientes de facturar
      pool.query("SELECT COUNT(*) as count FROM descargas WHERE estado = 'Pendiente de Facturar'"),
      
      // Descargas facturadas
      pool.query("SELECT COUNT(*) as count FROM descargas WHERE estado = 'Facturado'"),
      
      // Certificados disponibles
      pool.query('SELECT COUNT(*) as count FROM certificados_v2'),
      
      // Usuarios administradores
      pool.query('SELECT COUNT(*) as count FROM users WHERE id_rol = 1 AND status = 1'),
      
      // Descargas de hoy
      pool.query("SELECT COUNT(*) as count FROM descargas WHERE DATE(fecha) = CURRENT_DATE"),
      
      // Descargas de esta semana
      pool.query("SELECT COUNT(*) as count FROM descargas WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'"),
      
      // Usuarios cerca del límite (>80%)
      pool.query(`
        SELECT 
          u.nombre,
          u.cuit,
          u.limite_descargas,
          COUNT(d.id_descarga) as pendientes,
          ROUND((COUNT(d.id_descarga)::decimal / u.limite_descargas) * 100, 1) as porcentaje
        FROM users u
        LEFT JOIN descargas d ON u.id_usuario = d.id_usuario AND d.estado = 'Pendiente de Facturar'
        WHERE u.limite_descargas > 0 AND u.status = 1
        GROUP BY u.id_usuario, u.nombre, u.cuit, u.limite_descargas
        HAVING COUNT(d.id_descarga)::decimal / u.limite_descargas > 0.8
        ORDER BY porcentaje DESC
      `)
    ]);

    // Query separada para información de la base de datos
    let databaseInfo = { 
      total_size: 'N/A', 
      total_size_bytes: 0, 
      descargas_table_size: 'N/A', 
      certificados_table_size: 'N/A',
      auditorias_table_size: 'N/A'
    };
    
    try {
      // Tamaño total de la base de datos
      const dbSizeResult = await pool.query('SELECT pg_size_pretty(pg_database_size(current_database())) as database_size, pg_database_size(current_database()) as database_size_bytes');
      
      // Tamaño de tabla descargas
      const descargasTableResult = await pool.query("SELECT pg_size_pretty(pg_total_relation_size('descargas')) as table_size");
      
      // Tamaño de tabla certificados_v2
      const certificadosTableResult = await pool.query("SELECT pg_size_pretty(pg_total_relation_size('certificados_v2')) as table_size");
      // Tamaño de tabla notificaciones
      const aduitoriaTableResult = await pool.query("SELECT pg_size_pretty(pg_total_relation_size('auditoria')) as table_size");
      
      databaseInfo = {
        total_size: dbSizeResult.rows[0]?.database_size || 'N/A',
        total_size_bytes: parseInt(dbSizeResult.rows[0]?.database_size_bytes || 0),
        descargas_table_size: descargasTableResult.rows[0]?.table_size || 'N/A',
        certificados_table_size: certificadosTableResult.rows[0]?.table_size || 'N/A',
        auditorias_table_size: aduitoriaTableResult.rows[0]?.table_size || 'N/A'
      };
      
      console.log('[GET /metrics] Database info loaded:', databaseInfo);
    } catch (dbError) {
      console.error('[GET /metrics] Error getting database info:', dbError);
    }

    const metrics = {
      usuarios_activos: parseInt(usuariosResult.rows[0].count),
      descargas_total: parseInt(descargasResult.rows[0].count),
      descargas_pendientes: parseInt(pendientesResult.rows[0].count),
      descargas_facturadas: parseInt(facturadasResult.rows[0].count),
      descargas_error: 0, // Por ahora, no hay estados de error
      certificados_disponibles: parseInt(certificadosResult.rows[0].count),
      usuarios_admin: parseInt(usuariosAdminResult.rows[0].count),
      usuarios_estandar: parseInt(usuariosResult.rows[0].count) - parseInt(usuariosAdminResult.rows[0].count),
      logins_hoy: 0, // Por implementar si necesitas tracking de logins
      descargas_hoy: parseInt(descargasHoyResult.rows[0].count),
      descargas_semana: parseInt(descargasSemanaResult.rows[0].count),
      promedio_diario: Math.round(parseInt(descargasSemanaResult.rows[0].count) / 7),
      usuarios_limite_alto: usuariosLimiteResult.rows,
      database_info: databaseInfo
    };

    console.log('[GET /metrics] Métricas calculadas:', metrics);
    
    res.json(metrics);
  } catch (err) {
    console.error('[GET /metrics] Error:', err);
    res.status(500).json({ message: 'Error al obtener métricas' });
  }
});

module.exports = router;
