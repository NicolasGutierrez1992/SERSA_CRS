# 🔍 Debug: Error UUID "batch" - Análisis del Problema

## ❌ **Error Persistente:**
```
error: invalid input syntax for type uuid: "batch"
at line 275 (cambio masivo de estado)
```

## 🎯 **Problema Identificado:**

La función `registrarAuditoria` está intentando convertir algún parámetro a UUID, pero uno de los valores que se está pasando es el string "batch".

## 🔧 **Análisis de la Llamada Problemática (línea ~275):**

```javascript
await registrarAuditoria(
  req.user.id_usuario,        // ← Parámetro 1: ID de usuario (número)
  'BATCH_CHANGE_STATUS',      // ← Parámetro 2: Acción (string)
  'descargas',                // ← Parámetro 3: Tabla (string)
  row.id_descarga.toString(), // ← Parámetro 4: ID de registro (string)
  req.ip,                     // ← Parámetro 5: IP (string)
  null,                       // ← Parámetro 6: Datos anteriores (null)
  { estado, batch: true }     // ← Parámetro 7: Datos nuevos (objeto con batch: true)
);
```

## 🚨 **Posibles Causas:**

### **Causa 1: Estructura de `registrarAuditoria`**
La función puede estar esperando un UUID en una posición diferente.

### **Causa 2: Campo `batch: true` en el objeto**
El valor `true` del campo `batch` puede estar siendo interpretado incorrectamente.

### **Causa 3: Orden de Parámetros Incorrecto**
Los parámetros pueden estar en orden diferente al esperado.

## 🛠️ **Soluciones Propuestas:**

### **Solución 1: Eliminar el campo `batch`**
```javascript
// ❌ Actual (problemático):
{ estado, batch: true }

// ✅ Propuesto:
{ estado }
```

### **Solución 2: Cambiar `batch: true` por `batch: "true"`**
```javascript
// ✅ Alternativa:
{ estado, batch: "true" }
```

### **Solución 3: Usar un ID de auditoría diferente**
```javascript
// ✅ Alternativa:
{ estado, operacion: "cambio_masivo" }
```

## 📋 **Para Investigar:**

### **1. Revisar archivo `audit.js`:**
```javascript
// ¿Cómo está definida la función registrarAuditoria?
// ¿Qué parámetros espera exactamente?
// ¿Hay algún campo UUID en la tabla de auditoría?
```

### **2. Revisar tabla de auditoría en BD:**
```sql
-- Estructura de la tabla de auditoría
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'auditoria' 
ORDER BY ordinal_position;
```

### **3. Ver otras llamadas exitosas:**
```javascript
// Comparar con otras llamadas que funcionan:
// - CHANGE_DOWNLOAD_STATUS (individual)
// - RE_DOWNLOAD_CERTIFICATE
// - START_DOWNLOAD
```

## 🎯 **Fix Inmediato Sugerido:**

Cambiar la llamada problemática por:

```javascript
// En downloads.js, línea ~275:
await registrarAuditoria(
  req.user.id_usuario,
  'BATCH_CHANGE_STATUS',
  'descargas',
  row.id_descarga.toString(),
  req.ip,
  null,
  { estado }  // ← Eliminar batch: true
);
```

## 🧪 **Testing:**

1. **Aplicar** el fix sugerido
2. **Probar** cambio masivo de estado
3. **Verificar** que no hay errores UUID
4. **Confirmar** que la auditoría se registra correctamente

¿Puedes probar eliminando el `batch: true` del objeto de datos nuevos?