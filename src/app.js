console.log("<<<<< EXECUTING SIMPLIFIED src/app.js - VERSION " + Date.now() + " >>>>>");
// src/app.js (Step 2 Complete)
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

app.proxy = true;

// Restore bodyParser and cors here, before the temp logger
app.use(cors());
app.use(bodyParser());

// Middleware to log every request (our temporary logger)
app.use(async (ctx, next) => {
    console.log(`[TEMP APP LOG] Request received: ${ctx.method} ${ctx.url}`);
    try {
        await next();
        console.log(`[TEMP APP LOG] Request finished for: ${ctx.method} ${ctx.url} with status ${ctx.status}`);
    } catch (err) {
        console.error(`[TEMP APP LOG] Error in request pipeline for ${ctx.method} ${ctx.url}:`, err.stack || err);
        throw err; // Re-throw for centralized error handlers
    }
});

// Simple route for GET / (our temporary route)
app.use(async (ctx, next) => {
    if (ctx.method === 'GET' && ctx.path === '/') {
        console.log('[TEMP APP LOG] Handling GET /');
        ctx.body = 'Hello from Koa root! (Step 2)';
        return; 
    }
    await next();
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