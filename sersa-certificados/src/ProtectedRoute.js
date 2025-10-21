import React from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box } from '@mui/material';

function ProtectedRoute({ token, children, requiredRole = null, currentRole = null }) {
  // Si no hay token, redirigir al login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Si se requiere un rol específico y el usuario no lo tiene
  if (requiredRole && currentRole !== requiredRole) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          No tienes permisos para acceder a esta sección.
        </Alert>
      </Box>
    );
  }

  return children;
}

export default ProtectedRoute;