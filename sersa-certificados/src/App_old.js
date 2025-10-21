import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Snackbar, Alert } from '@mui/material';
import LoginForm from './LoginForm';
import CertForm from './CertForm';
import Footer from './Footer';
import Spinner from './Spinner';
import ProtectedRoute from './ProtectedRoute';
import DescargasAdmin from './DescargasAdmin';
import UsuariosAdmin from './UsuariosAdmin';
import ReportesAdmin from './ReportesAdmin';
import MetricsAdmin from './MetricsAdmin';
import NotificacionesAdmin from './NotificacionesAdmin';
import ChangePasswordForm from './ChangePasswordForm';
import Layout from './Layout';
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

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || '');
  const [certData, setCertData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [idRol, setIdRol] = useState(parseInt(localStorage.getItem('idRol')) || null);
  const [userId, setUserId] = useState(parseInt(localStorage.getItem('userId')) || null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [downloadLimits, setDownloadLimits] = useState({ pending: 0, limit: 0 });

  // Cargar datos del usuario al iniciar
  useEffect(() => {
    if (token && userId && !mustChangePassword) {
      loadUserSummary();
    }
  }, [token, userId, mustChangePassword]);

  async function loadUserSummary() {
    try {
      const res = await fetch(`${BACKEND_URL}/downloads/usuario/${userId}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
  }

  async function refreshAccessToken() {
    if (!refreshToken) return false;
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
        logout('Sesión expirada');
        return false;
      }
    } catch (err) {
      logout('Error al refrescar sesión');
      return false;
    }
  }

  function logout(message = '') {
    setToken('');
    setRefreshToken('');
    setUserId(null);
    setIdRol(null);
    setUserName('');
    setMustChangePassword(false);
    setDownloadLimits({ pending: 0, limit: 0 });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('idRol');
    localStorage.removeItem('userName');
    if (message) setError(message);
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
          setUserId(data.id_usuario);
        } else {
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
          
          setSuccess('Inicio de sesión exitoso');
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

  // Si debe cambiar contraseña, mostrar formulario de cambio
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
      <CssBaseline />
      <Layout 
        token={token} 
        idRol={idRol} 
        userName={userName}
        downloadLimits={downloadLimits}
        onLogout={() => logout('Sesión cerrada')}
      >
        <Routes>
          <Route path="/" element={
            !token ? (
              <LoginForm onLogin={handleLogin} error={error} loading={loading} />
            ) : (
              <div>Bienvenido, {userName}. Selecciona una opción del menú.</div>
            )
          } />
          
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
                token={token}
                backendUrl={BACKEND_URL}
                userId={userId}
                onSuccess={(message) => setSuccess(message)}
              />
            </ProtectedRoute>
          } />
          
          {/* Rutas de administrador */}
          <Route path="/admin/descargas" element={
            <ProtectedRoute token={token} requiredRole={1} currentRole={idRol}>
              <DescargasAdmin token={token} backendUrl={BACKEND_URL} />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/usuarios" element={
            <ProtectedRoute token={token} requiredRole={1} currentRole={idRol}>
              <UsuariosAdmin token={token} backendUrl={BACKEND_URL} />
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
          
          <Route path="/admin/audit" element={
            <ProtectedRoute token={token} requiredRole={1} currentRole={idRol}>
              <AuditAdmin token={token} backendUrl={BACKEND_URL} />
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

// Componente de administración de auditoría
function AuditAdmin({ token, backendUrl }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    accion: '',
    actor_id: '',
    desde: '',
    hasta: ''
  });

  // Implementación del componente de auditoría
  return (
    <div>
      <h2>Auditoría del Sistema</h2>
      {/* Implementar interfaz de auditoría */}
    </div>
  );
}

export default App;
          !token ? (
            <LoginForm onLogin={handleLogin} error={error} />
          ) : (
            <div>Bienvenido. Selecciona una opción del menú.</div>
          )
        } />
        <Route path="/cert" element={
          <ProtectedRoute token={token}>
            <CertForm
              onCert={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError('');
                const marca = e.target.marca.value;
                const modelo = e.target.modelo.value;
                const numeroSerie = e.target.numeroSerie.value;
                if (!numeroSerie) {
                  setError('Ingrese el número de serie');
                  setLoading(false);
                  return;
                }
                try {
                  const res = await fetch(`${BACKEND_URL}/api/certs`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json', 
                      'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ marca, modelo, numeroSerie })
                  });
                  if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
                  }
                  const data = await res.json();
                  if (data.pem) {
                    // Registrar la descarga
                    try {
                      await fetch(`${BACKEND_URL}/downloads`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}` 
                        },
                        body: JSON.stringify({
                          id_usuario: userId,
                          serie: numeroSerie,
                          cert: data.pem
                        })
                      });
                    } catch (err) {
                      console.warn('Error registrando descarga:', err);
                    }
                    
                    // Descargar automáticamente
                    const fabricante = 'SE';
                    const fecha = new Date();
                    const dd = String(fecha.getDate()).padStart(2, '0');
                    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
                    const aaaa = fecha.getFullYear();
                    const nombreArchivo = `${fabricante}${marca}${modelo}${numeroSerie}-${dd}-${mm}-${aaaa}.pem`;
                    const blob = new Blob([data.pem], { type: 'application/x-pem-file' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = nombreArchivo;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setError('');
                  } else {
                    setError(data.message || 'Error desconocido');
                  }
                } catch (err) {
                  console.error('Error al generar certificado:', err);
                  setError(err.message || 'Error de conexión');
                }
                setLoading(false);
              }}
              error={error}
              certData={certData}
              loading={loading}
            />
          </ProtectedRoute>
        } />
        <Route path="/admin/descargas" element={
          <ProtectedRoute token={token}>
            {idRol === 1 ? (
              <DescargasAdmin token={token} backendUrl={BACKEND_URL} />
            ) : (
              <div style={{ color: 'red', marginTop: '2em' }}>Acceso solo para administradores</div>
            )}
          </ProtectedRoute>
        } />
        <Route path="/admin/usuarios" element={
          <ProtectedRoute token={token}>
            {idRol === 1 ? (
              <UsuariosAdmin token={token} backendUrl={BACKEND_URL} />
            ) : (
              <div style={{ color: 'red', marginTop: '2em' }}>Acceso solo para administradores</div>
            )}
          </ProtectedRoute>
        } />
        <Route path="/admin/reportes" element={
          <ProtectedRoute token={token}>
            {idRol === 1 ? (
              <ReportesAdmin token={token} backendUrl={BACKEND_URL} />
            ) : (
              <div style={{ color: 'red', marginTop: '2em' }}>Acceso solo para administradores</div>
            )}
          </ProtectedRoute>
        } />
        <Route path="/admin/metricas" element={
          <ProtectedRoute token={token}>
            {idRol === 1 ? (
              <MetricsAdmin token={token} backendUrl={BACKEND_URL} />
            ) : (
              <div style={{ color: 'red', marginTop: '2em' }}>Acceso solo para administradores</div>
            )}
          </ProtectedRoute>
        } />
        <Route path="/admin/notificaciones" element={
          <ProtectedRoute token={token}>
            {idRol === 1 ? (
              <NotificacionesAdmin token={token} backendUrl={BACKEND_URL} />
            ) : (
              <div style={{ color: 'red', marginTop: '2em' }}>Acceso solo para administradores</div>
            )}
          </ProtectedRoute>
        } />
        <Route path="/change-password" element={
          <ProtectedRoute token={token}>
            <ChangePasswordForm 
              token={token} 
              backendUrl={BACKEND_URL} 
              userId={userId}
              onSuccess={(message) => setError(message)}
            />
          </ProtectedRoute>
        } />
      </Routes>
    </Layout>
  );
}

export default App;

