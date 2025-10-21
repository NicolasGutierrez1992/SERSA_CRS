const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./server/swagger');
require('dotenv').config({ override: true });
const path = require('path');
const authRouter = require('./server/auth');
const wscertRouter = require('./server/wscert');
const usersRouter = require('./server/users');
const downloadsRouter = require('./server/downloads');
const tokensRouter = require('./server/tokens');
const reportesRouter = require('./server/reportes');
const notificationsRouter = require('./server/notifications');
const metricsRouter = require('./server/metrics');
const mayoristaRouter = require('./server/mayoristas');
const rolesRouter = require('./server/roles');
const { router: auditRouter } = require('./server/audit');

const cors = require('cors');

//

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.HOST ? `${process.env.HOST}:${PORT}` : 'https://sersa-crs.onrender.com';

const FRONT_URL = 'https://sersa.onrender.com';

app.use(cors({
  origin: [
    FRONT_URL,
    'http://localhost:3001'
  ],
  credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Middleware para parsear JSON en las solicitudes
app.use('/auth', authRouter);
app.use('/api', wscertRouter );
app.use('/users', usersRouter);
app.use('/downloads', downloadsRouter);
app.use('/tokens', tokensRouter);
app.use('/reportes', reportesRouter);
app.use('/notifications', notificationsRouter);
app.use('/metrics', metricsRouter);
app.use('/mayoristas', mayoristaRouter);
app.use('/roles', rolesRouter);
app.use('/audit', auditRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en ${BACKEND_URL}`);
});