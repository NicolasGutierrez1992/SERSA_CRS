const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(express.json());

// Middlewares
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rutas
console.log('Loading routes...');
try {
  app.use('/auth', require('./routes/auth'));
  console.log('✓ Auth routes loaded');
} catch (error) {
  console.error('✗ Error loading auth routes:', error.message);
}

try {
  app.use('/downloads', require('./routes/downloads'));
  console.log('✓ Downloads routes loaded');
} catch (error) {
  console.error('✗ Error loading downloads routes:', error.message);
}

try {
  app.use('/usuarios', require('./routes/usuarios'));
  console.log('✓ Usuarios routes loaded');
} catch (error) {
  console.error('✗ Error loading usuarios routes:', error.message);
}

try {
  app.use('/mayoristas', require('./routes/mayoristas-simple'));
  console.log('✓ Mayoristas routes loaded');
} catch (error) {
  console.error('✗ Error loading mayoristas routes:', error.message);
}

try {
  app.use('/roles', require('./routes/roles'));
  console.log('✓ Roles routes loaded');
} catch (error) {
  console.error('✗ Error loading roles routes:', error.message);
}

console.log('All routes loaded successfully');

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});