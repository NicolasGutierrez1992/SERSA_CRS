import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Tabs,
  Tab,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { People, Download, FilterList } from '@mui/icons-material';

const MayoristaView = ({ token, backendUrl, userId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [usuarios, setUsuarios] = useState([]);
  const [descargas, setDescargas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mayoristaId, setMayoristaId] = useState(null);
  const [mayoristaName, setMayoristaName] = useState('');
    // Filtros para descargas
  const [filtros, setFiltros] = useState({
    usuario_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: ''
  });
  
  // Paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });  // Obtener información del mayorista actual
  useEffect(() => {
    const fetchMayoristaInfo = async () => {
      try {
        console.log('Fetching user info...');
        
        const response = await fetch(`${backendUrl}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('User info response status:', response.status);        if (response.ok) {
          const userData = await response.json();
          console.log('User data received:', userData);
          
          if (userData.id_mayorista) {
            setMayoristaId(userData.id_mayorista);
            setMayoristaName(userData.mayorista || 'Sin asignar');
            console.log('Mayorista ID set to:', userData.id_mayorista);
          } else {
            console.error('User has no mayorista assigned. User data:', userData);
            setError('Este usuario no tiene un mayorista asignado. Contacte al administrador.');
          }
        } else {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          setError('Error al obtener información del usuario');
        }
      } catch (err) {
        console.error('Error fetching mayorista info:', err);
        setError('Error de conexión');
      }
    };

    if (userId && token) {
      fetchMayoristaInfo();
    }
  }, [userId, token, backendUrl]);
  // Cargar usuarios del mayorista
  const fetchUsuarios = async () => {
    if (!mayoristaId) {
      console.log('No mayorista ID available, skipping fetch usuarios');
      return;
    }
    
    console.log('Fetching usuarios for mayorista ID:', mayoristaId);
    setLoading(true);
    
    try {
      const response = await fetch(`${backendUrl}/mayoristas/${mayoristaId}/usuarios`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Usuarios response status:', response.status);      if (response.ok) {
        const data = await response.json();
        console.log('Usuarios data received:', data);
        console.log('Number of usuarios:', data.length);
        setUsuarios(data);
        setError(''); // Limpiar error si la carga fue exitosa
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setError(`Error al cargar usuarios: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error fetching usuarios:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };
  // Cargar descargas del mayorista
  const fetchDescargas = async (page = 1) => {
    if (!mayoristaId) {
      console.log('No mayorista ID available, skipping fetch descargas');
      return;
    }
    
    console.log('Fetching descargas for mayorista ID:', mayoristaId, 'page:', page);
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filtros
      });

      console.log('Descargas params:', params.toString());

      const response = await fetch(`${backendUrl}/mayoristas/${mayoristaId}/descargas?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Descargas response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Descargas data received:', data);
        console.log('Number of descargas:', data.descargas?.length || 0);
        
        setDescargas(data.descargas || []);
        setPagination(prev => ({
          ...prev,
          ...data.pagination
        }));
        setError(''); // Limpiar error si la carga fue exitosa
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setError(`Error al cargar descargas: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error fetching descargas:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mayoristaId) {
      if (tabValue === 0) {
        fetchUsuarios();
      } else {
        fetchDescargas();
      }
    }
  }, [mayoristaId, tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
  };

  const handleFiltroChange = (field, value) => {
    setFiltros(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const aplicarFiltros = () => {
    fetchDescargas(1);
  };
  const limpiarFiltros = () => {
    setFiltros({
      usuario_id: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: ''
    });
    setTimeout(() => fetchDescargas(1), 100);
  };

  const handlePageChange = (event, page) => {
    fetchDescargas(page);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-AR');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Panel Mayorista - {mayoristaName}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab 
              icon={<People />} 
              label="Mis Usuarios" 
              iconPosition="start"
            />
            <Tab 
              icon={<Download />} 
              label="Descargas" 
              iconPosition="start"
            />
          </Tabs>

          {/* Tab Usuarios */}
          {tabValue === 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Usuarios Asignados ({usuarios.length})
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>                        <TableRow>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>CUIT</TableCell>
                          <TableCell>Rol</TableCell>
                          <TableCell>Límite Descargas</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell>Fecha Registro</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                      {usuarios.map((usuario) => (                        <TableRow key={usuario.id_usuario}>
                          <TableCell>{usuario.nombre}</TableCell>
                          <TableCell>{usuario.email}</TableCell>
                          <TableCell>{usuario.cuit || 'N/A'}</TableCell>
                          <TableCell>{usuario.rol}</TableCell>
                          <TableCell>{usuario.limite_descargas}</TableCell>
                          <TableCell>
                            <Chip 
                              label={usuario.activo ? 'Activo' : 'Inactivo'}
                              color={usuario.activo ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatDate(usuario.created_at)}</TableCell>
                        </TableRow>
                      ))}                        {usuarios.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                              No hay usuarios asignados
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Tab Descargas */}
          {tabValue === 1 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Descargas de Usuarios
              </Typography>              {/* Filtros */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Usuario</InputLabel>
                  <Select
                    value={filtros.usuario_id}
                    label="Usuario"
                    onChange={(e) => handleFiltroChange('usuario_id', e.target.value)}
                  >
                    <MenuItem value="">Todos los usuarios</MenuItem>
                    {usuarios.map((usuario) => (
                      <MenuItem key={usuario.id_usuario} value={usuario.id_usuario}>
                        {usuario.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 180 }}>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={filtros.estado}
                    label="Estado"
                    onChange={(e) => handleFiltroChange('estado', e.target.value)}
                  >
                    <MenuItem value="">Todos los estados</MenuItem>
                    <MenuItem value="Pendiente de Facturar">Pendiente de facturar</MenuItem>
                    <MenuItem value="Facturado">Facturado</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Fecha Inicio"
                  type="date"
                  value={filtros.fecha_inicio}
                  onChange={(e) => handleFiltroChange('fecha_inicio', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Fecha Fin"
                  type="date"
                  value={filtros.fecha_fin}
                  onChange={(e) => handleFiltroChange('fecha_fin', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />

                <Button 
                  variant="contained" 
                  startIcon={<FilterList />}
                  onClick={aplicarFiltros}
                  disabled={loading}
                >
                  Filtrar
                </Button>

                <Button 
                  variant="outlined" 
                  onClick={limpiarFiltros}
                  disabled={loading}
                >
                  Limpiar
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>                        <TableRow>
                          <TableCell>Certificado</TableCell>
                          <TableCell>Usuario</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>CUIT</TableCell>
                          <TableCell>Fecha Descarga</TableCell>
                          <TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>                        {descargas.map((descarga) => (
                          <TableRow key={descarga.id_descarga}>
                            <TableCell>{descarga.certificado_nombre}</TableCell>
                            <TableCell>{descarga.usuario_nombre}</TableCell>
                            <TableCell>{descarga.usuario_email}</TableCell>
                            <TableCell>{descarga.usuario_cuit || 'N/A'}</TableCell>
                            <TableCell>{formatDate(descarga.fecha)}</TableCell>
                            <TableCell>{descarga.estado}</TableCell>
                          </TableRow>
                        ))}
                        {descargas.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                              No hay descargas registradas
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {pagination.totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Pagination
                        count={pagination.totalPages}
                        page={pagination.page}
                        onChange={handlePageChange}
                        color="primary"
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MayoristaView;