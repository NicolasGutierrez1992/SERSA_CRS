const express = require('express');
const pool = require('./db');
const { verifyToken, requireAdmin } = require('./middleware');
const router = express.Router();

// Obtener métricas del sistema (solo admin)
router.get('/metrics', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('[GET /admin/metrics] Obteniendo métricas del sistema');

    // Métricas básicas
    const [
      totalUsersResult,
      totalDownloadsResult,
      pendingBillingResult,
      billedResult,
      topUsersResult
    ] = await Promise.all([
      // Total de usuarios
      pool.query('SELECT COUNT(*) as count FROM users'),
      
      // Total de descargas
      pool.query('SELECT COUNT(*) as count FROM descargas'),
      
      // Descargas pendientes de facturar
      pool.query("SELECT COUNT(*) as count FROM descargas WHERE estado = 'Pendiente de Facturar'"),
      
      // Descargas facturadas
      pool.query("SELECT COUNT(*) as count FROM descargas WHERE estado = 'Facturado'"),
      
      // Top usuarios por cantidad de descargas
      pool.query(`
        SELECT 
          u.nombre,
          u.cuit,
          COUNT(d.id_descarga) as total_descargas
        FROM users u
        LEFT JOIN descargas d ON u.id_usuario = d.id_usuario
        GROUP BY u.id_usuario, u.nombre, u.cuit
        ORDER BY total_descargas DESC
        LIMIT 10
      `)
    ]);

    const metrics = {
      totalUsers: parseInt(totalUsersResult.rows[0].count),
      totalDownloads: parseInt(totalDownloadsResult.rows[0].count),
      pendingBilling: parseInt(pendingBillingResult.rows[0].count),
      billed: parseInt(billedResult.rows[0].count),
      topUsers: topUsersResult.rows,
      lastUpdated: new Date().toISOString()
    };

    console.log('[GET /admin/metrics] Métricas calculadas:', metrics);
    
    res.json(metrics);
  } catch (err) {
    console.error('[GET /admin/metrics] Error:', err);
    res.status(500).json({ message: 'Error al obtener métricas del sistema' });
  }
});

// Obtener estadísticas por período
router.get('/stats/:period', verifyToken, requireAdmin, async (req, res) => {
  const { period } = req.params; // 'day', 'week', 'month', 'year'
  
  try {
    let dateFilter = '';
    switch (period) {
      case 'day':
        dateFilter = "AND d.fecha >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND d.fecha >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND d.fecha >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "AND d.fecha >= CURRENT_DATE - INTERVAL '1 year'";
        break;
      default:
        dateFilter = '';
    }

    const statsResult = await pool.query(`
      SELECT 
        DATE(d.fecha) as fecha,
        COUNT(*) as total_descargas,
        COUNT(CASE WHEN d.estado = 'Pendiente de Facturar' THEN 1 END) as pendientes,
        COUNT(CASE WHEN d.estado = 'Facturado' THEN 1 END) as facturadas
      FROM descargas d
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(d.fecha)
      ORDER BY fecha DESC
      LIMIT 30
    `);

    res.json({
      period,
      stats: statsResult.rows
    });
  } catch (err) {
    console.error('[GET /admin/stats] Error:', err);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

module.exports = router;