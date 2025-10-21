# 📊 Análisis de Tablas: certificados vs certificados_v2 vs descargas

## 🎯 **Identificación de Uso por Endpoint**

### **Tabla: `certificados`**
**Endpoints que la usan:**
```javascript
// CertForm.js - Generación de certificados
POST /api/Certs
- Genera certificados desde WS de ARCA
- Probablemente NO usa ninguna tabla local (solo WS externo)

// Posibles endpoints (a verificar):
GET /api/certificados
POST /api/certificados  
```

### **Tabla: `certificados_v2`**
**Endpoints que la usan:**
```javascript
// downloads.js - Query principal problemático
GET /downloads
- JOIN certificados_v2 c ON d.id_certificado = c.id_certificado  ← PROBLEMÁTICO
- Esta tabla parece ser un catálogo de certificados disponibles

// Otros posibles usos:
GET /downloads/certificates/available
GET /downloads/certificates/:id/preview
```

### **Tabla: `descargas`**
**Endpoints que la usan:**
```javascript
// downloads.js - Gestión de descargas
GET /downloads                    // ← Principal (con JOIN problemático)
POST /downloads/create            // ← Registra nuevas descargas
GET /downloads/:id/status
PUT /downloads/:id/estado
PUT /downloads/batch/estado
GET /downloads/download/:id       // ← Re-descarga
GET /downloads/my-downloads
GET /downloads/limits
```

## 🔧 **Problema Identificado**

### **JOIN Problemático en `/downloads`:**
```sql
-- ❌ Query actual (problemático)
SELECT d.*, c.nombre as certificado_nombre, u.nombre as usuario_nombre, u.cuit
FROM descargas d
JOIN certificados_v2 c ON d.id_certificado = c.id_certificado  ← EXCLUYE registros
JOIN users u ON d.id_usuario = u.id_usuario
```

**Problema:** Los registros en `descargas` probablemente tienen:
- `id_certificado = NULL` (no existe en certificados_v2)
- O `id_certificado` que no corresponde a certificados_v2

## 🧪 **Queries de Diagnóstico**

### **1. Verificar Contenido de Cada Tabla:**
```sql
-- ¿Cuántos registros hay en cada tabla?
SELECT 'certificados' as tabla, COUNT(*) as registros FROM certificados
UNION ALL
SELECT 'certificados_v2' as tabla, COUNT(*) as registros FROM certificados_v2  
UNION ALL
SELECT 'descargas' as tabla, COUNT(*) as registros FROM descargas;
```

### **2. Verificar Estructura:**
```sql
-- Estructura de certificados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'certificados' 
ORDER BY ordinal_position;

-- Estructura de certificados_v2
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'certificados_v2' 
ORDER BY ordinal_position;

-- Estructura de descargas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'descargas' 
ORDER BY ordinal_position;
```

### **3. Verificar Relaciones:**
```sql
-- ¿Los id_certificado en descargas existen en certificados_v2?
SELECT 
  COUNT(*) as total_descargas,
  COUNT(c.id_certificado) as con_certificado_v2,
  COUNT(*) - COUNT(c.id_certificado) as sin_certificado_v2
FROM descargas d
LEFT JOIN certificados_v2 c ON d.id_certificado = c.id_certificado;

-- ¿Qué id_certificado hay en descargas?
SELECT DISTINCT d.id_certificado, COUNT(*) as cantidad
FROM descargas d
GROUP BY d.id_certificado
ORDER BY d.id_certificado;
```

## 🎯 **Hipótesis Sobre el Propósito de Cada Tabla**

### **1. `certificados` (Original):**
- **Propósito**: Catálogo original de certificados
- **Estado**: Posiblemente **DEPRECATED** → Reemplazada por `certificados_v2`
- **Acción**: Probablemente se puede **ELIMINAR**

### **2. `certificados_v2` (Versión 2):**
- **Propósito**: Catálogo actual de certificados disponibles
- **Uso**: Referencia para certificados que se pueden descargar
- **Estado**: **ACTIVA** pero posiblemente mal vinculada

### **3. `descargas` (Log de Descargas):**
- **Propósito**: Registro de cada descarga realizada por usuarios
- **Uso**: Tracking, facturación, auditoría
- **Estado**: **ACTIVA** y esencial

## ✅ **Soluciones Propuestas**

### **Solución 1: Eliminar JOIN con certificados_v2**
```sql
-- Query simplificada sin dependencia de certificados_v2
SELECT d.*, u.nombre as usuario_nombre, u.cuit
FROM descargas d
JOIN users u ON d.id_usuario = u.id_usuario
WHERE 1=1
```

### **Solución 2: LEFT JOIN (Temporal)**
```sql
-- Mantener JOIN pero como LEFT JOIN
SELECT d.*, c.nombre as certificado_nombre, u.nombre as usuario_nombre, u.cuit
FROM descargas d
LEFT JOIN certificados_v2 c ON d.id_certificado = c.id_certificado  
JOIN users u ON d.id_usuario = u.id_usuario
```

### **Solución 3: Usar certificado_nombre Directamente**
```sql
-- La tabla descargas ya tiene certificado_nombre
SELECT 
  d.*,
  COALESCE(d.certificado_nombre, c.nombre, 'Certificado sin nombre') as certificado_nombre,
  u.nombre as usuario_nombre, 
  u.cuit
FROM descargas d
LEFT JOIN certificados_v2 c ON d.id_certificado = c.id_certificado  
JOIN users u ON d.id_usuario = u.id_usuario
```

## 🔧 **Implementación Inmediata**

### **Paso 1: Query de Diagnóstico**
Ejecuta en tu BD:
```sql
-- Ver si hay relación entre descargas y certificados_v2
SELECT 
  'Total descargas' as tipo,
  COUNT(*) as cantidad
FROM descargas
UNION ALL
SELECT 
  'Descargas con certificado_v2 válido' as tipo,
  COUNT(*) as cantidad  
FROM descargas d
JOIN certificados_v2 c ON d.id_certificado = c.id_certificado
UNION ALL
SELECT 
  'Descargas SIN certificado_v2 válido' as tipo,
  COUNT(*) as cantidad
FROM descargas d
LEFT JOIN certificados_v2 c ON d.id_certificado = c.id_certificado
WHERE c.id_certificado IS NULL;
```

### **Paso 2: Fix Temporal del Endpoint**
En `downloads.js`, cambiar el query:

```javascript
// ❌ Query actual (problemático)
let query = `
  SELECT d.*, c.nombre as certificado_nombre, u.nombre as usuario_nombre, u.cuit
  FROM descargas d
  JOIN certificados_v2 c ON d.id_certificado = c.id_certificado  
  JOIN users u ON d.id_usuario = u.id_usuario
  WHERE 1=1
`;

// ✅ Query corregido (temporal)
let query = `
  SELECT 
    d.*,
    COALESCE(d.certificado_nombre, c.nombre, 'Certificado') as certificado_nombre,
    u.nombre as usuario_nombre, 
    u.cuit
  FROM descargas d
  LEFT JOIN certificados_v2 c ON d.id_certificado = c.id_certificado  
  JOIN users u ON d.id_usuario = u.id_usuario
  WHERE 1=1
`;
```

## 📋 **Plan de Limpieza Sugerido**

### **Fase 1: Diagnóstico**
1. **Ejecutar queries** de verificación
2. **Confirmar** qué tabla tiene los datos reales
3. **Identificar** dependencias

### **Fase 2: Corrección**
1. **Arreglar** endpoint `/downloads` con LEFT JOIN
2. **Verificar** que funcione el gestor de admin
3. **Confirmar** que se muestren las descargas

### **Fase 3: Limpieza (Futura)**
1. **Evaluar** si `certificados` (original) se puede eliminar
2. **Optimizar** relación entre `descargas` y `certificados_v2`
3. **Documentar** propósito de cada tabla

¿Puedes ejecutar el primer query de diagnóstico para ver cuántos registros hay en cada tabla y si hay relación entre `descargas` y `certificados_v2`?