const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const errorHandler = require('./middlewares/errorHandler'); // Import the error handler
// We will add routes here later
const userRoutes = require('./api/userRoutes');
const conversationRoutes = require('./api/conversationRoutes');
const messageRoutes = require('./api/messageRoutes');
const uploadRoutes = require('./api/uploadRoutes');

const app = new Koa();

app.proxy = true; // <<<<<<<<<< 新增此行

// Apply error handler middleware AT THE TOP
app.use(errorHandler);

// Middlewares
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser()); // Parse request bodies

// Middleware to log every request
app.use(async (ctx, next) => {
    console.log(`[TEMP APP LOG] Request received: ${ctx.method} ${ctx.url}`);
    try {
        await next();
        console.log(`[TEMP APP LOG] Request finished for: ${ctx.method} ${ctx.url} with status ${ctx.status}`);
    } catch (err) {
        console.error(`[TEMP APP LOG] Error in request pipeline for ${ctx.method} ${ctx.url}:`, err);
        ctx.status = 500;
        ctx.body = 'Temporary Internal Server Error';
        // Make sure to re-throw or emit if you want app.on('error') to catch it for middleware errors
        // For now, we log it here directly.
    }
});

// Simple route for GET /
app.use(async (ctx) => {
    if (ctx.method === 'GET' && ctx.path === '/') {
        console.log('[TEMP APP LOG] Handling GET /');
        ctx.body = 'Hello from Koa root!';
        // No error, should return 200
    } else {
        // For any other path during this test, return 404
        // This will also include /socket.io/ paths if Nginx forwards them here
        console.log(`[TEMP APP LOG] Path ${ctx.method} ${ctx.path} not specifically handled by simple router, Socket.IO should handle its own path if configured correctly with Nginx.`);
        // Let Koa handle non-matched routes, which will typically result in a 404 if no other middleware handles it.
        // We don't explicitly set 404 here to see default Koa behavior or if other middleware (like a router further down if we had one) would pick it up.
        // For socket.io, its own internal router should handle /socket.io/ requests if Nginx is proxying correctly to the Socket.IO server instance (not just the Koa app).
        // However, since Nginx error shows GET /, we focus on that.
    }
});

// API Routes - to be uncommented and implemented later
app.use(userRoutes.routes()).use(userRoutes.allowedMethods());
app.use(conversationRoutes.routes()).use(conversationRoutes.allowedMethods());
app.use(messageRoutes.routes()).use(messageRoutes.allowedMethods());
app.use(uploadRoutes.routes()).use(uploadRoutes.allowedMethods());

app.on('error', (err, ctx) => {
    console.error('KOA APP ERROR --- START');
    console.error('Error Message:', err.message);
    console.error('Error Stack:', err.stack);
    console.error('Error Properties:', JSON.stringify(err, Object.getOwnPropertyNames(err).filter(key => key !== 'stack'), 2));
    if (ctx) {
        console.error('Error Context (ctx.state):', JSON.stringify(ctx.state, null, 2));
        console.error('Error Context (ctx.request.headers):', JSON.stringify(ctx.request.headers, null, 2));
        console.error('Error Context (ctx.request.method):', ctx.request.method);
        console.error('Error Context (ctx.request.url):', ctx.request.url);
    }
    console.error('KOA APP ERROR --- END');
    // Potentially send a generic error response to the client
    // ctx.status = err.status || 500;
    // ctx.body = 'Internal Server Error';
});

module.exports = app; 