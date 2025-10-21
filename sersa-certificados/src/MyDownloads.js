import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Pagination,
  CircularProgress
} from '@mui/material';
import { History, Search, Clear, Download } from '@mui/icons-material';

const MyDownloads = ({ token, backendUrl, userId }) => {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
    controlador: ''
  });  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadDownloads = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await fetch(`${backendUrl}/downloads/my-downloads?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDownloads(data.downloads || []);
        setTotalPages(Math.ceil((data.total || 0) / 10));
      } else {
        setError('Error al cargar el historial de descargas');
      }
    } catch (err) {
      console.error('Error loading downloads:', err);
      setError('Error de conexión al cargar las descargas');
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token, page, filters]);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      estado: '',
      fechaDesde: '',
      fechaHasta: '',
      controlador: ''
    });
    setPage(1);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'Pendiente de Facturar':
        return 'warning';
      case 'Facturado':
        return 'success';
      case 'En Proceso':
        return 'info';
      case 'Error':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-AR');
  };
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleReDownload = async (download) => {
    try {
      const response = await fetch(`${backendUrl}/downloads/download/${download.id_descarga}`, {
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
        link.download = download.certificado_nombre || `certificado_${download.controlador_id}.pem`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('Certificado re-descargado exitosamente');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al re-descargar certificado');
      }
    } catch (err) {
      console.error('Error re-downloading certificate:', err);
      setError('Error de conexión al re-descargar certificado');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <History sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h1">
                Mi Historial de Descargas
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Filtros */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Filtros
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={filters.estado}
                    label="Estado"
                    onChange={(e) => handleFilterChange('estado', e.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="Pendiente de Facturar">Pendiente de Facturar</MenuItem>
                    <MenuItem value="Facturado">Facturado</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label="Desde"
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  size="small"
                  label="Hasta"
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  size="small"
                  label="Controlador"
                  value={filters.controlador}
                  onChange={(e) => handleFilterChange('controlador', e.target.value)}
                />

                <Button
                  variant="outlined"
                  startIcon={<Search />}
                  onClick={loadDownloads}
                >
                  Buscar
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
              </Box>
            </Paper>

            {/* Tabla de descargas */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper}>
                  <Table>                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Certificado</TableCell>
                        <TableCell>Controlador</TableCell>
                        <TableCell>Tamaño</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Checksum</TableCell>
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {downloads.length === 0 ? (                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography variant="body1" color="textSecondary">
                              No se encontraron descargas
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        downloads.map((download) => (
                          <TableRow key={download.id_descarga}>
                            <TableCell>
                              {formatDate(download.fecha)}
                            </TableCell>
                            <TableCell>
                              {download.certificado_nombre || download.id_certificado}
                            </TableCell>
                            <TableCell>
                              {download.controlador_id || '-'}
                            </TableCell>
                            <TableCell>
                              {formatFileSize(download.tamaño)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={download.estado}
                                color={getEstadoColor(download.estado)}
                                size="small"
                              />
                            </TableCell>                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {download.checksum ? download.checksum.substring(0, 16) + '...' : '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {download.certificado_pem ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Download />}
                                  onClick={() => handleReDownload(download)}
                                  sx={{ 
                                    minWidth: 'auto',
                                    px: 1,
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  Descargar
                                </Button>
                              ) : (
                                <Typography variant="body2" color="textSecondary">
                                  No disponible
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Paginación */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(event, value) => setPage(value)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default MyDownloads;
