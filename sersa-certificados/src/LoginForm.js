import React, { useState } from 'react';
import { Alert, Box, Button, TextField, Paper, Typography, CircularProgress } from '@mui/material';

function LoginForm({ onLogin, error, loading }) {
  const [cuit, setCuit] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ cuit, password });
  };

  return (
    <Paper elevation={3} sx={{ padding: 4, maxWidth: 400, margin: '0 auto' }}>
      <Typography variant="h6" component="h2" gutterBottom textAlign="center" color="textSecondary">
        Iniciar Sesión
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="CUIT/CUIL"
          value={cuit}
          onChange={(e) => setCuit(e.target.value)}
          required
          disabled={loading}
          margin="normal"
          variant="outlined"
          placeholder="20-12345678-9"
        />
        
        <TextField
          fullWidth
          type="password"
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          margin="normal"
          variant="outlined"
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{ mt: 3, mb: 2, py: 1.5 }}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </Button>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Paper>
  );
}

export default LoginForm;

