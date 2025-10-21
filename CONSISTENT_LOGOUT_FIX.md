# 🔐 Fix: Logout Consistente para Todos los Roles

## ❌ **Problema Identificado:**

### **Inconsistencia en Logout por Token Expirado:**
- **Layout.js:** Usaba `handleLogout()` (función local)
- **CertForm.js:** Usaba `window.location.href = '/'` (redirect directo)
- **Resultado:** Administradores no se redirigían correctamente al login

## ✅ **Soluciones Implementadas:**

### **1. Layout.js - Usar onLogout del Padre:**
```javascript
// ❌ ANTES:
if (response.status === 401) {
  handleLogout(); // Función local
  return;
}

// ✅ DESPUÉS:
if (response.status === 401) {
  onLogout('Sesión expirada. Por favor, inicie sesión nuevamente.');
  return;
}
```

### **2. App.js - Función Global de Logout:**
```javascript
useEffect(() => {
  // Exponer función de logout globalmente
  window.handleGlobalLogout = (message) => {
    logout(message || 'Sesión expirada. Por favor, inicie sesión nuevamente.');
  };
  
  return () => {
    delete window.handleGlobalLogout;
  };
}, [token, userId, mustChangePassword, loadUserSummary]);
```

### **3. CertForm.js - Usar Función Global:**
```javascript
// ❌ ANTES:
if (response.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/'; // Redirect directo
  return;
}

// ✅ DESPUÉS:
if (response.status === 401) {
  if (window.handleGlobalLogout) {
    window.handleGlobalLogout('Sesión expirada. Por favor, inicie sesión nuevamente.');
  } else {
    localStorage.clear();
    window.location.href = '/';
  }
  return;
}
```

### **4. Función logout() Robusta:**
```javascript
function logout(message = '') {
  // Limpiar TODOS los estados
  setToken('');
  setRefreshToken('');
  setUserId(null);
  setIdRol(null);
  setUserName('');
  setMustChangePassword(false);
  setDownloadLimits({ pending: 0, limit: 0 });
  
  // Limpiar localStorage completamente
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('idRol');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRol');
  
  // Mostrar mensaje
  if (message) setError(message);
  
  // Forzar navegación con setTimeout para asegurar limpieza
  setTimeout(() => {
    navigate('/');
  }, 100);
}
```

## 🔄 **Flujo Corregido:**

### **Para TODOS los Roles (Admin, Mayorista, Distribuidor):**

1. **Token expira** durante una petición
2. **API responde** con 401 Unauthorized
3. **Componente detecta** error 401
4. **Llama función centralizada** de logout:
   - `onLogout()` desde Layout.js
   - `window.handleGlobalLogout()` desde otros componentes
5. **App.js ejecuta logout():**
   - Limpia todos los estados
   - Limpia localStorage
   - Muestra mensaje al usuario
   - Navega a login (`/`)

## 📱 **Experiencia de Usuario Consistente:**

### **Comportamiento Unificado:**
```
Usuario (cualquier rol) → Token expira → Acción fallida
↓
Sistema detecta 401
↓
Logout automático con mensaje: "Sesión expirada. Por favor, inicie sesión nuevamente."
↓
Redirección automática a pantalla de login
↓
Usuario debe loguearse nuevamente
```

## 🧪 **Para Probar:**

### **Test 1: Token Expirado en Layout (Admin/Usuario):**
1. **Login** como admin o usuario
2. **Esperar** que expire token (15 min)
3. **La app** intenta cargar límites/notificaciones automáticamente
4. **Verificar:** Logout automático + redirect a login

### **Test 2: Token Expirado en Generación (Cualquier Rol):**
1. **Login** como cualquier rol
2. **Modificar** token en localStorage a valor inválido
3. **Intentar** generar certificado
4. **Verificar:** Logout automático + redirect a login

### **Test 3: Consistencia de Mensaje:**
1. **Token expira** en cualquier componente
2. **Verificar** mensaje: "Sesión expirada. Por favor, inicie sesión nuevamente."
3. **Verificar** redirección a `/` (login)

## 🎯 **Beneficios del Fix:**

- ✅ **Comportamiento idéntico** para todos los roles
- ✅ **Logout centralizado** desde App.js
- ✅ **Limpieza completa** de estados y localStorage
- ✅ **Redirección consistente** a pantalla de login
- ✅ **Mensajes claros** para el usuario
- ✅ **Función global** disponible para cualquier componente

## 📋 **Componentes Corregidos:**

### **✅ Layout.js:**
- `fetchDownloadLimits()` → Usa `onLogout()`
- `fetchNotificationCount()` → Usa `onLogout()`

### **✅ CertForm.js:**
- `handleGenerateCertificate()` → Usa `window.handleGlobalLogout()`

### **✅ App.js:**
- Función `logout()` robusta
- Función global `window.handleGlobalLogout()` expuesta

## 🔮 **Para Extender (Futuro):**

### **Otros Componentes:**
```javascript
// En cualquier componente que haga peticiones
if (response.status === 401) {
  if (window.handleGlobalLogout) {
    window.handleGlobalLogout();
  }
  return;
}
```

### **Hook Personalizado:**
```javascript
// useAuthenticatedFetch.js ya está creado para uso opcional
const { authenticatedFetch } = useAuthenticatedFetch(token, refreshToken, logout, setToken);
```

¡Ahora el logout por token expirado es consistente para todos los roles! 🔐✅