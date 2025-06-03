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
const userRoutes = require('./src/routes/user.routes');

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
app.use(`${apiBasePath}/users`, userRoutes);

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500; // Prefer err.statusCode
  if (res.statusCode !== 200 && res.statusCode >= 400) { // If res.statusCode was already set to an error by a previous middleware
      statusCode = res.statusCode;
  }

  console.error('ERROR 💥', err); // Log the full error object
  
  res.status(statusCode).json({
    status: err.status || (statusCode >= 500 ? 'error' : 'fail'), // Use err.status, or derive from statusCode
    message: err.message || 'An unexpected error occurred',
    stack: config.nodeEnv === 'production' ? null : err.stack, // Only send stack in dev
  });
});

module.exports = app; 