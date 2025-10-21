// Utilidad para manejar errores de autenticación globalmente

// Hook personalizado para manejar el logout automático
export const useAuthErrorHandler = (onLogout) => {
  const handleAuthError = (response) => {
    if (response.status === 401) {
      console.log('Token expired or invalid, logging out...');
      // Limpiar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRol');
      
      // Ejecutar logout
      if (onLogout) {
        onLogout();
      }
      return true; // Indica que se manejó el error de auth
    }
    return false; // No es un error de auth
  };

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found, redirecting to login...');
      if (onLogout) onLogout();
      return null;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Manejar error de autenticación automáticamente
    if (handleAuthError(response)) {
      return null;
    }

    return response;
  };

  return { handleAuthError, fetchWithAuth };
};

// Función independiente para verificar errores de auth
export const checkAuthError = (response, onLogout) => {
  if (response.status === 401) {
    console.log('Token expired or invalid, logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user'); 
    localStorage.removeItem('userRol');
    
    if (onLogout) {
      onLogout();
    }
    return true;
  }
  return false;
};