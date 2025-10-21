const express = require('express');
const pool = require('./db');
const { verifyToken, requireAdmin } = require('./middleware');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configura el transporter de nodemailer (ajusta con tus credenciales)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Notificaciones configurables para administradores
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['admin1@example.com','admin2@example.com'];

function enviarNotificacionAdmin(porcentaje, id_usuario, limitePendientes) {
  // Aquí puedes obtener el mail del usuario si lo necesitas
  const subject = 'Alerta de descargas pendientes (admin)';
  const text = `El usuario ${id_usuario} ha alcanzado el ${porcentaje}% de su límite de descargas pendientes (${limitePendientes}).`;
  ADMIN_EMAILS.forEach(email => {
    transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject,
      text
    }, (err) => {
      if (err) console.error('Error enviando notificación admin:', err);
    });
  });
}

// Endpoint para enviar notificación de límite alcanzado
router.post('/descargas-limite', async (req, res) => {
  const { mail, porcentaje, limite } = req.body;
  if (!mail || !porcentaje || !limite) {
    return res.status(400).json({ message: 'Faltan datos requeridos' });
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: mail,
      subject: 'Alerta de descargas pendientes',
      text: `Ha alcanzado el ${porcentaje}% de su límite de descargas pendientes (${limite}). Por favor, regularice su situación.`
    });
    res.json({ message: 'Notificación enviada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al enviar notificación' });
  }
});

// Obtener conteo de notificaciones pendientes (solo admin)
router.get('/count', async (req, res) => {
  try {
    console.log('[GET /count] Solicitud de conteo de notificaciones (sin auth)');
    
    // Por ahora devolvemos un conteo de ejemplo
    // En una implementación real, esto consultaría una tabla de notificaciones
    const count = 0; // Placeholder
    
    console.log('[GET /count] Enviando conteo de notificaciones:', count);
    
    // Asegurar que se envíe como JSON
    res.setHeader('Content-Type', 'application/json');
    res.json({ count });

  } catch (err) {
    console.error('[GET /count] Error getting notification count:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ message: 'Error interno del servidor', count: 0 });
  }
});

module.exports = router;
module.exports.enviarNotificacionAdmin = enviarNotificacionAdmin;
