// Query de debugging simple para verificar la tabla descargas
router.get('/debug', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('[DEBUG] Checking descargas table...');
    
    // 1. Contar total de descargas
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM descargas');
    console.log('Total descargas:', totalResult.rows[0].total);
    
    // 2. Verificar estructura de tabla
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'descargas'
      ORDER BY ordinal_position
    `);
    console.log('Estructura tabla descargas:', structureResult.rows);
    
    // 3. Obtener algunas descargas de ejemplo
    const sampleResult = await pool.query('SELECT * FROM descargas LIMIT 5');
    console.log('Descargas de ejemplo:', sampleResult.rows);
    
    // 4. Verificar usuarios
    const usersResult = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log('Total usuarios:', usersResult.rows[0].total);
    
    // 5. Query completa como la del endpoint principal
    const fullResult = await pool.query(`
      SELECT d.*, u.nombre as usuario_nombre, u.cuit
      FROM descargas d
      LEFT JOIN users u ON d.id_usuario = u.id_usuario
      LIMIT 5
    `);
    console.log('Query con JOIN:', fullResult.rows);
    
    res.json({
      total_descargas: totalResult.rows[0].total,
      structure: structureResult.rows,
      sample_downloads: sampleResult.rows,
      total_users: usersResult.rows[0].total,
      join_result: fullResult.rows
    });
    
  } catch (err) {
    console.error('[DEBUG] Error:', err);
    res.status(500).json({ error: err.message });
  }
});