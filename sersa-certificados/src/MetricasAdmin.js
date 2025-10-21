import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  TrendingUp, 
  People, 
  Download, 
  AttachMoney,
  Assessment 
} from '@mui/icons-material';

function MetricasAdmin({ token, backendUrl }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, [backendUrl, token]);

  async function fetchMetrics() {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${backendUrl}/admin/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        setError('Error al cargar métricas');
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Error de conexión al cargar métricas');
    }
    
    setLoading(false);
  }

  const MetricCard = ({ title, value, icon, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="h2" color={color}>
              {value || 0}
            </Typography>
          </Box>
          <Box color={color === 'primary' ? 'primary.main' : `${color}.main`}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Métricas del Sistema
      </Typography>

      {/* Métricas principales */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Usuarios"
            value={metrics?.totalUsers}
            icon={<People fontSize="large" />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Descargas"
            value={metrics?.totalDownloads}
            icon={<Download fontSize="large" />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Pendientes Facturar"
            value={metrics?.pendingBilling}
            icon={<AttachMoney fontSize="large" />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Facturadas"
            value={metrics?.billed}
            icon={<TrendingUp fontSize="large" />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Descargas por usuario */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Top Usuarios por Descargas
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell>CUIT</TableCell>
                    <TableCell align="right">Descargas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics?.topUsers?.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell>{user.nombre || 'Sin nombre'}</TableCell>
                      <TableCell>{user.cuit}</TableCell>
                      <TableCell align="right">{user.total_descargas}</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No hay datos disponibles
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Resumen por Estado
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Porcentaje</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Pendiente de Facturar</TableCell>
                    <TableCell align="right">{metrics?.pendingBilling || 0}</TableCell>
                    <TableCell align="right">
                      {metrics?.totalDownloads > 0 
                        ? Math.round((metrics?.pendingBilling / metrics?.totalDownloads) * 100)
                        : 0}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Facturado</TableCell>
                    <TableCell align="right">{metrics?.billed || 0}</TableCell>
                    <TableCell align="right">
                      {metrics?.totalDownloads > 0 
                        ? Math.round((metrics?.billed / metrics?.totalDownloads) * 100)
                        : 0}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Información adicional */}
      <Box mt={3}>
        <Alert severity="info">
          Las métricas se actualizan en tiempo real. Los datos reflejan el estado actual del sistema.
        </Alert>
      </Box>
    </Box>
  );
}

export default MetricasAdmin;