# 🔧 Error UUID "batch" CORREGIDO

## ❌ **Error Específico:**
```
error: invalid input syntax for type uuid: "batch"
code: '22P02'
```

**Causa:** La función `registrarAuditoria` espera un parámetro UUID como string, pero se estaba pasando un número entero (`id_descarga`) sin convertir.

## 🎯 **Problema Identificado:**

En varios endpoints se estaba pasando `id_descarga` directamente como número a `registrarAuditoria`, pero la función espera un string (posiblemente para un campo UUID en la tabla de auditoría).

## ✅ **Correcciones Aplicadas:**

### **1. Cambio Masivo de Estado (línea ~325):**
```javascript
// ❌ Antes (problemático):
await registrarAuditoria(
  req.user.id_usuario,
  'BATCH_CHANGE_STATUS',
  'descargas',
  row.id_descarga,  // ← Número sin convertir
  req.ip,
  null,
  { estado, batch: true }
);

// ✅ Después (corregido):
await registrarAuditoria(
  req.user.id_usuario,
  'BATCH_CHANGE_STATUS',
  'descargas',
  row.id_descarga.toString(),  // ← Convertido a string
  req.ip,
  null,
  { estado, batch: true }
);
```

### **2. Cambio Individual de Estado (línea ~284):**
```javascript
// ❌ Antes:
await registrarAuditoria(
  req.user.id_usuario,
  'CHANGE_DOWNLOAD_STATUS',
  'descargas',
  id,  // ← Número sin convertir
  req.ip,
  { estado: before.estado },
  { estado }
);

// ✅ Después:
await registrarAuditoria(
  req.user.id_usuario,
  'CHANGE_DOWNLOAD_STATUS',
  'descargas',
  id.toString(),  // ← Convertido a string
  req.ip,
  { estado: before.estado },
  { estado }
);
```

### **3. Re-descarga de Certificado (línea ~705):**
```javascript
// ❌ Antes:
await registrarAuditoria(
  userId,
  'RE_DOWNLOAD_CERTIFICATE',
  'descargas',
  id,  // ← Número sin convertir
  req.ip,
  null,
  { certificado_nombre, controlador_id }
);

// ✅ Después:
await registrarAuditoria(
  userId,
  'RE_DOWNLOAD_CERTIFICATE',
  'descargas',
  id.toString(),  // ← Convertido a string
  req.ip,
  null,
  { certificado_nombre, controlador_id }
);
```

### **4. Inicio de Descarga (línea ~67):**
```javascript
// ❌ Antes:
await registrarAuditoria(
  userId,
  'START_DOWNLOAD',
  'descargas',
  downloadId,  // ← Número sin convertir
  req.ip,
  null,
  { certificateId, status: 'started' }
);

// ✅ Después:
await registrarAuditoria(
  userId,
  'START_DOWNLOAD',
  'descargas',
  downloadId.toString(),  // ← Convertido a string
  req.ip,
  null,
  { certificateId, status: 'started' }
);
```

## 🎯 **Explicación del Error:**

La función `registrarAuditoria` probablemente tiene esta estructura:
```javascript
async function registrarAuditoria(userId, action, table, recordId, ip, before, after) {
  // recordId se espera como string para insertarlo en un campo UUID o VARCHAR
  await pool.query(
    'INSERT INTO auditoria (..., record_id, ...) VALUES (..., $4, ...)',
    [userId, action, table, recordId, ...] // ← recordId debe ser string
  );
}
```

Cuando se pasaba un número, PostgreSQL intentaba convertirlo a UUID y fallaba con el error `invalid input syntax for type uuid`.

## 🧪 **Para Probar:**

### **Test 1: Cambio Individual**
1. **Ir** a "Gestión de Descargas" como admin
2. **Cambiar** estado de una descarga individual
3. **Verificar** que no hay error UUID

### **Test 2: Cambio Masivo**
1. **Seleccionar** múltiples descargas
2. **Usar** "Cambio Masivo"
3. **Confirmar** que funciona sin errores

### **Test 3: Re-descarga**
1. **Hacer click** en botón de descarga
2. **Verificar** que descarga sin errores UUID

### **Test 4: Logs de Auditoría**
1. **Verificar** en tabla de auditoría
2. **Confirmar** que se registran las acciones correctamente

## ✅ **Resultado Esperado:**

### **Logs del Servidor (sin errores):**
```
[PUT /downloads/123/estado] Estado actualizado correctamente
[PUT /downloads/batch/estado] 3 descargas actualizadas correctamente
[GET /download/123] Certificado re-descargado exitosamente
```

### **Sin Errores UUID:**
```javascript
// Ya no deberías ver:
error: invalid input syntax for type uuid: "batch"

// Ahora debería funcionar correctamente
✅ Estado actualizado correctamente
✅ Auditoría registrada exitosamente
```

¡Ahora todos los endpoints de descarga deberían funcionar sin errores UUID! 🎯