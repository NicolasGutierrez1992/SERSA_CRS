#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🔄 Ejecutando migración de base de datos...');
  
  try {
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'schema_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Ejecutar la migración
    await pool.query(migrationSQL);
    
    console.log('✅ Migración ejecutada exitosamente');
    
    // Verificar que las tablas se crearon correctamente
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('users', 'descargas', 'certificados_v2', 'auditoria', 'notificaciones', 'roles')
    `);
    
    console.log('📋 Tablas encontradas:', tables.rows.map(r => r.tablename));
    
    // Verificar que el usuario admin existe
    const adminCheck = await pool.query("SELECT * FROM users WHERE cuit = 'admin'");
    if (adminCheck.rows.length > 0) {
      console.log('👤 Usuario administrador encontrado');
    } else {
      console.log('⚠️  No se encontró usuario administrador');
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Función para verificar el estado de la base de datos
async function checkStatus() {
  console.log('🔍 Verificando estado de la base de datos...');
  
  try {
    // Verificar conexión
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Verificar estructura de tabla users
    const userColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Estructura de tabla users:');
    userColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Contar usuarios
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total usuarios: ${userCount.rows[0].count}`);
    
    // Contar descargas
    const downloadCount = await pool.query('SELECT COUNT(*) as count FROM descargas');
    console.log(`📁 Total descargas: ${downloadCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
  } finally {
    await pool.end();
  }
}

// Obtener argumentos de línea de comandos
const command = process.argv[2];

switch (command) {
  case 'migrate':
    runMigration();
    break;
  case 'status':
    checkStatus();
    break;
  default:
    console.log(`
📋 Uso: node migrate.js [comando]

Comandos disponibles:
  migrate  - Ejecutar migración de base de datos
  status   - Verificar estado de la base de datos

Ejemplos:
  node migrate.js migrate
  node migrate.js status
    `);
}
