// app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');

const app = express();

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to MeepShop Chat API!', status: 'OK' });
});

// Routes will be added here later
// Example: const authRoutes = require('./src/routes/auth.routes');
// app.use('/api/v1/auth', authRoutes);

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: config.nodeEnv === 'production' ? null : err.stack,
  });
});

module.exports = app; 