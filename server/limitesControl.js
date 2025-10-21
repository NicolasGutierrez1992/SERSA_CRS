const pool = require('./db');
const { registrarAuditoria } = require('./audit');
const nodemailer = require('nodemailer');

// Configurar transportador de email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Verificar si el usuario puede realizar una nueva descarga
 * @param {number} userId - ID del usuario
 * @returns {Promise<{canDownload: boolean, pendingCount: number, limit: number, message?: string}>}
 */
async function verificarLimiteDescargas(userId) {
  try {
    // Obtener límite del usuario y contar descargas pendientes
    const userResult = await pool.query(
      'SELECT limite_descargas, nombre, mail FROM users WHERE id_usuario = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { canDownload: false, pendingCount: 0, limit: 0, message: 'Usuario no encontrado' };
    }

    const user = userResult.rows[0];
    const limit = user.limite_descargas || 5;

    // Contar descargas pendientes de facturar
    const pendingResult = await pool.query(
      'SELECT COUNT(*) as count FROM descargas WHERE id_usuario = $1 AND estado = $2',
      [userId, 'Pendiente de Facturar']
    );

    const pendingCount = parseInt(pendingResult.rows[0].count);

    if (pendingCount >= limit) {
      return {
        canDownload: false,
        pendingCount,
        limit,
        message: `Ha alcanzado el límite de ${limit} descargas pendientes. Contacte al administrador.`
      };
    }

    return {
      canDownload: true,
      pendingCount,
      limit
    };
  } catch (error) {
    console.error('Error verificando límite de descargas:', error);
    return { canDownload: false, pendingCount: 0, limit: 0, message: 'Error interno del servidor' };
  }
}

/**
 * Notificar al administrador sobre límites alcanzados
 * @param {number} userId - ID del usuario
 * @param {number} pendingCount - Cantidad de descargas pendientes
 * @param {number} limit - Límite del usuario
 * @param {string} type - Tipo de notificación ('80%' | '100%' | 'blocked')
 */
async function notificarLimiteAlcanzado(userId, pendingCount, limit, type) {
  try {
    // Obtener datos del usuario
    const userResult = await pool.query(
      'SELECT nombre, mail, cuit FROM users WHERE id_usuario = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const user = userResult.rows[0];

    // Obtener emails de administradores
    const adminResult = await pool.query(
      'SELECT mail FROM users WHERE id_rol = 1 AND status = 1'
    );

    const adminEmails = adminResult.rows.map(row => row.mail).filter(email => email);

    if (adminEmails.length === 0) return;

    let subject, message;

    switch (type) {
      case '80%':
        subject = `SERSA CRS - Usuario cerca del límite: ${user.nombre}`;
        message = `
          <h3>Alerta: Usuario cerca del límite de descargas</h3>
          <p><strong>Usuario:</strong> ${user.nombre} (${user.cuit})</p>
          <p><strong>Descargas pendientes:</strong> ${pendingCount} de ${limit}</p>
          <p><strong>Porcentaje usado:</strong> ${Math.round((pendingCount / limit) * 100)}%</p>
          <p>El usuario está cerca de alcanzar su límite de descargas pendientes.</p>
        `;
        break;
      case '100%':
        subject = `SERSA CRS - Usuario alcanzó el límite: ${user.nombre}`;
        message = `
          <h3>Alerta: Usuario alcanzó el límite de descargas</h3>
          <p><strong>Usuario:</strong> ${user.nombre} (${user.cuit})</p>
          <p><strong>Descargas pendientes:</strong> ${pendingCount} de ${limit}</p>
          <p>El usuario ha alcanzado su límite de descargas pendientes y no podrá realizar nuevas descargas.</p>
        `;
        break;
      case 'blocked':
        subject = `SERSA CRS - Intento de descarga bloqueada: ${user.nombre}`;
        message = `
          <h3>Alerta: Intento de descarga bloqueada</h3>
          <p><strong>Usuario:</strong> ${user.nombre} (${user.cuit})</p>
          <p><strong>Descargas pendientes:</strong> ${pendingCount} de ${limit}</p>
          <p>El usuario intentó realizar una descarga pero fue bloqueado por exceder el límite.</p>
        `;
        break;
    }

    // Enviar email a todos los administradores
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@sersa.com',
      to: adminEmails.join(','),
      subject,
      html: message
    });

    // Registrar notificación en la base de datos
    await pool.query(
      'INSERT INTO notificaciones (tipo, destinatario_id, estado_envio, payload) VALUES ($1, $2, $3, $4)',
      [
        `limit_${type}`,
        userId,
        'Enviado',
        JSON.stringify({ pendingCount, limit, adminEmails })
      ]
    );

  } catch (error) {
    console.error('Error enviando notificación de límite:', error);
    
    // Registrar error en notificaciones
    await pool.query(
      'INSERT INTO notificaciones (tipo, destinatario_id, estado_envio, payload) VALUES ($1, $2, $3, $4)',
      [
        `limit_${type}`,
        userId,
        'Error',
        JSON.stringify({ error: error.message, pendingCount, limit })
      ]
    );
  }
}

/**
 * Verificar y notificar límites para todos los usuarios
 */
async function verificarLimitesGlobales() {
  try {
    const result = await pool.query(`
      SELECT 
        u.id_usuario,
        u.nombre,
        u.limite_descargas,
        COUNT(d.id_descarga) as pending_count
      FROM users u
      LEFT JOIN descargas d ON u.id_usuario = d.id_usuario AND d.estado = 'Pendiente de Facturar'
      WHERE u.status = 1 AND u.id_rol IN (2, 3)
      GROUP BY u.id_usuario, u.nombre, u.limite_descargas
      HAVING COUNT(d.id_descarga) >= u.limite_descargas * 0.8
    `);

    for (const user of result.rows) {
      const percentage = (user.pending_count / user.limite_descargas) * 100;
      
      if (percentage >= 100) {
        await notificarLimiteAlcanzado(user.id_usuario, user.pending_count, user.limite_descargas, '100%');
      } else if (percentage >= 80) {
        await notificarLimiteAlcanzado(user.id_usuario, user.pending_count, user.limite_descargas, '80%');
      }
    }
  } catch (error) {
    console.error('Error verificando límites globales:', error);
  }
}

module.exports = {
  verificarLimiteDescargas,
  notificarLimiteAlcanzado,
  verificarLimitesGlobales
};
