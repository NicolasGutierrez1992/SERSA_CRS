import { useCallback } from 'react';

// Hook personalizado para manejar peticiones con token automáticamente
export const useAuthenticatedFetch = (token, refreshToken, onLogout, onTokenRefresh) => {
  
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers
      });

      // Si es 401 (token expirado), intentar refrescar
      if (response.status === 401 && token && refreshToken) {
        console.log('[useAuthenticatedFetch] Token expirado, intentando refrescar...');
        
        try {
          const refreshResponse = await fetch('/tokens/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: refreshToken })
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            
            if (refreshData.accessToken) {
              // Actualizar token en el padre
              onTokenRefresh(refreshData.accessToken);
              
              // Reintentar petición original con nuevo token
              headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
              response = await fetch(url, {
                ...options,
                headers
              });
              
              console.log('[useAuthenticatedFetch] Token refrescado exitosamente');
            } else {
              throw new Error('No se recibió nuevo token');
            }
          } else {
            throw new Error('Error al refrescar token');
          }
        } catch (refreshError) {
          console.error('[useAuthenticatedFetch] Error al refrescar token:', refreshError);
          onLogout('Sesión expirada. Por favor, inicie sesión nuevamente.');
          return response;
        }
      }

      return response;
    } catch (error) {
      console.error('[useAuthenticatedFetch] Error en petición:', error);
      throw error;
    }
  }, [token, refreshToken, onLogout, onTokenRefresh]);

  return { authenticatedFetch };
};

export default useAuthenticatedFetch;