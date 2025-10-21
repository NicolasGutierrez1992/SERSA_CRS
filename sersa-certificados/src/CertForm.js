import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Download as DownloadIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const CertForm = ({ token, backendUrl, onRefreshLimits, downloadLimits }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
    // Estados para generar nuevo certificado
  const [generateForm, setGenerateForm] = useState({
    marca: 'SH',        // SAM4s preseleccionado
    modelo: 'IA',       // Ellix 40 F preseleccionado
    numeroSerie: ''
  });
  const [generating, setGenerating] = useState(false);
  // Función para generar certificado desde WS ARCA
  const handleGenerateCertificate = async () => {
    if (!generateForm.marca || !generateForm.modelo || !generateForm.numeroSerie) {
      setError('Todos los campos son requeridos: Marca, Modelo y Número de Serie');
      return;
    }

    // Verificar límites antes de generar
    if (downloadLimits && downloadLimits.percentage >= 100) {
      setError('Ha alcanzado el límite de descargas pendientes. Contacte al administrador.');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');    try {
      // Completar número de serie con ceros a la izquierda hasta 10 dígitos
      const numeroSerieCompleto = generateForm.numeroSerie.padStart(10, '0');
      
      console.log('Número de serie original:', generateForm.numeroSerie);
      console.log('Número de serie completo:', numeroSerieCompleto);
        const response = await fetch(`${backendUrl}/api/Certs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          marca: generateForm.marca,
          modelo: generateForm.modelo,
          numeroSerie: numeroSerieCompleto
        })
      });        // Verificar si el token expiró
        if (response.status === 401) {
          console.log('Token expired in certificate generation, auto logout...');
          // Usar función global de logout sin mensaje
          if (window.handleGlobalLogout) {
            window.handleGlobalLogout(); // Sin mensaje - logout silencioso
          } else {
            // Fallback: limpiar y redirigir directamente
            localStorage.clear();
            window.location.href = '/';
          }
          return;
        }

      if (response.ok) {
        const data = await response.json();
          if (data.pem) {
          // Crear archivo para descarga con nomenclatura específica
          const currentDate = new Date();
          const day = currentDate.getDate().toString().padStart(2, '0');
          const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
          const year = currentDate.getFullYear();
          const filename = `SE${generateForm.marca}${generateForm.modelo}${numeroSerieCompleto}-${day}-${month}-${year}.pem`;
          
          const blob = new Blob([data.pem], { type: 'application/x-pem-file' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);          // Registrar descarga en la base de datos con contenido PEM
          const downloadResponse = await fetch(`${backendUrl}/downloads/create`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              certificado_nombre: filename,
              controlador_id: numeroSerieCompleto,
              marca: generateForm.marca,
              modelo: generateForm.modelo,
              numeroSerie: numeroSerieCompleto,
              certificado_pem: data.pem // Guardar contenido PEM completo
            })
          });

          if (!downloadResponse.ok) {
            console.error('Error registrando descarga:', downloadResponse.status);
          } else {
            console.log('Descarga registrada exitosamente en BD');
          }

          setSuccess(`Certificado generado y descargado exitosamente para SE${generateForm.marca}${generateForm.modelo}${numeroSerieCompleto}`);
            // Limpiar formulario (mantener valores por defecto en selects)
          setGenerateForm({ marca: 'SH', modelo: 'IA', numeroSerie: '' });
          
          // Actualizar límites
          if (onRefreshLimits) {
            onRefreshLimits();
          }
        } else {
          setError('No se pudo generar el certificado. Respuesta vacía del servidor.');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al generar certificado');
      }
    } catch (err) {
      console.error('Error generating certificate:', err);
      setError('Error de conexión al generar certificado');    } finally {
      setGenerating(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const canDownload = !downloadLimits || downloadLimits.percentage < 100;

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <DownloadIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h1">
                Descargar Certificados
              </Typography>
            </Box>

            {/* Información de límites */}
            {downloadLimits && downloadLimits.limit > 0 && (
              <Alert 
                severity={downloadLimits.percentage >= 100 ? 'error' : downloadLimits.percentage >= 80 ? 'warning' : 'info'}
                sx={{ mb: 3 }}
                icon={downloadLimits.percentage >= 80 ? <WarningIcon /> : <InfoIcon />}
              >
                <Box>
                  <Typography variant="body2">
                    <strong>Estado de descargas:</strong> {downloadLimits.pending} de {downloadLimits.limit} pendientes
                    ({Math.round(downloadLimits.percentage)}% del límite usado)
                  </Typography>
                  {downloadLimits.percentage >= 100 && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Ha alcanzado el límite máximo. Contacte al administrador para continuar descargando.
                    </Typography>
                  )}
                </Box>
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            {/* Formulario para generar nuevo certificado */}
            <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Generar Nuevo Certificado RTI
                </Typography>                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Seleccione el modelo SAM4s y complete el número de serie para generar un certificado RTI desde el WS de ARCA
                </Typography>                  <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'stretch' }}>
                  <FormControl fullWidth required>
                    <InputLabel>Marca</InputLabel>
                    <Select
                      value={generateForm.marca}
                      label="Marca"
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, marca: e.target.value }))}
                      disabled={generating}
                    >
                      <MenuItem value="SH">SAM4s</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth required>
                    <InputLabel>Modelo</InputLabel>
                    <Select
                      value={generateForm.modelo}
                      label="Modelo"
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, modelo: e.target.value }))}
                      disabled={generating}
                    >
                      <MenuItem value="IA">Ellix 40 F</MenuItem>
                      <MenuItem value="RA">NR 330 F</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="Número de Serie"
                    value={generateForm.numeroSerie}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, numeroSerie: e.target.value }))}
                    disabled={generating}
                    required
                    fullWidth
                    inputProps={{ maxLength: 10 }}
                    placeholder="ej: 0000001371"
                  />
                  <Button
                    variant="contained"
                    onClick={handleGenerateCertificate}
                    disabled={generating || !canDownload}
                    startIcon={generating ? <CircularProgress size={20} /> : <DownloadIcon />}
                    fullWidth
                    sx={{ py: 1.5 }}
                  >
                    {generating ? 'Generando...' : 'Generar Cert.'}
                  </Button></Box>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default CertForm;

