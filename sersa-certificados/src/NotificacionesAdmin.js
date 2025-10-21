import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  Badge,
  IconButton,
  Divider,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Warning as WarningIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  ErrorOutline as ErrorIcon
} from '@mui/icons-material';

function NotificacionesAdmin({ backendUrl, token }) {
  const [usuariosPendientes, setUsuariosPendientes] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotificaciones();
  }, [backendUrl, token]);

  async function fetchNotificaciones() {
    setLoading(true);
    setError('');
    
    try {
      // Obtener usuarios con límites altos
      const usersRes = await fetch(`${backendUrl}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!usersRes.ok) {
        throw new Error('Error al cargar usuarios');
      }
      
      const usuarios = await usersRes.json();
      
      // Calcular usuarios con límites altos
      const pendientesPromises = usuarios.map(async (usuario) => {
        try {
          const summaryRes = await fetch(`${backendUrl}/downloads/usuario/${usuario.id_usuario}/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (summaryRes.ok) {
            const summary = await summaryRes.json();
            const porcentaje = summary.percentage_used || 0;
            
            if (porcentaje >= 80) {
              return {
                ...usuario,
                pendientes: summary.pendientes || 0,
                porcentaje: Math.round(porcentaje),
                limite_descargas: summary.limite_descargas || 0
              };
            }
          }
        } catch (err) {
          console.error(`Error al cargar resumen para usuario ${usuario.id_usuario}:`, err);
        }
        return null;
      });
      
      const resultados = await Promise.all(pendientesPromises);
      const usuariosConLimitesAltos = resultados.filter(Boolean);
      setUsuariosPendientes(usuariosConLimitesAltos);

      // Obtener notificaciones del sistema (si el endpoint existe)
      try {
        const notifRes = await fetch(`${backendUrl}/notificaciones`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotificaciones(notifData);
        }
      } catch (err) {
        // Las notificaciones son opcionales
        console.log('Endpoint de notificaciones no disponible');
      }
      
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
      setError(err.message || 'Error al cargar notificaciones');
    }
    
    setLoading(false);
  }

  const getSeverityColor = (porcentaje) => {
    if (porcentaje >= 100) return 'error';
    if (porcentaje >= 90) return 'warning';
    return 'info';
  };

  const totalAlertas = usuariosPendientes.length;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">
          Centro de Notificaciones
        </Typography>
        <IconButton onClick={fetchNotificaciones} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Resumen de alertas */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {totalAlertas}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Usuarios con límites altos
                    </Typography>
                  </Box>
                  <Badge badgeContent={totalAlertas} color="warning">
                    <WarningIcon color="warning" sx={{ fontSize: 40 }} />
                  </Badge>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Notificaciones por email enviadas */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {notificaciones.filter(n => n.tipo === 'email').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Emails enviados hoy
                    </Typography>
                  </Box>
                  <EmailIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Errores de sistema */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" color="error.main">
                      {notificaciones.filter(n => n.tipo === 'error').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Errores reportados
                    </Typography>
                  </Box>
                  <ErrorIcon color="error" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Lista de usuarios con límites altos */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <WarningIcon color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Usuarios cerca del límite de descargas
              </Typography>
              
              {usuariosPendientes.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No hay usuarios con límites altos en este momento.
                </Typography>
              ) : (
                <List>
                  {usuariosPendientes.map((usuario, index) => (
                    <React.Fragment key={usuario.id_usuario}>
                      <ListItem>
                        <ListItemIcon>
                          <PersonIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1">
                                {usuario.nombre}
                              </Typography>
                              <Chip
                                label={`${usuario.porcentaje}%`}
                                color={getSeverityColor(usuario.porcentaje)}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                CUIT: {usuario.cuit}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Pendientes: {usuario.pendientes} de {usuario.limite_descargas} permitidas
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < usuariosPendientes.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Historial de notificaciones */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Historial de Notificaciones
              </Typography>
              
              {notificaciones.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No hay notificaciones registradas.
                </Typography>
              ) : (
                <List dense>
                  {notificaciones.slice(0, 10).map((notif, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={notif.mensaje || notif.message}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {notif.tipo?.toUpperCase()} - {new Date(notif.created_at || notif.fecha).toLocaleString()}
                            </Typography>
                            {notif.usuario_nombre && (
                              <Typography variant="caption" color="text.secondary">
                                Usuario: {notif.usuario_nombre}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Las notificaciones se actualizan automáticamente. Los usuarios reciben emails cuando alcanzan el 80% y 100% de su límite.
      </Typography>
    </Box>
  );
}

export default NotificacionesAdmin;
