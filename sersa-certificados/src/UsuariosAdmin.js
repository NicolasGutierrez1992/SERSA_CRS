import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Fab,
  Switch,
  FormControlLabel,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as ResetPasswordIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

function UsuariosAdmin({ token, backendUrl }) {
  const [usuarios, setUsuarios] = useState([]);
  const [mayoristas, setMayoristas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);  const [form, setForm] = useState({
    nombre: '',
    cuit: '',
    mail: '',
    password: '',
    id_rol: '',
    limite_descargas: 5,
    id_mayorista: ''
  });
  const [resetForm, setResetForm] = useState({
    nuevaPassword: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [openMayoristaDialog, setOpenMayoristaDialog] = useState(false);

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
    fetchMayoristas();
  }, [backendUrl, token]);  async function fetchUsuarios() {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      } else {
        setError('Error al cargar usuarios');
      }
    } catch (err) {
      setError('Error de conexión al cargar usuarios');
    }
    setLoading(false);
  }
  async function fetchRoles() {
    try {
      const res = await fetch(`${backendUrl}/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  }
  async function fetchMayoristas() {
    try {
      console.log('Fetching mayoristas...');
      const response = await fetch(`${backendUrl}/mayoristas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Mayoristas response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Mayoristas data:', data);
        setMayoristas(data);
      } else {
        console.error('Error fetching mayoristas:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        setError('Error al cargar mayoristas');
      }
    } catch (err) {
      console.error('Error fetching mayoristas:', err);
      setError('Error de conexión al cargar mayoristas');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {      const url = editMode 
        ? `${backendUrl}/users/${selectedUser.id_usuario}`
        : `${backendUrl}/users`;
      
      const method = editMode ? 'PUT' : 'POST';
      
      const body = { ...form };
      if (editMode && !body.password) {
        delete body.password; // No enviar password vacío en edición
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {        setSuccess(editMode ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
        setDialogOpen(false);
        resetUserForm();
        fetchUsuarios();
      } else {
        setError(data.message || 'Error al guardar usuario');
      }
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Está seguro de eliminar este usuario?')) {
      return;
    }

    setLoading(true);
    try {      const res = await fetch(`${backendUrl}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setSuccess('Usuario eliminado correctamente');
        fetchUsuarios();
      } else {
        setError('Error al eliminar usuario');
      }
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!selectedUser || !resetForm.nuevaPassword) {
      setError('Ingrese una nueva contraseña');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/auth/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_usuario: selectedUser.id_usuario,
          nuevaPassword: resetForm.nuevaPassword
        })
      });

      if (res.ok) {
        setSuccess('Contraseña reseteada correctamente. El usuario deberá cambiarla en su próximo login.');
        setResetPasswordDialogOpen(false);
        setResetForm({ nuevaPassword: '' });
      } else {
        const data = await res.json();
        setError(data.message || 'Error al resetear contraseña');
      }
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  }  function openCreateDialog() {
    setEditMode(false);
    setSelectedUser(null);
    setForm({
      nombre: '',
      cuit: '',
      mail: '',
      password: '',
      id_rol: '',
      limite_descargas: 5,
      id_mayorista: mayoristas.length > 0 ? mayoristas[0].id_mayorista : ''
    });
    setDialogOpen(true);
  }
  function openEditDialog(user) {
    setEditMode(true);
    setSelectedUser(user);
    setForm({
      nombre: user.nombre || '',
      cuit: user.cuit || '',
      mail: user.mail || '',
      password: '',
      id_rol: user.id_rol || '',
      limite_descargas: user.limite_descargas || 5,
      id_mayorista: user.id_mayorista || 1
    });
    setDialogOpen(true);
  }

  function openResetPasswordDialog(user) {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);  }  const resetUserForm = () => {
    setForm({
      nombre: '',
      cuit: '',
      mail: '',
      password: '',
      id_rol: '',
      limite_descargas: 5,
      id_mayorista: mayoristas.length > 0 ? mayoristas[0].id_mayorista : ''
    });
  }
  function closeDialogs() {
    setDialogOpen(false);
    setResetPasswordDialogOpen(false);
    resetUserForm();
    setResetForm({ nuevaPassword: '' });
  }

  const getRoleName = (id_rol) => {
    const rol = roles.find(r => r.id_rol === id_rol);
    return rol ? rol.rol : 'Desconocido';
  };

  const getRolColor = (id_rol) => {
    switch (id_rol) {
      case 1: return 'error';
      case 2: return 'primary';
      case 3: return 'secondary';
      default: return 'default';
    }
  };

  const filteredUsuarios = showActiveOnly 
    ? usuarios.filter(user => user.status === 1)
    : usuarios;

  const handleUpdateMayorista = async () => {
    if (!selectedUser || !selectedUser.nuevo_mayorista) return;

    try {      const response = await fetch(`${backendUrl}/users/${selectedUser.id_usuario}/mayorista`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_mayorista: selectedUser.nuevo_mayorista })
      });

      if (response.ok) {
        setSuccess('Mayorista actualizado exitosamente');
        setOpenMayoristaDialog(false);
        setSelectedUser(null);
        fetchUsuarios();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al actualizar mayorista');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const openMayoristaEdit = (usuario) => {
    setSelectedUser({
      ...usuario,
      nuevo_mayorista: usuario.id_mayorista || 1
    });
    setOpenMayoristaDialog(true);
  };

  const getMayoristaName = (id) => {
    const mayorista = mayoristas.find(m => m.id_mayorista === id);
    return mayorista ? mayorista.nombre : 'Sin asignar';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestión de Usuarios</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
              />
            }
            label="Solo activos"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchUsuarios}
            disabled={loading}
          >
            Actualizar
          </Button>
          <Fab
            color="primary"
            aria-label="add"
            onClick={openCreateDialog}
            size="medium"
          >
            <AddIcon />
          </Fab>
        </Box>
      </Box>

      {/* Mensajes */}
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

      {/* Tabla de usuarios */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>CUIT</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Límite Descargas</TableCell>
              <TableCell>Último Login</TableCell>
              <TableCell>Mayorista</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredUsuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="textSecondary">
                    No hay usuarios para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsuarios.map((usuario) => (                <TableRow key={usuario.id_usuario}>
                  <TableCell>{usuario.nombre}</TableCell>
                  <TableCell>{usuario.cuit}</TableCell>
                  <TableCell>{usuario.mail}</TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleName(usuario.id_rol)}
                      color={getRolColor(usuario.id_rol)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={usuario.status === 1 ? 'Activo' : 'Inactivo'}
                      color={usuario.status === 1 ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{usuario.limite_descargas || 0}</TableCell>
                  <TableCell>
                    {usuario.ultimo_login 
                      ? new Date(usuario.ultimo_login).toLocaleDateString()
                      : 'Nunca'
                    }
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getMayoristaName(usuario.id_mayorista)}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(usuario)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Resetear Contraseña">
                      <IconButton
                        size="small"
                        onClick={() => openResetPasswordDialog(usuario)}
                      >
                        <ResetPasswordIcon />
                      </IconButton>
                    </Tooltip>                    <Tooltip title={usuario.id_rol === 1 ? "No se puede eliminar administradores" : "Eliminar"}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(usuario.id_usuario)}
                          disabled={usuario.id_rol === 1} // No eliminar admins
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Cambiar Mayorista">
                      <IconButton 
                        size="small" 
                        onClick={() => openMayoristaEdit(usuario)}
                      >
                        <BusinessIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar usuario */}
      <Dialog open={dialogOpen} onClose={closeDialogs} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="CUIT"
                  value={form.cuit}
                  onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                  required
                  placeholder="20-12345678-9"
                />
              </Grid>
              <Grid item xs={12}>                <TextField
                  fullWidth
                  type="email"
                  label="Email"
                  value={form.mail}
                  onChange={(e) => setForm({ ...form, mail: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Rol</InputLabel>
                  <Select
                    value={form.id_rol}
                    label="Rol"
                    onChange={(e) => setForm({ ...form, id_rol: e.target.value })}
                  >
                    {roles.map((rol) => (
                      <MenuItem key={rol.id_rol} value={rol.id_rol}>
                        {rol.rol}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Límite de Descargas"
                  value={form.limite_descargas}
                  onChange={(e) => setForm({ ...form, limite_descargas: parseInt(e.target.value) || 0 })}
                  required
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label={editMode ? "Nueva Contraseña (dejar vacío para mantener actual)" : "Contraseña"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editMode}
                  helperText="Ingrese la contraseña del usuario"
                />
              </Grid>
              <Grid item xs={12} sm={6}>                <FormControl fullWidth required>
                  <InputLabel>Mayorista</InputLabel>
                  <Select
                    value={form.id_mayorista || ''}
                    label="Mayorista"
                    onChange={(e) => setForm({ ...form, id_mayorista: e.target.value })}
                    disabled={mayoristas.length === 0}
                  >
                    {mayoristas.length === 0 ? (
                      <MenuItem value="" disabled>
                        Cargando mayoristas...
                      </MenuItem>
                    ) : (
                      mayoristas.map((mayorista) => (
                        <MenuItem key={mayorista.id_mayorista} value={mayorista.id_mayorista}>
                          {mayorista.nombre}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialogs}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : (editMode ? 'Actualizar' : 'Crear')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para resetear contraseña */}
      <Dialog open={resetPasswordDialogOpen} onClose={closeDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>
          Resetear Contraseña - {selectedUser?.nombre}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            El usuario deberá cambiar esta contraseña en su próximo inicio de sesión.
          </Alert>
          <TextField
            fullWidth
            type="password"
            label="Nueva Contraseña"
            value={resetForm.nuevaPassword}
            onChange={(e) => setResetForm({ ...resetForm, nuevaPassword: e.target.value })}
            required
            sx={{ mt: 2 }}
            helperText="Ingrese la nueva contraseña"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialogs}>Cancelar</Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            color="warning"
            disabled={loading || !resetForm.nuevaPassword}
          >
            {loading ? <CircularProgress size={20} /> : 'Resetear Contraseña'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para cambiar mayorista */}
      <Dialog open={openMayoristaDialog} onClose={() => setOpenMayoristaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cambiar Mayorista</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Usuario: <strong>{selectedUser.nombre}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Mayorista actual: {getMayoristaName(selectedUser.id_mayorista)}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Nuevo Mayorista</InputLabel>
                <Select
                  value={selectedUser.nuevo_mayorista}
                  label="Nuevo Mayorista"
                  onChange={(e) => setSelectedUser({...selectedUser, nuevo_mayorista: e.target.value})}
                >
                  {mayoristas.map((mayorista) => (
                    <MenuItem key={mayorista.id_mayorista} value={mayorista.id_mayorista}>
                      {mayorista.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMayoristaDialog(false)}>Cancelar</Button>
          <Button onClick={handleUpdateMayorista} variant="contained">Actualizar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UsuariosAdmin;
