const express = require('express');
require('dotenv').config({ override: true });
const path = require('path');
const authRouter = require('./server/auth'); // Asegúrate de que la ruta sea correcta
const wscertRouter = require('./server/wscert');


const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Middleware para parsear JSON en las solicitudes
app.use('/auth', authRouter);
app.use('/api', wscertRouter );

/* async (req, res) => {
  try {
    const resultado = await renovarCertificado();
    res.json({ success: true, data: resultado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
} */

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});