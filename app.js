const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./server/swagger');
require('dotenv').config({ override: true });
const path = require('path');
const authRouter = require('./server/auth'); // Asegúrate de que la ruta sea correcta
const wscertRouter = require('./server/wscert');
const cors = require('cors');

const BACKEND_URL = 'https://sersa-crs.onrender.com';
const FRONT_URL = 'https://sersa.onrender.com';
const app = express();
const PORT = 3000;

app.use(cors({
  origin: [
    FRONT_URL
  ]
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Middleware para parsear JSON en las solicitudes
app.use('/auth', authRouter);
app.use('/api', wscertRouter );
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en ${BACKEND_URL}`);
});