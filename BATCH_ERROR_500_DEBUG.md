# 🚨 Error 500 en Cambio Masivo - Debugging Steps

## ❌ **Error Detectado:**
```
PUT /downloads/batch/estado
Status Code: 500 Internal Server Error
```

## 🔍 **Pasos de Debugging:**

### **1. Verificar Logs del Servidor:**
Después de reiniciar el servidor, cuando hagas el cambio masivo, revisa los logs para ver:

```javascript
// Deberías ver:
[BATCH CHANGE] Request body: { ids: [...], estado: "..." }
[BATCH CHANGE] IDs type: object IDs value: [...]
[BATCH CHANGE] Estado: ...
[BATCH CHANGE] Iniciando cambio masivo: { ids: [...], estado: "..." }
[BATCH CHANGE] IDs existentes: [...]
[BATCH CHANGE] Actualizadas: X descargas
[BATCH CHANGE] IDs actualizados: [...]

// Si hay error, deberías ver:
[BATCH CHANGE] Error completo: [DETALLE DEL ERROR]
[BATCH CHANGE] Stack trace: [STACK TRACE COMPLETO]
```

### **2. Verificar Datos Enviados desde Frontend:**
En el DevTools Network, revisa la request que se está enviando:

```json
// Request Body debería ser:
{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "estado": "Facturado" // o "Pendiente de Facturar"
}
```

### **3. Posibles Causas del Error 500:**

#### **Causa A: Problema con UUIDs**
Si los `ids` no son del formato correcto para PostgreSQL:
```sql
-- Verificar formato de id_descarga en BD:
SELECT id_descarga, pg_typeof(id_descarga) FROM descargas LIMIT 1;
```

#### **Causa B: Campo updated_at No Existe**
```sql
-- Verificar si existe la columna updated_at:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'descargas' AND column_name = 'updated_at';
```

#### **Causa C: Problema con ANY($1)**
PostgreSQL puede tener problemas con el array de IDs.

## 🔧 **Soluciones a Probar:**

### **Solución 1: Simplificar la Query**
```javascript
// En lugar de:
const result = await pool.query(
  'UPDATE descargas SET estado = $1, updated_at = NOW() WHERE id_descarga = ANY($2) RETURNING id_descarga',
  [estado, ids]
);

// Probar:
const result = await pool.query(
  'UPDATE descargas SET estado = $1 WHERE id_descarga = ANY($2) RETURNING id_descarga',
  [estado, ids]
);
```

### **Solución 2: Query Individual en Loop**
```javascript
// Si ANY($1) no funciona, usar loop:
const updatedIds = [];
for (const id of ids) {
  const result = await pool.query(
    'UPDATE descargas SET estado = $1 WHERE id_descarga = $2 RETURNING id_descarga',
    [estado, id]
  );
  if (result.rows.length > 0) {
    updatedIds.push(result.rows[0].id_descarga);
  }
}
```

### **Solución 3: Verificar Tipos de Datos**
```javascript
// Antes de la query, validar tipos:
console.log('[BATCH CHANGE] Validando tipos...');
console.log('[BATCH CHANGE] ids array:', ids);
console.log('[BATCH CHANGE] ids length:', ids.length);
console.log('[BATCH CHANGE] first id type:', typeof ids[0]);
console.log('[BATCH CHANGE] estado type:', typeof estado);
```

## 🧪 **Testing Step by Step:**

### **Paso 1: Verificar Logs**
1. **Reinicia** el servidor
2. **Intenta** cambio masivo
3. **Revisa** console del servidor
4. **Copia** el error completo

### **Paso 2: Verificar Request**
1. **Abre** DevTools (F12)
2. **Ve** a Network tab
3. **Intenta** cambio masivo
4. **Click** en la request `/batch/estado`
5. **Revisa** Request payload

### **Paso 3: Test Directo en BD**
```sql
-- Probar la query directamente:
UPDATE descargas 
SET estado = 'Facturado' 
WHERE id_descarga = ANY(ARRAY['id1', 'id2']::uuid[]) 
RETURNING id_descarga;
```

## 📋 **Info Necesaria para Debug:**

Por favor comparte:

1. **📝 Logs completos** del servidor cuando intentas cambio masivo
2. **📄 Request payload** desde DevTools Network
3. **🗃️ Estructura** de la tabla descargas:
   ```sql
   \d descargas
   ```
4. **🔢 Tipo de dato** de id_descarga:
   ```sql
   SELECT pg_typeof(id_descarga) FROM descargas LIMIT 1;
   ```

Con esta información podremos identificar y solucionar el error específico. 🔍