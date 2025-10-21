import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Snackbar, Alert } from '@mui/material';
import LoginForm from './LoginForm';
import CertForm from './CertForm';
import Spinner from './Spinner';
import ProtectedRoute from './ProtectedRoute';
import DescargasAdmin from './DescargasAdmin';
import UsuariosAdmin from './UsuariosAdmin';
import ReportesAdmin from './ReportesAdmin';
import MetricsAdmin from './MetricsAdmin';
import NotificacionesAdmin from './NotificacionesAdmin';
import AuditoriaAdmin from './AuditoriaAdmin';
import ChangePasswordForm from './ChangePasswordForm';
import Layout from './Layout';
import MyDownloads from './MyDownloads';
import MayoristaView from './MayoristaView';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

// Hook personalizado para manejo de respuestas del servidor
const useApiResponse = () => {
  const handleResponse = async (response) => {
    // Si es 401 (no autorizado), verificar si es token expirado
    if (response.status === 401) {
      try {
        const errorData = await response.clone().json();
        if (errorData.message && 
            (errorData.message.includes('jwt expired') || 
             errorData.message.includes('Token verification error'))) {
          // El interceptor global ya maneja esto
          return null;
        }
      } catch (e) {
        // Si no se puede parsear la respuesta, asumir token expirado
        if (window.handleGlobalLogout) {
          window.handleGlobalLogout('jwt expired');
        }
        return null;
      }
    }
    
    return response;
  };

  return { handleResponse };
};

function App() {
  const navigate = useNavigate();  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [idRol, setIdRol] = useState(parseInt(localStorage.getItem('idRol')) || null);
  const [userId, setUserId] = useState(parseInt(localStorage.getItem('userId')) || null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [downloadLimits, setDownloadLimits] = useState({ pending: 0, limit: 0 });  // Cargar datos del usuario al iniciar
  const loadUserSummary = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/downloads/usuario/${userId}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Verificar si es 401 (no autorizado)
      if (res.status === 401) {
        try {
          const errorData = await res.json();
          if (window.checkTokenExpired && window.checkTokenExpired(errorData)) {
            return; // El manejador global ya hizo logout
          }
        } catch (e) {
          // Si no se puede parsear, es probable que sea token expirado
          if (window.handleGlobalLogout) {
            window.handleGlobalLogout('jwt expired');
          }
        }
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        setDownloadLimits({
          pending: data.pendientes,
          limit: data.limite_descargas,
          percentage: data.percentage_used,
          canDownload: data.can_download
        });
      }
    } catch (err) {
      console.error('Error loading user summary:', err);
    }
  }, [token, userId]);useEffect(() => {
    if (token && userId && !mustChangePassword) {
      loadUserSummary();
    }
    
    // Exponer función de logout globalmente para manejo de tokens expirados
    window.handleGlobalLogout = (message) => {
      // Si el mensaje contiene "jwt expired" o "Token verification error", logout automático sin mensaje
      if (message && (message.includes('jwt expired') || message.includes('Token verification error'))) {
        logout(); // Sin mensaje para logout automático
      } else {
        logout(message); // Solo pasa mensaje si no es por token expirado
      }
    };
      // Función global para verificar si una respuesta indica token expirado
    window.checkTokenExpired = (response) => {
      if (response && response.message) {
        const message = response.message.toLowerCase();
        if (message.includes('jwt expired') || 
            message.includes('token verification error') || 
            message.includes('token expirado') ||
            message.includes('token inválido') ||
            message.includes('token invalido')) {
          logout(); // Logout automático
          return true;
        }
      }
      return false;
    };
    
    // Interceptar errores globales de fetch para manejo automático de tokens expirados
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Si es 401 y hay un token, verificar si es token expirado
        if (response.status === 401 && token) {
          try {
            const responseClone = response.clone();
            const errorData = await responseClone.json();
              if (errorData.message && 
                (errorData.message.includes('jwt expired') || 
                 errorData.message.includes('Token verification error') ||
                 errorData.message.toLowerCase().includes('token expirado') ||
                 errorData.message.toLowerCase().includes('token inválido') ||
                 errorData.message.toLowerCase().includes('token invalido'))) {
              console.log('Global interceptor: Token expired detected, logging out...');
              logout(); // Logout automático sin mensaje
            }
          } catch (e) {
            // Si no se puede parsear la respuesta JSON, asumir token expirado en 401
            console.log('Global interceptor: 401 without parseable JSON, assuming token expired');
            logout();
          }
        }
        
        return response;
      } catch (error) {
        // Re-lanzar errores de red
        throw error;
      }
    };
    
    // Limpiar al desmontar
    return () => {
      delete window.handleGlobalLogout;
      delete window.checkTokenExpired;
      window.fetch = originalFetch;
    };
  }, [token, userId, mustChangePassword, loadUserSummary]);// Función para hacer peticiones con manejo automático de token expirado
  const fetchWithTokenHandling = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Si es 401 (token expirado), intentar refrescar token
      if (response.status === 401 && token) {
        console.log('Token expirado, intentando refrescar...');
        
        const refreshSuccess = await refreshAccessToken();
        
        if (refreshSuccess) {
          // Reintentar la petición original con el nuevo token
          headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
          return await fetch(url, {
            ...options,
            headers
          });
        } else {
          // Si no se pudo refrescar, logout ya se llamó en refreshAccessToken
          return response;
        }
      }

      return response;
    } catch (error) {
      console.error('Error en petición:', error);
      throw error;
    }
  }, [token]);
  async function refreshAccessToken() {
    if (!refreshToken) {
      logout(); // Sin mensaje para logout automático
      return false;
    }
    
    try {
      const res = await fetch(`${BACKEND_URL}/tokens/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken })
      });
      
      const data = await res.json();
      
      if (res.ok && data.accessToken) {
        setToken(data.accessToken);
        localStorage.setItem('token', data.accessToken);
        return true;
      } else {
        // Token de refresh también expirado o inválido - logout automático
        logout();
        return false;
      }
    } catch (err) {
      console.error('Error al refrescar token:', err);
      logout(); // Logout automático sin mensaje
      return false;
    }
  }function logout(message = '') {
    console.log('App.js - logout called with message:', message);
    
    // Limpiar todos los estados
    setToken('');
    setRefreshToken('');
    setUserId(null);
    setIdRol(null);
    setUserName('');
    setMustChangePassword(false);
    setDownloadLimits({ pending: 0, limit: 0 });
    
    // Limpiar localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('idRol');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRol');
    
    console.log('App.js - All states cleared, navigating to /');
    
    // Solo mostrar mensaje si se proporcionó explícitamente y no es error de token expirado
    if (message && !message.includes('jwt expired') && !message.includes('Token verification error')) {
      setError(message);
    }
    
    // Navegar inmediatamente a login
    navigate('/');
  }

  async function handleLogin(credentials) {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.must_change_password) {
          setMustChangePassword(true);
          setUserId(data.id_usuario);        } else {
          setToken(data.accessToken);
          setRefreshToken(data.refreshToken);
          setIdRol(data.id_rol);
          setUserId(data.id_usuario);
          setUserName(data.nombre);
          
          // Guardar en localStorage
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('userId', data.id_usuario);
          localStorage.setItem('idRol', data.id_rol);
          localStorage.setItem('userName', data.nombre);
          localStorage.setItem('userRol', data.rol || (data.id_rol === 1 ? 'Administrador' : data.id_rol === 2 ? 'Mayorista' : 'Distribuidor'));
          
          setSuccess('Inicio de sesión exitoso');
          
          // Redirigir según rol
          if (data.id_rol === 1) {
            navigate('/admin/usuarios');
          } else {
            navigate('/certificados');
          }
        }
      } else {
        setError(data.message || 'Error en el inicio de sesión');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
    }
    setLoading(false);
  }

  async function handlePasswordChange(message) {
    setMustChangePassword(false);
    setSuccess(message);
    // Después del cambio de contraseña, hacer login automático
    if (userId) {
      // Recargar para obtener el token
      window.location.reload();
    }
  }

  useEffect(() => {
    // Interceptor adicional para console.error y otros errores relacionados con tokens
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('jwt expired') || message.includes('Token verification error')) {
        console.log('Console error interceptor: Token expired detected, logging out...');
        logout();
        return;
      }
      originalConsoleError(...args);
    };

    // Event listener para errores no capturados que mencionen token expirado
    const handleUnhandledError = (event) => {
      const message = event.error?.message || event.message || '';
      if (message.includes('jwt expired') || message.includes('Token verification error')) {
        console.log('Unhandled error interceptor: Token expired detected, logging out...');
        logout();
      }
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || '';
      if (message.includes('jwt expired') || message.includes('Token verification error')) {
        console.log('Unhandled rejection interceptor: Token expired detected, logging out...');
        logout();
      }
    });

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledError);
    };
  }, []);
  if (mustChangePassword) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ChangePasswordForm
          backendUrl={BACKEND_URL}
          userId={userId}
          isFirstTime={true}
          onSuccess={handlePasswordChange}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />      <Layout 
        token={token} 
        idRol={idRol} 
        userName={userName}
        downloadLimits={downloadLimits}
        onLogout={() => logout('Sesión cerrada')}
        fetchWithTokenHandling={fetchWithTokenHandling}
        user={token && userName && idRol ? { 
          nombre: userName, 
          rol: localStorage.getItem('userRol') || (idRol === 1 ? 'Administrador' : idRol === 2 ? 'Mayorista' : 'Distribuidor'),
          id_rol: idRol 
        } : null}
      >
        <Routes>
          <Route path="/" element={
            !token ? (
              <LoginForm onLogin={handleLogin} error={error} loading={loading} />
            ) : (
              <div>Bienvenido, {userName}. Selecciona una opción del menú.</div>
            )
          } />
            <Route path="/certificados" element={
            <ProtectedRoute token={token}>
              <CertForm
                token={token}
                backendUrl={BACKEND_URL}
                onRefreshLimits={loadUserSummary}
                downloadLimits={downloadLimits}
              />
            </ProtectedRoute>
          } />
          
          {/* Ruta legacy para compatibilidad */}
          <Route path="/cert" element={
            <ProtectedRoute token={token}>
              <CertForm
                token={token}
                backendUrl={BACKEND_URL}
                onRefreshLimits={loadUserSummary}
                downloadLimits={downloadLimits}
              />
            </ProtectedRoute>
          } />
            <Route path="/change-password" element={
            <ProtectedRoute token={token}>
              <ChangePasswordForm
                backendUrl={BACKEND_URL}
                userId={userId}
                isFirstTime={false}
                onSuccess={handlePasswordChange}
              />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/usuarios" element={
            <ProtectedRoute token={token} requiredRole={1} currentRole={idRol}>
              <UsuariosAdmin token={token} backendUrl={BACKEND_URL} />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/descargas" element={
            <ProtectedRoute token={token} requiredRole={1} currentRole={idRol}>
              <DescargasAdmin token={token} backendUrl={BACKEND_URL} />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/reportes" element={
            <ProtectedRoute token={token} requiredRole={1} currentRole={idRol}>
              <ReportesAdmin token={token} backendUrl={BACKEND_URL} />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/metrics" element={
            <ProtectedRoute token={token} requiredRole={1} currentRole={idRol}>
              <MetricsAdmin token={token} backendUrl={BACKEND_URL} />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/notifications" element={
            <ProtectedRoute token={token} requiredRole={1} currentRole={idRol}>
              <NotificacionesAdmin token={token} backendUrl={BACKEND_URL} />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/auditoria" element={
            <ProtectedRoute token={token} requiredRole={1} currentRole={idRol}>
              <AuditoriaAdmin token={token} backendUrl={BACKEND_URL} />
            </ProtectedRoute>          } />
          
          <Route path="/historial" element={
            <ProtectedRoute token={token}>
              <MyDownloads token={token} backendUrl={BACKEND_URL} userId={userId} />
            </ProtectedRoute>
          } />
            <Route path="/my-downloads" element={
            <ProtectedRoute token={token}>
              <MyDownloads token={token} backendUrl={BACKEND_URL} userId={userId} />
            </ProtectedRoute>
          } />
          
          <Route path="/mayorista/panel" element={
            <ProtectedRoute token={token} requiredRole={2} currentRole={idRol}>
              <MayoristaView token={token} backendUrl={BACKEND_URL} userId={userId} />
            </ProtectedRoute>
          } />
        </Routes>

        {/* Notificaciones globales */}
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setError('')} severity="error">
            {error}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!success} 
          autoHideDuration={4000} 
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccess('')} severity="success">
            {success}
          </Alert>
        </Snackbar>

        {loading && <Spinner />}
      </Layout>
    </ThemeProvider>
  );
}

// Función global para hacer fetch con manejo automático de tokens expirados
window.fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Verificar si es 401 y manejar token expirado
    if (response.status === 401 && token) {
      try {
        const errorData = await response.clone().json();
        if (errorData.message && 
            (errorData.message.includes('jwt expired') || 
             errorData.message.includes('Token verification error'))) {
          // El interceptor global ya maneja esto, solo retornar la respuesta
          console.log('fetchWithAuth: Token expired detected');
        }
      } catch (e) {
        console.log('fetchWithAuth: 401 without parseable JSON');
      }
    }

    return response;
  } catch (error) {
    console.error('Error en fetchWithAuth:', error);
    throw error;
  }
};

export default App;
