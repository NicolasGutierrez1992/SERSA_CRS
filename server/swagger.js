const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SERSA API',
      version: '1.0.0',
      description: 'Documentación de la API de SERSA',
    },
  },
  apis: ['./server/*.js'], // Archivos donde tienes tus rutas y comentarios Swagger
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;