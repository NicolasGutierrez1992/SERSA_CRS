# 🔐 Fix: Manejo Consistente de Token Expirado

## ❌ **Problema Identificado:**

### **Comportamiento Inconsistente:**
- **Distribuidores:** Se cerraba sesión automáticamente al expirar token ✅
- **Administradores:** Solo notificación, no se cerraba sesión ❌

## 🔧 **Soluciones Implementadas:**

### **1. Función `logout` Mejorada:**
```javascript
function logout(message = '') {
  // Limpiar TODOS los estados
  setToken('');
  setRefreshToken('');
  setUserId(null);
  setIdRol(null);
  // ... otros estados
  
  // Limpiar localStorage completamente
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  // ... otros items
  
  // Forzar navegación a login INDEPENDIENTE del rol
  setTimeout(() => {
    navigate('/');
  }, 100);
}
```

### **2. Función `refreshAccessToken` Robusta:**
```javascript
async function refreshAccessToken() {
  if (!refreshToken) {
    logout('Sesión expirada');  // ← Logout inmediato si no hay refresh token
    return false;
  }
  
  try {
    // Intentar refrescar token...
    if (res.ok && data.accessToken) {
      // Éxito: actualizar token
      return true;
    } else {
      // Fallo: logout con mensaje claro
      logout('Sesión expirada. Por favor, inicie sesión nuevamente.');
      return false;
    }
  } catch (err) {
    // Error: logout con mensaje de error
    logout('Error de sesión. Por favor, inicie sesión nuevamente.');
    return false;
  }
}
```

### **3. Interceptor de Peticiones Global:**
```javascript
const fetchWithTokenHandling = useCallback(async (url, options = {}) => {
  // Agregar token automáticamente
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // Si es 401 (token expirado)
  if (response.status === 401 && token) {
    const refreshSuccess = await refreshAccessToken();
    
    if (refreshSuccess) {
      // Reintentar con nuevo token
      return await fetch(url, { ...options, headers });
    }
    // Si falla refresh, logout ya se ejecutó
  }

  return response;
}, [token, refreshAccessToken]);
```

### **4. Hook Personalizado (Opcional):**
- `useAuthenticatedFetch.js` para componentes que necesiten manejo automático

## ✅ **Comportamiento Corregido:**

### **Para TODOS los Roles (Admin, Mayorista, Distribuidor):**

1. **Token válido:** ✅ Funciona normal
2. **Token expirado + Refresh válido:** ✅ Refresca automáticamente y continúa
3. **Token expirado + Refresh inválido:** ✅ Logout automático con mensaje
4. **Sin refresh token:** ✅ Logout inmediato
5. **Error de conexión:** ✅ Logout con mensaje de error

### **Mensajes Consistentes:**
- `"Sesión expirada. Por favor, inicie sesión nuevamente."`
- `"Error de sesión. Por favor, inicie sesión nuevamente."`
- `"Sesión cerrada"` (logout manual)

## 🧪 **Para Probar:**

### **Test 1: Token Expirado Natural**
1. **Login** como admin o distribuidor
2. **Esperar** que expire el token (15 minutos)
3. **Hacer** cualquier acción (navegar, cargar datos)
4. **Verificar:** Logout automático con mensaje

### **Test 2: Token Inválido Forzado**
1. **Login** normal
2. **Modificar** token en localStorage con valor inválido
3. **Hacer** cualquier petición
4. **Verificar:** Logout automático

### **Test 3: Sin Refresh Token**
1. **Login** normal
2. **Eliminar** refreshToken de localStorage
3. **Hacer** petición
4. **Verificar:** Logout inmediato

## 🎯 **Beneficios del Fix:**

- ✅ **Comportamiento consistente** para todos los roles
- ✅ **Logout automático** cuando corresponde
- ✅ **Mensajes claros** para el usuario
- ✅ **Manejo robusto** de errores
- ✅ **Refresh automático** cuando es posible
- ✅ **Limpieza completa** de sesión

## 📋 **Implementación Opcional:**

Si quieres usar el hook en componentes específicos:

```javascript
import useAuthenticatedFetch from './useAuthenticatedFetch';

function MiComponente() {
  const { authenticatedFetch } = useAuthenticatedFetch(
    token, 
    refreshToken, 
    logout, 
    setToken
  );
  
  // Usar authenticatedFetch en lugar de fetch normal
  const response = await authenticatedFetch('/api/data');
}
```

¡Ahora el manejo de tokens expirados es consistente para todos los roles! 🔐✅