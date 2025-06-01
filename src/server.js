console.log("Application starting..."); // Log 1
require('dotenv').config(); // Load environment variables at the very beginning
console.log("dotenv configured."); // Log 2
const http = require('http');
const { Server } = require("socket.io");

const app = require('./app'); // Koa app
console.log("Koa app required."); // Log 3
const connectDB = require('./database');
const initializeSocketIO = require('./socketManager'); // We will create this file next
const { loadInitialData } = require('./initialLoad'); // We will create this file later

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    console.log("startServer function called."); // Log 4
    try {
        await connectDB(); // Connect to MongoDB
        console.log("Database connected."); // Log 5

        // Create HTTP server from Koa app
        const httpServer = http.createServer(app.callback());
        console.log("HTTP server created."); // Log 6

        // Initialize Socket.IO
        const io = new Server(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL || "*", // Configure allowed origins
                methods: ["GET", "POST"]
            }
        });
        console.log("Socket.IO server instance created."); // Log 7
        initializeSocketIO(io); // Setup Socket.IO event handlers
        console.log("initializeSocketIO called."); // Log 8

        // Make io instance available in Koa context (ctx.io)
        app.context.io = io;

        httpServer.listen(PORT, () => {
            console.log(`HTTP Server running on port ${PORT}`); // Log 9
            console.log(`WebSocket Server initialized and listening on port ${PORT}`); // Log 10
        });

        // Perform initial data load if necessary
        // We need to define the condition for this (e.g., check if data already exists)
        if (process.env.LOAD_INITIAL_DATA === 'true') { // Example condition
             await loadInitialData();
        }

    } catch (error) {
        console.error("Failed to start server in catch block:", error); // Log Error
        process.exit(1);
    }
};

startServer(); 