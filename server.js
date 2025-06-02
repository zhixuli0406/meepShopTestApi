// server.js
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config');
const { Server } = require('socket.io');

connectDB();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

// Placeholder for where src/sockets/index.js will be initialized
// const initializeSocketHandlers = require('./src/sockets');
// initializeSocketHandlers(io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Example: join a room based on userId or a general room
  // socket.join('some-room');

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });

  // More specific event handlers will be in src/sockets/message.handler.js etc.
  // and orchestrated by src/sockets/index.js
});

const PORT = config.port || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`Base URL: http://localhost:${PORT}`);
});

process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`, err);
  // httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`, err);
  // httpServer.close(() => process.exit(1));
}); 