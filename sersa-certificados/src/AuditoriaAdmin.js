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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

function AuditoriaAdmin({ token, backendUrl }) {
  const [auditoria, setAuditoria] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    accion: '',
    actor_id: '',
    objetivo_tipo: '',
    desde: '',
    hasta: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAudit, setSelectedAudit] = useState(null);

  useEffect(() => {
    fetchAuditoria();
  }, [backendUrl, token, filters, page, rowsPerPage]);

  async function fetchAuditoria() {
    setLoading(true);
    setError('');
    
    try {
      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const res = await fetch(`${backendUrl}/audit?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setAuditoria(data.auditorias || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      console.error('Error al cargar auditoría:', err);
      setError(err.message || 'Error al cargar auditoría');
    }
    
    setLoading(false);
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const getAccionColor = (accion) => {
    switch (accion) {
      case 'LOGIN': return 'info';
      case 'LOGOUT': return 'default';
      case 'CREATE_USER': return 'success';
      case 'UPDATE_USER': return 'warning';
      case 'DELETE_USER': return 'error';
      case 'DOWNLOAD_START': return 'primary';
      case 'DOWNLOAD_COMPLETE': return 'success';
      case 'CHANGE_PASSWORD': return 'info';
      case 'RESET_PASSWORD': return 'warning';
      default: return 'default';
    }
  };

  const formatJsonValue = (obj) => {
    if (!obj) return 'N/A';
    if (typeof obj === 'string') return obj;
    return JSON.stringify(obj, null, 2);
  };

  const accionesDisponibles = [
    'LOGIN', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
    'DOWNLOAD_START', 'DOWNLOAD_COMPLETE', 'CHANGE_PASSWORD', 'RESET_PASSWORD'
  ];

  const tiposObjetivo = [
    'users', 'downloads', 'certificates', 'auth'
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">
          Auditoría del Sistema
        </Typography>
        <IconButton onClick={fetchAuditoria} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Filtros de Búsqueda
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Acción</InputLabel>
              <Select
                value={filters.accion}
                label="Acción"
                onChange={(e) => handleFilterChange('accion', e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {accionesDisponibles.map(accion => (
                  <MenuItem key={accion} value={accion}>{accion}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="ID Usuario"
              value={filters.actor_id}
              onChange={(e) => handleFilterChange('actor_id', e.target.value)}
              type="number"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo Objeto</InputLabel>
              <Select
                value={filters.objetivo_tipo}
                label="Tipo Objeto"
                onChange={(e) => handleFilterChange('objetivo_tipo', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {tiposObjetivo.map(tipo => (
                  <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Desde"
              type="datetime-local"
              value={filters.desde}
              onChange={(e) => handleFilterChange('desde', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Hasta"
              type="datetime-local"
              value={filters.hasta}
              onChange={(e) => handleFilterChange('hasta', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de auditoría */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha/Hora</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Acción</TableCell>
              <TableCell>Objeto</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>Detalles</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : auditoria.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No se encontraron registros de auditoría
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              auditoria.map((audit) => (
                <TableRow key={audit.id_auditoria}>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(audit.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {audit.actor_nombre || `ID: ${audit.actor_id}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={audit.accion}
                      color={getAccionColor(audit.accion)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {audit.objetivo_tipo}
                      {audit.objetivo_id && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          ID: {audit.objetivo_id}
                        </Typography>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {audit.ip || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => setSelectedAudit(audit)}
                      title="Ver detalles"
                    >
                      <ViewIcon />
                    </IconButton>
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
      </TableContainer>

      {/* Detalles del registro seleccionado */}
      {selectedAudit && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Detalles del Registro de Auditoría
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Información General
                  </Typography>
                  <Typography variant="body2">
                    <strong>ID:</strong> {selectedAudit.id_auditoria}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fecha:</strong> {new Date(selectedAudit.timestamp).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Usuario:</strong> {selectedAudit.actor_nombre || `ID: ${selectedAudit.actor_id}`}
                  </Typography>
                  <Typography variant="body2">
                    <strong>IP:</strong> {selectedAudit.ip || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Acción:</strong> <Chip label={selectedAudit.accion} color={getAccionColor(selectedAudit.accion)} size="small" />
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Objeto Afectado
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tipo:</strong> {selectedAudit.objetivo_tipo}
                  </Typography>
                  <Typography variant="body2">
                    <strong>ID:</strong> {selectedAudit.objetivo_id || 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {(selectedAudit.antes || selectedAudit.despues) && (
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      Cambios en los Datos
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {selectedAudit.antes && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="error" gutterBottom>
                            Antes:
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                            <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                              {formatJsonValue(selectedAudit.antes)}
                            </pre>
                          </Paper>
                        </Grid>
                      )}
                      
                      {selectedAudit.despues && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="success.main" gutterBottom>
                            Después:
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                            <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                              {formatJsonValue(selectedAudit.despues)}
                            </pre>
                          </Paper>
                        </Grid>
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

export default AuditoriaAdmin;
