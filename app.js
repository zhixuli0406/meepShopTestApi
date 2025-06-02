// app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');

// Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerOptions = require('./config/swaggerOptions');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const conversationRoutes = require('./src/routes/conversation.routes');
const messageRoutes = require('./src/routes/message.routes');
const uploadRoutes = require('./src/routes/upload.routes');

const app = express();

// Swagger UI setup
const swaggerSpecs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to MeepShop Chat API!', status: 'OK' });
});

// API Routes
const apiBasePath = '/api/v1'; // Define a base path for API versioning
app.use(`${apiBasePath}/auth`, authRoutes);
app.use(`${apiBasePath}/conversations`, conversationRoutes);
app.use(`${apiBasePath}/messages`, messageRoutes);
app.use(`${apiBasePath}/upload`, uploadRoutes);

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error('ERROR 💥', err);
  res.status(statusCode);
  res.json({
    status: err.status || 'error',
    message: err.message,
    stack: config.nodeEnv === 'production' ? null : err.stack,
  });
});

module.exports = app; 