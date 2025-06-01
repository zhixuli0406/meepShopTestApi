require('dotenv').config(); // Load environment variables at the very beginning
const http = require('http');
const { Server } = require("socket.io");

const app = require('./app'); // Koa app
const connectDB = require('./database');
const initializeSocketIO = require('./socketManager'); // We will create this file next
const { loadInitialData } = require('./initialLoad'); // We will create this file later

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB(); // Connect to MongoDB

        // Create HTTP server from Koa app
        const httpServer = http.createServer(app.callback());

        // Initialize Socket.IO
        const io = new Server(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL || "*", // Configure allowed origins
                methods: ["GET", "POST"]
            }
        });
        initializeSocketIO(io); // Setup Socket.IO event handlers

        // Make io instance available in Koa context (ctx.io)
        app.context.io = io;

        httpServer.listen(PORT, () => {
            console.log(`HTTP Server running on port ${PORT}`);
            console.log(`WebSocket Server initialized and listening on port ${PORT}`);
        });

        // Perform initial data load if necessary
        // We need to define the condition for this (e.g., check if data already exists)
        if (process.env.LOAD_INITIAL_DATA === 'true') { // Example condition
             await loadInitialData();
        }

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer(); 