# 🔐 Logout Automático Silencioso por Token Expirado

## ✅ **Comportamiento Corregido:**

### **Logout por Token Expirado (401):**
- ❌ **No muestra** mensaje de error
- ✅ **Logout automático** silencioso
- ✅ **Redirección inmediata** a pantalla de login
- ✅ **Limpieza completa** de estados y localStorage

### **Logout Manual (botón "Cerrar Sesión"):**
- ✅ **Muestra mensaje** "Sesión cerrada"
- ✅ **Redirección** a pantalla de login

## 🔧 **Cambios Aplicados:**

### **1. Layout.js - Token Expirado:**
```javascript
// Token expirado en fetchNotificationCount y fetchDownloadLimits
if (response.status === 401) {
  console.log('Token expired, auto logout...');
  setDownloadLimits({ pending: 0, limit: 0, percentage: 0 });
  setNotificationCount(0);
  onLogout(); // ← Sin mensaje = logout silencioso
  return;
}
```

### **2. Layout.js - Logout Manual:**
```javascript
const handleLogout = () => {
  // Limpiar estados...
  onLogout('Sesión cerrada'); // ← Con mensaje = logout manual
};
```

### **3. CertForm.js - Token Expirado:**
```javascript
if (response.status === 401) {
  console.log('Token expired, auto logout...');
  if (window.handleGlobalLogout) {
    window.handleGlobalLogout(); // ← Sin parámetro = logout silencioso
  } else {
    localStorage.clear();
    window.location.href = '/';
  }
  return;
}
```

### **4. App.js - Función Global:**
```javascript
window.handleGlobalLogout = (message) => {
  logout(message); // Solo pasa mensaje si se proporciona
};
```

### **5. App.js - Función logout:**
```javascript
function logout(message = '') {
  // Limpiar todos los estados...
  
  // Solo mostrar mensaje si se proporcionó explícitamente
  if (message) {
    setError(message);
  }
  
  // Navegar inmediatamente a login (sin setTimeout)
  navigate('/');
}
```

## 🎯 **Escenarios de Uso:**

### **Escenario 1: Token Expira Automáticamente**
```
Usuario navegando → Token expira (15 min) → Layout detecta 401
↓
Logout silencioso (sin mensaje) → Redirect inmediato a login
```

### **Escenario 2: Token Expira Durante Generación**
```
Usuario genera certificado → Token inválido → CertForm detecta 401
↓
Logout silencioso (sin mensaje) → Redirect inmediato a login
```

### **Escenario 3: Usuario Cierra Sesión Manualmente**
```
Usuario click "Cerrar Sesión" → handleLogout() → onLogout('Sesión cerrada')
↓
Mensaje "Sesión cerrada" → Redirect a login
```

## 🧪 **Para Probar:**

### **Test 1: Expiración Automática**
1. **Login** como cualquier usuario
2. **Esperar** 15 minutos o modificar token en localStorage
3. **La app** intentará cargar datos automáticamente
4. **Verificar:** Redirect inmediato a login SIN mensaje

### **Test 2: Expiración en Generación**
1. **Login** normal
2. **Modificar** token en localStorage a valor inválido
3. **Intentar** generar certificado
4. **Verificar:** Redirect inmediato a login SIN mensaje

### **Test 3: Logout Manual**
1. **Login** normal
2. **Click** en "Cerrar Sesión"
3. **Verificar:** Mensaje "Sesión cerrada" + redirect a login

## 📱 **Experiencia de Usuario:**

### **Token Expirado (Silencioso):**
```
Usuario trabajando → [Sin interrupciones] → Aparece en login
```

### **Logout Manual (Con Confirmación):**
```
Usuario click logout → "Sesión cerrada" → Aparece en login
```

## ✅ **Beneficios:**

- 🔇 **Experiencia silenciosa** cuando token expira naturalmente
- 📝 **Confirmación clara** cuando logout es intencional
- ⚡ **Redirect inmediato** sin demoras
- 🧹 **Limpieza completa** de datos sensibles
- 🎯 **Comportamiento consistente** para todos los roles

¡Ahora el logout por token expirado es completamente silencioso y automático! 🔐✨