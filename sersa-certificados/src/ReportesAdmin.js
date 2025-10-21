import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { Download as DownloadIcon, Assessment as ReportIcon } from '@mui/icons-material';

function ReportesAdmin({ backendUrl, token }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function descargarCSV(endpoint, nombreArchivo) {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${backendUrl}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Error al descargar ${nombreArchivo}: ${err.message}`);
    }
    
    setLoading(false);
  }

  function descargarDescargasFiltradas() {
    let endpoint = '/reportes/descargas/csv';
    if (desde && hasta) {
      endpoint += `?desde=${desde}&hasta=${hasta}`;
    }
    descargarCSV(endpoint, `descargas_${desde || 'todas'}_${hasta || 'todas'}.csv`);
  }

  const reportes = [
    {
      title: 'Usuarios',
      description: 'Exportar listado completo de usuarios del sistema',
      endpoint: '/reportes/usuarios/csv',
      filename: 'usuarios.csv',
      icon: <ReportIcon />
    },
    {
      title: 'Auditoría',
      description: 'Exportar historial completo de auditoría',
      endpoint: '/reportes/auditoria/csv',
      filename: 'auditoria.csv',
      icon: <ReportIcon />
    },
    {
      title: 'Certificados',
      description: 'Exportar catálogo de certificados disponibles',
      endpoint: '/reportes/certificados/csv',
      filename: 'certificados.csv',
      icon: <ReportIcon />
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reportes y Exportaciones
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" sx={{ mb: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Reportes estándar */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Reportes Estándar
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {reportes.map((reporte, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                  {reporte.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {reporte.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {reporte.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => descargarCSV(reporte.endpoint, reporte.filename)}
                  disabled={loading}
                >
                  Descargar CSV
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Reporte de descargas con filtros */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Reporte de Descargas Filtrado
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Fecha Desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Fecha Hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={descargarDescargasFiltradas}
              disabled={loading}
              fullWidth
            >
              Descargar Descargas
            </Button>
          </Grid>
        </Grid>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Si no selecciona fechas, se descargarán todas las descargas
        </Typography>
      </Paper>
    </Box>
  );
}

export default ReportesAdmin;
