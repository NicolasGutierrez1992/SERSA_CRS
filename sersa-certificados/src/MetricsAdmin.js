import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import {
  People as PeopleIcon,
  Download as DownloadIcon,
  Pending as PendingIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

function MetricsAdmin({ backendUrl, token }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, [backendUrl, token]);

  async function fetchMetrics() {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${backendUrl}/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error('Error al cargar métricas:', err);
      setError(err.message || 'Error al cargar métricas');
    }
    
    setLoading(false);
  }

  const metricCards = [
    {
      title: 'Usuarios Activos',
      value: metrics?.usuarios_activos || 0,
      icon: <PeopleIcon color="primary" sx={{ fontSize: 40 }} />,
      color: 'primary.main'
    },
    {
      title: 'Descargas Totales',
      value: metrics?.descargas_total || 0,
      icon: <DownloadIcon color="info" sx={{ fontSize: 40 }} />,
      color: 'info.main'
    },
    {
      title: 'Pendientes de Facturar',
      value: metrics?.descargas_pendientes || 0,
      icon: <PendingIcon color="warning" sx={{ fontSize: 40 }} />,
      color: 'warning.main'
    },
    {
      title: 'Facturadas',
      value: metrics?.descargas_facturadas || 0,
      icon: <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />,
      color: 'success.main'
    },
    {
      title: 'Con Errores',
      value: metrics?.descargas_error || 0,
      icon: <ErrorIcon color="error" sx={{ fontSize: 40 }} />,
      color: 'error.main'
    },
    {
      title: 'Certificados Disponibles',
      value: metrics?.certificados_disponibles || 0,
      icon: <AssessmentIcon color="secondary" sx={{ fontSize: 40 }} />,
      color: 'secondary.main'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box alignItems="center" sx={{ p: 3 }}>
        <Typography variant="h4">
          Métricas del Sistema
        </Typography>
        <IconButton onClick={fetchMetrics} disabled={loading}>
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
          {metricCards.map((metric, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h3" component="div" color={metric.color}>
                        {metric.value.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {metric.title}
                      </Typography>
                    </Box>
                    <Box>
                      {metric.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {metrics && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Resumen Detallado
          </Typography>
          <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Usuarios del Sistema
              </Typography>
              <Typography variant="body1">
                • Administradores: <strong>{metrics.usuarios_admin || 0}</strong>
              </Typography>
              <Typography variant="body1">
                • Usuarios Estándar: <strong>{metrics.usuarios_estandar || 0}</strong>
              </Typography>
              <Typography variant="body1">
                • Último login hoy: <strong>{metrics.logins_hoy || 0}</strong>
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Actividad de Descargas
              </Typography>
              <Typography variant="body1">
                • Descargas hoy: <strong>{metrics.descargas_hoy || 0}</strong>
              </Typography>
              <Typography variant="body1">
                • Descargas esta semana: <strong>{metrics.descargas_semana || 0}</strong>
              </Typography>
              <Typography variant="body1">
                • Promedio diario: <strong>{metrics.promedio_diario || 0}</strong>
              </Typography>
            </Grid>            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Base de Datos
              </Typography>
              <Typography variant="body1">
                • Tamaño total: <strong>{metrics.database_info?.total_size || 'N/A'}</strong>
              </Typography>
              <Typography variant="body1">
                • Tabla descargas: <strong>{metrics.database_info?.descargas_table_size || 'N/A'}</strong>
              </Typography>
              <Typography variant="body1">
                • Tabla certificados: <strong>{metrics.database_info?.certificados_table_size || 'N/A'}</strong>
              </Typography>
               <Typography variant="body1">
                • Tabla auditoria: <strong>{metrics.database_info?.auditorias_table_size || 'N/A'}</strong>
              </Typography>
            </Grid>
          </Grid>

          {metrics.usuarios_limite_alto && metrics.usuarios_limite_alto.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="warning.main" gutterBottom>
                ⚠️ Usuarios cerca del límite (>80%)
              </Typography>
              {metrics.usuarios_limite_alto.map((usuario, index) => (
                <Typography key={index} variant="body2">
                  • {usuario.nombre} ({usuario.cuit}): {usuario.pendientes}/{usuario.limite_descargas} ({usuario.porcentaje}%)
                </Typography>
              ))}
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Última actualización: {new Date().toLocaleString()}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default MetricsAdmin;
