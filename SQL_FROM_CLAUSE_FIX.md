# ✅ Error SQL "missing FROM-clause" CORREGIDO

## ❌ **Error Específico:**
```
error: missing FROM-clause entry for table "c"
```

**Causa:** Referencia a `c.nombre` sin tener la tabla `c` (certificados_v2) en el FROM.

## 🔧 **Correcciones Aplicadas:**

### **1. Endpoint Principal `/downloads` (línea ~130):**
```sql
-- ❌ Antes (problemático):
COALESCE(d.certificado_nombre, c.nombre, 'Certificado') as certificado_nombre,
FROM descargas d
JOIN users u ON d.id_usuario = u.id_usuario  -- ← No hay tabla 'c'

-- ✅ Después (corregido):
COALESCE(d.certificado_nombre, 'Certificado') as certificado_nombre,
FROM descargas d
JOIN users u ON d.id_usuario = u.id_usuario
```

### **2. Endpoint `/downloads/:id/status` (línea ~95):**
```sql
-- ❌ Antes (problemático):
SELECT d.*, c.nombre as certificado_nombre, u.nombre as usuario_nombre
FROM descargas d
JOIN certificados_v2 c ON d.id_certificado = c.id_certificado  -- ← JOIN problemático
JOIN users u ON d.id_usuario = u.id_usuario

-- ✅ Después (corregido):
SELECT d.*, d.certificado_nombre, u.nombre as usuario_nombre
FROM descargas d
JOIN users u ON d.id_usuario = u.id_usuario
```

### **3. Endpoint `/downloads/usuario/:id` (línea ~235):**
```sql
-- ❌ Antes (problemático):
SELECT d.*, d.certificado_nombre 
FROM descargas d
JOIN certificados_v2 c ON d.id_certificado = c.id_certificado  -- ← JOIN innecesario

-- ✅ Después (corregido):
SELECT d.*, d.certificado_nombre 
FROM descargas d
```

## 🎯 **Resultado Esperado:**

### **Logs del Servidor:**
```
[GET /downloads] Query params: ['2025-10-21', '2025-10-21', '25', 0]
[GET /downloads] Found 3 downloads
[GET /downloads] Total count: 3
[GET /downloads] Sending response with 3 downloads
```

### **Logs del Frontend:**
```
Download response status: 200
Number of downloads: 3
Download data received: {descargas: Array(3), pagination: {...}}
```

## 🧪 **Para Probar:**
1. **Reinicia** el servidor
2. **Accede** a "Gestión de Descargas" como admin
3. **Verifica** que aparezcan las 3 descargas
4. **Confirma** que no hay más errores SQL

¡Ahora debería funcionar perfectamente y mostrar las 3 descargas! 🎯