import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  Container,
  Card,
  CardContent
} from '@mui/material';
import { Security } from '@mui/icons-material';

const CambiarPassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setMessage({ type: '', text: '' });
  };
  const validatePassword = (password) => {
    // Validación simple: solo no vacía
    return password && password.trim().length > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validaciones
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Todos los campos son obligatorios' });
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las nuevas contraseñas no coinciden' });
      setLoading(false);
      return;
    }    if (!validatePassword(formData.newPassword)) {
      setMessage({ 
        type: 'error', 
        text: 'La nueva contraseña no puede estar vacía' 
      });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Contraseña cambiada exitosamente' });
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al cambiar la contraseña' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Security sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h1">
                Cambiar Contraseña
              </Typography>
            </Box>

            {message.text && (
              <Alert severity={message.type} sx={{ mb: 3 }}>
                {message.text}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                margin="normal"
                name="currentPassword"
                label="Contraseña Actual"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />

              <TextField
                fullWidth
                margin="normal"
                name="newPassword"
                label="Nueva Contraseña"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                required
                disabled={loading}
                helperText="Ingrese su nueva contraseña"
              />

              <TextField
                fullWidth
                margin="normal"
                name="confirmPassword"
                label="Confirmar Nueva Contraseña"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default CambiarPassword;