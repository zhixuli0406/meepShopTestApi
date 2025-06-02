// server.js
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config');
const { Server } = require('socket.io');
const initializeSocketHandlers = require('./src/sockets'); // Import the handler initializer
const seedDatabase = require('./src/utils/seedDatabase'); // Import the seeder

// connectDB(); // Call connectDB and then seed

const startServer = async () => {
  await connectDB(); // Ensure DB is connected before attempting to seed or start server
  await seedDatabase(); // Seed the database if necessary

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"]
    }
  });

  app.set('socketio', io);

  // Initialize Socket.IO event handlers
  initializeSocketHandlers(io);

  // This basic io.on connection is now handled within initializeSocketHandlers
  // io.on('connection', (socket) => {
  //   console.log(`Socket connected: ${socket.id}`);
  //   socket.on('disconnect', () => {
  //     console.log(`Socket disconnected: ${socket.id}`);
  //   });
  // });

  const PORT = config.port || 3001;

  httpServer.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
    console.log(`Base URL: http://localhost:${PORT}`);
  });
};

startServer().catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
});

process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`, err);
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`, err);
});