import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import { Refresh as RefreshIcon, Download as DownloadIcon, Visibility as ViewIcon } from '@mui/icons-material';

function DescargasAdmin({ token, backendUrl }) {
  const [descargas, setDescargas] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);  const [filters, setFilters] = useState({
    estado: '',
    cuit: '',
    fecha_desde: new Date().toISOString().split('T')[0], // Fecha de hoy
    fecha_hasta: new Date().toISOString().split('T')[0]  // Fecha de hoy
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedDownload, setSelectedDownload] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);

  useEffect(() => {
    fetchDescargas();
  }, [backendUrl, token, filters, page, rowsPerPage]);  async function fetchDescargas() {
    setLoading(true);
    setError('');
    
    try {
      // Preparar filtros, solo incluir los que tienen valor
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([key, value]) => {
          // Para CUIT, solo incluir si no está vacío
          if (key === 'cuit') return value && value.trim() !== '';
          // Para otros filtros, incluir si tienen valor
          return value !== '' && value != null;
        })
      );

      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...activeFilters
      });

      console.log('Fetching downloads with filters:', activeFilters);
      console.log('Full URL:', `${backendUrl}/downloads?${queryParams}`);
      
      const res = await fetch(`${backendUrl}/downloads?${queryParams}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Download response status:', res.status);
      console.log('Download response headers:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Download response error:', errorText);
        
        if (res.status === 401) {
          setError('Token expirado. Por favor, vuelve a iniciar sesión.');
          return;
        }
        
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Response is not JSON:', text.substring(0, 500));
        throw new Error('Respuesta del servidor no es JSON válido');
      }
      
      const data = await res.json();
      console.log('Download data received:', data);
      console.log('Number of downloads:', data.descargas?.length || 0);
      
      setDescargas(data.descargas || []);
      setTotalCount(data.pagination?.total || data.descargas?.length || 0);
      
      if (!data.descargas || data.descargas.length === 0) {
        console.log('No downloads found with current filters');
      }
      
    } catch (err) {
      console.error('Error al cargar descargas:', err);
      setError(err.message || 'Error al cargar descargas');
      setDescargas([]);
      setTotalCount(0);
    }
    
    setLoading(false);
  }
  async function fetchDownloadStatus(downloadId) {
    try {
      const res = await fetch(`${backendUrl}/downloads/${downloadId}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setDownloadStatus(data);
        setStatusDialogOpen(true);
      }
    } catch (err) {
      setError('Error al cargar estado de descarga');
    }
  }

  async function handleReDownload(descarga) {
    try {
      const response = await fetch(`${backendUrl}/downloads/download/${descarga.id_descarga}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        // Crear blob y descargar archivo
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = descarga.certificado_nombre || `certificado_${descarga.controlador_id}.pem`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('Certificado re-descargado exitosamente por admin');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al re-descargar certificado');
      }
    } catch (err) {
      console.error('Error re-downloading certificate:', err);
      setError('Error de conexión al re-descargar certificado');
    }
  }
  async function cambiarEstado(id, nuevoEstado) {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${backendUrl}/downloads/${id}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      
      if (res.ok) {
        await fetchDescargas(); // Recargar datos
        setError('');
      } else {
        const data = await res.json();
        setError(data.message || `Error ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      setError(err.message || 'Error de conexión');
    }
    
    setLoading(false);
  }

  async function cambiarEstadoMasivo(ids, nuevoEstado) {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${backendUrl}/downloads/batch/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids, estado: nuevoEstado })
      });
      
      if (res.ok) {
        await fetchDescargas();
        setSelectedIds([]);
        setBatchDialogOpen(false);
      } else {
        const data = await res.json();
        setError(data.message || 'Error en cambio masivo');
      }
    } catch (err) {
      setError('Error de conexión');
    }
    
    setLoading(false);
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(descargas.map(d => d.id_descarga));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'Pendiente de Facturar': return 'warning';
      case 'Facturado': return 'success';
      case 'Error': return 'error';
      case 'En Proceso': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Descargas
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.estado}
                label="Estado"
                onChange={(e) => handleFilterChange('estado', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="Pendiente de Facturar">Pendiente de Facturar</MenuItem>
                <MenuItem value="Facturado">Facturado</MenuItem>
                <MenuItem value="En Proceso">En Proceso</MenuItem>
                <MenuItem value="Error">Error</MenuItem>
              </Select>
            </FormControl>
          </Grid>          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="CUIT Usuario"
              placeholder="20-12345678-9"
              value={filters.cuit}
              onChange={(e) => handleFilterChange('cuit', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Desde"
              type="date"
              value={filters.fecha_desde}
              onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Hasta"
              type="date"
              value={filters.fecha_hasta}
              onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>          <Grid item xs={12}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchDescargas}
              disabled={loading}
              sx={{ mr: 2 }}
            >
              Actualizar
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setFilters({
                  estado: '',
                  cuit: '',
                  fecha_desde: '',
                  fecha_hasta: ''
                });
                setPage(0);
              }}
              disabled={loading}
              sx={{ mr: 2 }}
            >
              Mostrar Todos
            </Button>
            {selectedIds.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setBatchDialogOpen(true)}
              >
                Cambio Masivo ({selectedIds.length})
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < descargas.length}
                  checked={descargas.length > 0 && selectedIds.length === descargas.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>ID Descarga</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Certificado</TableCell>
              <TableCell>Controlador</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              descargas.map((descarga) => (
                <TableRow key={descarga.id_descarga}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(descarga.id_descarga)}
                      onChange={() => handleSelectOne(descarga.id_descarga)}
                    />
                  </TableCell>                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {descarga.id_descarga}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {descarga.usuario_nombre || `Usuario ${descarga.id_usuario}`}
                      </Typography>
                      {descarga.cuit && (
                        <Typography variant="caption" color="text.secondary">
                          CUIT: {descarga.cuit}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {descarga.certificado_nombre || `Certificado ${descarga.id_certificado || descarga.controlador_id}`}
                    </Typography>
                    {descarga.marca && descarga.modelo && (
                      <Typography variant="caption" color="text.secondary">
                        {descarga.marca} {descarga.modelo}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {descarga.controlador_id || descarga.numero_serie || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={descarga.estado}
                      color={getEstadoColor(descarga.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {descarga.fecha ? new Date(descarga.fecha).toLocaleString('es-AR') : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>                    <IconButton
                      size="small"
                      onClick={() => fetchDownloadStatus(descarga.id_descarga)}
                      title="Ver estado"
                    >
                      <ViewIcon />
                    </IconButton>
                    {descarga.certificado_pem && (
                      <IconButton
                        size="small"
                        onClick={() => handleReDownload(descarga)}
                        title="Descargar certificado"
                        color="primary"
                      >
                        <DownloadIcon />
                      </IconButton>
                    )}{descarga.estado === 'Pendiente de Facturar' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => cambiarEstado(descarga.id_descarga, 'Facturado')}
                        disabled={loading}
                        sx={{ ml: 1 }}
                      >
                        Facturar
                      </Button>
                    )}
                    {descarga.estado === 'Facturado' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => cambiarEstado(descarga.id_descarga, 'Pendiente de Facturar')}
                        disabled={loading}
                        sx={{ ml: 1 }}
                      >
                        Revertir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>      {/* Dialog para cambio masivo */}
      <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)}>
        <DialogTitle>Cambio Masivo de Estado</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Cambiar el estado de {selectedIds.length} descargas seleccionadas:
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => cambiarEstadoMasivo(selectedIds, 'Facturado')}
            variant="contained"
            color="success"
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Marcar como Facturado
          </Button>
          <Button
            onClick={() => cambiarEstadoMasivo(selectedIds, 'Pendiente de Facturar')}
            variant="contained"
            color="warning"
            disabled={loading}
          >
            Marcar como Pendiente
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para estado de descarga */}
      <Dialog 
        open={statusDialogOpen} 
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Estado de Descarga</DialogTitle>
        <DialogContent>
          {downloadStatus && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {downloadStatus.certificado_nombre}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Usuario: {downloadStatus.usuario_nombre}
              </Typography>
              <Chip
                label={downloadStatus.estado}
                color={getEstadoColor(downloadStatus.estado)}
                sx={{ mb: 2 }}
              />
              
              {downloadStatus.logs && downloadStatus.logs.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Logs de proceso:
                  </Typography>
                  <List dense>
                    {downloadStatus.logs.map((log, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={log.message}
                          secondary={new Date(log.timestamp).toLocaleString()}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DescargasAdmin;
