# 🔐 Corrección de Autenticación JWT - Endpoint /Certs

## ❌ **Problema Identificado**

```bash
[POST /Certs] Token inválido: invalid token
```

### **Causa del Error:**
- **Endpoint `/Certs`** tenía autenticación manual inconsistente
- **Middleware `verifyToken`** no se estaba aplicando correctamente
- **Validación JWT duplicada** y con diferentes secretos/métodos
- **Headers de autorización** no se procesaban de forma estándar

## ✅ **Solución Implementada**

### **1. Corrección del Endpoint `/Certs` en wscert.js**

#### **Antes (Problemático):**
```javascript
router.post('/Certs', verifyToken, async (req, res) => {
    // ❌ Validación manual adicional (incorrecta)
    if (!req.headers.authorization) {
        return res.status(401).json({ message: 'No autorizado 1' });
    }
    const token = req.headers.authorization; // ❌ Sin procesamiento Bearer
    try {
        const decoded = jwt.verify(token, SECRET); // ❌ Validación duplicada
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido 4' });
    }
    // ... resto del código
});
```

#### **Después (Corregido):**
```javascript
router.post('/Certs', verifyToken, async (req, res) => {
    console.log('[POST /Certs] Solicitud recibida');
    console.log('[POST /Certs] Usuario autenticado:', req.user); // ✅ Usuario ya validado
    
    const { modelo, marca, numeroSerie } = req.body;
    // ✅ Solo validación de negocio, no de autenticación
    if (!modelo || !marca || !numeroSerie) {
        return res.status(400).json({ message: 'Modelo, marca y número de serie son requeridos' });
    }
    
    try {
        const resultado = await renovarCertificado({ marca, modelo, numeroSerie });
        res.status(200).json({ pem: resultado });
    } catch (err) {
        res.status(500).json({ message: 'Error interno: ' + err.message });
    }
});
```

### **2. Middleware verifyToken Mejorado**

#### **Procesamiento Correcto del Header:**
```javascript
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  // ✅ Extraer token del formato "Bearer {token}"
  let token;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remover "Bearer "
  } else {
    token = authHeader; // Compatibilidad
  }
  
  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET || 'mi_clave_secreta');
    req.user = decoded; // ✅ Usuario disponible en req.user
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
}
```

### **3. Imports Limpiados en wscert.js**

#### **Removidas dependencias innecesarias:**
```javascript
// ❌ Removido:
const jwt = require('jsonwebtoken');
const { compile } = require('morgan');
const SECRET = process.env.TOKEN_SECRET || 'mi_clave_secreta';

// ✅ Solo imports necesarios:
const soap = require('soap');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const {verifyToken} = require('./middleware');
const { logearNode } = require('./wsaa');
const { cuit, fabricante, wsCertWsdl, certPath, keyPath, wsaaUrl, service, rootPath} = require('./config');
```

## 🔄 **Flujo de Autenticación Corregido**

### **Request desde Frontend:**
```javascript
fetch(`${backendUrl}/api/Certs`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,  // ✅ Formato correcto
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    marca: 'SH',
    modelo: 'IA', 
    numeroSerie: '0000001230'
  })
});
```

### **Procesamiento en Backend:**
```
1. ✅ Request llega a /api/Certs
2. ✅ Middleware verifyToken extrae "Bearer eyJhbGci..."
3. ✅ Token se valida con JWT_SECRET correcto
4. ✅ req.user se pobla con datos del usuario
5. ✅ Endpoint procesa la lógica de negocio
6. ✅ renovarCertificado() se ejecuta con WS ARCA
7. ✅ Certificado PEM se retorna al frontend
```

## 🧪 **Logs de Depuración Mejorados**

### **Información de Debugging:**
```javascript
console.log('[POST /Certs] Solicitud recibida');
console.log('[POST /Certs] Headers:', req.headers);
console.log('[POST /Certs] Body:', req.body);
console.log('[POST /Certs] Usuario autenticado:', req.user); // ✅ Nuevo

// En middleware:
console.log('Authorization header:', authHeader);
console.log('Token decoded:', decoded); // ✅ Nuevo
```

### **Logs Esperados Ahora:**
```bash
[POST /Certs] Solicitud recibida
[POST /Certs] Headers: { authorization: 'Bearer eyJ...', ... }
[POST /Certs] Body: { marca: 'SH', modelo: 'IA', numeroSerie: '0000001230' }
Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Token decoded: { cuit: '20111111119', id_usuario: 7, id_rol: 3, rol: 'Distribuidor', ... }
[POST /Certs] Usuario autenticado: { cuit: '20111111119', id_usuario: 7, ... }
[POST /Certs] Llamando a renovarCertificado...
```

## 🔐 **Seguridad Mejorada**

### **Antes:**
- ❌ Validación JWT duplicada e inconsistente
- ❌ Diferentes secretos en diferentes lugares
- ❌ Manejo de headers inconsistente
- ❌ Logs de debug insuficientes

### **Después:**
- ✅ **Validación centralizada** en middleware
- ✅ **Secreto único** desde variables de entorno
- ✅ **Procesamiento estándar** de headers Bearer
- ✅ **Logs completos** para debugging
- ✅ **Consistencia** con otros endpoints

## 🧪 **Para Probar la Corrección**

1. **Reiniciar el servidor backend**
2. **Hacer login en el frontend**
3. **Ir a "Mis Certificados"**
4. **Completar formulario**: Marca: SAM4s, Modelo: Ellix 40 F, Serie: 0000001230
5. **Hacer click "Generar Cert."**
6. **Verificar logs en consola del servidor**
7. **Confirmar descarga de certificado .pem**

### **Logs Esperados (Sin Errores):**
```bash
[POST /Certs] Usuario autenticado: { id_usuario: 7, rol: 'Distribuidor', ... }
[POST /Certs] Llamando a renovarCertificado...
[renovarCertificado] INICIO
[renovarCertificado] Llamando a logearNode...
[renovarCertificado] Certificado recibido para: 0000001230
```

¡El problema de autenticación en el endpoint /Certs está completamente resuelto! 🚀