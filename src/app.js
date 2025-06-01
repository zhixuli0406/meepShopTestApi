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

// API Routes - to be uncommented and implemented later
app.use(userRoutes.routes()).use(userRoutes.allowedMethods());
app.use(conversationRoutes.routes()).use(conversationRoutes.allowedMethods());
app.use(messageRoutes.routes()).use(messageRoutes.allowedMethods());
app.use(uploadRoutes.routes()).use(uploadRoutes.allowedMethods());

// Basic error handling (can be improved)
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