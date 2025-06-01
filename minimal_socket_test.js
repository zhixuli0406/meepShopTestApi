const http = require('http');
const { Server } = require('socket.io');

const httpServer = http.createServer((req, res) => {
    // 基本的 HTTP 伺服器，對於 Socket.IO 測試，這個處理函式可以很簡單
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Minimal HTTP Server for Socket.IO Test is running\n');
    } else {
        res.writeHead(404);
        res.end();
    }
});

const io = new Server(httpServer, {
    cors: {
        origin: "*", // 為了測試，暫時允許所有來源
        methods: ["GET", "POST"]
    },
    // path: '/socket.io', // 預設路徑
    // transports: ['websocket', 'polling'] // 預設
});

console.log('[MinimalTest] Socket.IO server instance created.');

io.on('connection', (socket) => {
    console.log(`[MinimalTest] SUCCESS! Client connected: ${socket.id}`);
    socket.conn.on('upgrade', () => {
        console.log(`[MinimalTest] Socket ${socket.id} transport upgraded to ${socket.conn.transport.name}`);
    });

    socket.emit('greeting', 'Hello from minimal Socket.IO server!');

    socket.on('client_event', (data) => {
        console.log(`[MinimalTest] Received client_event from ${socket.id}:`, data);
        socket.emit('server_response', { message: 'Received your event!', originalData: data });
    });

    socket.on('disconnect', (reason) => {
        console.log(`[MinimalTest] Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
        console.error(`[MinimalTest] Socket error for ${socket.id}:`, error);
    });
});

io.engine.on('connection_error', (err) => {
    console.error('[MinimalTest_Engine_Error] Socket.IO Engine Connection Error:', {
        code: err.code,
        message: err.message,
        context: err.context // HTTP request, if available
    });
});

const PORT = 3001; // 使用一個與主應用不同的埠，例如 3001
httpServer.listen(PORT, () => {
    console.log(`[MinimalTest] Minimal Socket.IO test server listening on port ${PORT}`);
});
