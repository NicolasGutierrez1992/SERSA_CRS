# 📥 Re-descarga de Certificados - Funcionalidad Implementada

## ✅ **Concepto Implementado**

Los usuarios ahora pueden **re-descargar certificados** que generaron previamente desde el WS de ARCA, ya que el contenido PEM se almacena en la base de datos.

## 🔧 **Componentes Modificados**

### **1. CertForm.js - Almacenamiento del PEM:**
```javascript
// Registrar descarga en la base de datos con contenido PEM
const downloadResponse = await fetch(`${backendUrl}/downloads/create`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    certificado_nombre: filename,
    controlador_id: numeroSerieCompleto,
    marca: generateForm.marca,
    modelo: generateForm.modelo,
    numeroSerie: numeroSerieCompleto,
    certificado_pem: data.pem // ← Contenido completo guardado
  })
});
```

### **2. Backend - Endpoint de Re-descarga:**
```javascript
// GET /downloads/download/:id
router.get('/download/:id', verifyToken, async (req, res) => {
  // Verificar permisos (usuario propietario o admin)
  const downloadQuery = req.user.id_rol === 1 ? 
    'SELECT * FROM descargas WHERE id_descarga = $1' :
    'SELECT * FROM descargas WHERE id_descarga = $1 AND id_usuario = $2';
  
  // Verificar que existe el contenido PEM
  if (!download.certificado_pem) {
    return res.status(404).json({ message: 'Contenido del certificado no disponible' });
  }
  
  // Configurar descarga
  res.setHeader('Content-Type', 'application/x-pem-file');
  res.setHeader('Content-Disposition', `attachment; filename="${download.certificado_nombre}"`);
  res.send(download.certificado_pem);
});
```

### **3. MyDownloads.js - Botón de Re-descarga:**
```javascript
const handleReDownload = async (download) => {
  const response = await fetch(`${backendUrl}/downloads/download/${download.id_descarga}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    // Crear blob y descargar archivo
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = download.certificado_nombre;
    link.click();
  }
};
```

## 🎯 **Flujo Completo**

### **Generación Inicial:**
```
1. Usuario genera certificado desde WS ARCA
2. Recibe archivo .pem para descarga inmediata
3. Sistema guarda contenido PEM en BD:
   - Tabla: descargas
   - Campo: certificado_pem
   - Estado: 'Pendiente de Facturar'
```

### **Re-descarga Posterior:**
```
1. Usuario accede a "Mi Historial"
2. Ve lista de certificados generados
3. Click en botón "Descargar" (solo si hay PEM)
4. Sistema verifica permisos
5. Descarga directa desde BD
6. Auditoría registra 'RE_DOWNLOAD_CERTIFICATE'
```

## 📊 **Tabla de Descargas - Campos Relevantes**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id_descarga` | SERIAL | ID único de la descarga |
| `id_usuario` | INTEGER | Usuario propietario |
| `certificado_nombre` | VARCHAR | Nombre del archivo .pem |
| `certificado_pem` | TEXT | **Contenido completo del certificado** |
| `controlador_id` | VARCHAR | Número de serie del controlador |
| `fecha` | TIMESTAMP | Fecha de generación original |
| `estado` | VARCHAR | 'Pendiente de Facturar' / 'Facturado' |

## 🔐 **Seguridad y Permisos**

### **Control de Acceso:**
- ✅ **Usuarios**: Solo pueden re-descargar sus propios certificados
- ✅ **Admins**: Pueden re-descargar cualquier certificado
- ✅ **Verificación**: ID de descarga + ID de usuario

### **Validaciones:**
```javascript
// Verificar propiedad o permisos admin
const downloadQuery = req.user.id_rol === 1 ? 
  'SELECT * FROM descargas WHERE id_descarga = $1' :
  'SELECT * FROM descargas WHERE id_descarga = $1 AND id_usuario = $2';

// Verificar existencia del contenido
if (!download.certificado_pem) {
  return res.status(404).json({ message: 'Contenido del certificado no disponible' });
}
```

## 🎨 **UI/UX - Mi Historial**

### **Tabla Mejorada:**
```
┌──────────────┬─────────────────┬─────────────┬─────────┬─────────────┬──────────┬───────────┐
│ Fecha        │ Certificado     │ Controlador │ Tamaño  │ Estado      │ Checksum │ Acciones  │
├──────────────┼─────────────────┼─────────────┼─────────┼─────────────┼──────────┼───────────┤
│ 15/01 10:30  │ SESHIA001371... │ 0000001371  │ 2.5 KB  │ Pendiente   │ sha256...│[Descargar]│
│ 14/01 16:45  │ SESHIA001372... │ 0000001372  │ 2.5 KB  │ Facturado   │ sha256...│[Descargar]│
│ 13/01 09:15  │ SESHIA001373... │ 0000001373  │ -       │ Error       │ -        │No disp.   │
└──────────────┴─────────────────┴─────────────┴─────────┴─────────────┴──────────┴───────────┘
```

### **Estados del Botón:**
- ✅ **"Descargar"**: Si existe `certificado_pem`
- ⚠️ **"No disponible"**: Si no existe `certificado_pem`

## 📈 **Auditoría y Logging**

### **Eventos Registrados:**
```javascript
// Generación original
await registrarAuditoria(userId, 'DOWNLOAD_CERTIFICATE', 'descargas', downloadId, ...);

// Re-descarga
await registrarAuditoria(userId, 'RE_DOWNLOAD_CERTIFICATE', 'descargas', id, ...);
```

### **Información Capturada:**
- **Usuario**: Quién descarga
- **Certificado**: ID y nombre del archivo
- **Timestamp**: Cuándo se re-descarga
- **IP**: Desde dónde se descarga

## 🚀 **Beneficios para el Usuario**

### **Conveniencia:**
- ✅ **Recuperación**: Certificados perdidos o eliminados
- ✅ **Múltiples descargas**: Sin límite de re-descargas
- ✅ **Historial completo**: Todos los certificados en un lugar

### **Casos de Uso:**
- 🔄 **Reinstalación**: Nuevo equipo, mismo certificado
- 📧 **Envío**: Re-enviar certificado a cliente
- 🔧 **Backup**: Mantener copia de seguridad
- 📋 **Auditoría**: Verificar certificados generados

## 🧪 **Testing de la Funcionalidad**

### **Escenario 1: Re-descarga Exitosa**
1. **Generar** certificado nuevo (debe almacenar PEM)
2. **Ir a** "Mi Historial"  
3. **Verificar** botón "Descargar" visible
4. **Hacer click** y confirmar descarga
5. **Verificar** archivo descargado idéntico al original

### **Escenario 2: Certificado Sin PEM**
1. **Localizar** registro sin `certificado_pem`
2. **Verificar** texto "No disponible"
3. **Confirmar** que no hay botón de descarga

### **Escenario 3: Permisos**
1. **Usuario A** genera certificado
2. **Usuario B** no debe poder re-descargarlo
3. **Admin** sí debe poder re-descargarlo

## ⚠️ **Consideraciones Técnicas**

### **Almacenamiento:**
- **Tamaño típico PEM**: ~2.5 KB por certificado
- **Impacto BD**: Moderado, texto comprimible
- **Índice recomendado**: En `id_descarga` y `id_usuario`

### **Performance:**
- **Consulta directa**: Sin procesamiento adicional
- **Transfer rápido**: Archivos pequeños
- **Cache**: Navegador maneja cache automático

### **Mantenimiento:**
```sql
-- Limpiar certificados antiguos sin PEM (opcional)
UPDATE descargas 
SET certificado_pem = NULL 
WHERE fecha < NOW() - INTERVAL '1 year' 
AND estado = 'Facturado';
```

## ✅ **Resultado Final**

### **Funcionalidad Completa:**
- ✅ **Almacenamiento automático** de certificados PEM
- ✅ **Re-descarga ilimitada** para usuarios
- ✅ **Control de permisos** seguro
- ✅ **UI intuitiva** con botones claros
- ✅ **Auditoría completa** de acciones

### **Para el Usuario:**
- 🎯 **Acceso permanente** a certificados generados
- 🔄 **Recuperación simple** de archivos perdidos  
- 📋 **Historial completo** con opciones de descarga
- 🔒 **Seguridad garantizada** de sus propios certificados

¡Los usuarios ahora pueden re-descargar sus certificados cuando lo necesiten! 📥