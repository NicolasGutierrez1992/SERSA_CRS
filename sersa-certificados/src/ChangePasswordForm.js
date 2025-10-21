import React, { useState } from 'react';
import { 
  Alert, 
  Box, 
  Button, 
  TextField, 
  Paper, 
  Typography, 
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';

function ChangePasswordForm({ token, backendUrl, userId, onSuccess, isFirstTime = false }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Validación simple de contraseña
  const validatePassword = (password) => {
    return password && password.trim().length > 0;
  };

  const isPasswordValid = validatePassword(newPassword);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones
    if ((!isFirstTime && !currentPassword) || !newPassword || !confirmPassword) {
      setError('Todos los campos son requeridos');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      setLoading(false);
      return;
    }    if (!isPasswordValid) {
      setError('La contraseña no puede estar vacía');
      setLoading(false);
      return;
    }

    try {
      const body = {
        id_usuario: userId,
        newPassword: newPassword
      };

      // Solo incluir contraseña actual si no es primer cambio
      if (!isFirstTime) {
        body.currentPassword = currentPassword;
      }

      const res = await fetch(`${backendUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (res.ok) {        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onSuccess) onSuccess('Contraseña cambiada correctamente');
      } else {
        setError(data.message || 'Error al cambiar la contraseña');
      }
    } catch (err) {
      setError('Error de conexión');
    }
    
    setLoading(false);
  }

  const getValidationIcon = (isValid) => {
    return isValid ? <Check color="success" /> : <Close color="error" />;
  };

  return (
    <Paper elevation={3} sx={{ padding: 4, maxWidth: 500, margin: '0 auto' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {isFirstTime ? 'Cambio de Contraseña Requerido' : 'Cambiar Contraseña'}
      </Typography>
      
      {isFirstTime && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Debe cambiar su contraseña antes de continuar. Esta es su primera vez o su contraseña fue reseteada.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        {!isFirstTime && (
          <TextField
            fullWidth
            type="password"
            label="Contraseña Actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={loading}
            margin="normal"
            variant="outlined"
          />
        )}

        <TextField
          fullWidth
          type="password"
          label="Nueva Contraseña"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={loading}
          margin="normal"
          variant="outlined"
        />        {/* Mensaje simple para contraseña */}
        {newPassword && (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Ingrese cualquier contraseña que desee usar.
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          type="password"
          label="Confirmar Nueva Contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading}
          margin="normal"
          variant="outlined"
          error={confirmPassword && newPassword !== confirmPassword}
          helperText={confirmPassword && newPassword !== confirmPassword ? 'Las contraseñas no coinciden' : ''}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading || !isPasswordValid}
          sx={{ mt: 3, mb: 2, py: 1.5 }}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}        </Alert>
        )}
      </Box>
    </Paper>
  );
}

export default ChangePasswordForm;
