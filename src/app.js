// src/app.js (Final Version for now)
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const Router = require('koa-router');
const errorHandler = require('./middlewares/errorHandler');
const userRoutes = require('./api/userRoutes');
const conversationRoutes = require('./api/conversationRoutes');
const messageRoutes = require('./api/messageRoutes');
const uploadRoutes = require('./api/uploadRoutes');

const app = new Koa();

app.proxy = true;

// Error handler should be the first middleware
app.use(errorHandler);

// Request Logger Middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  console.log(`[RequestLogger] Started: ${ctx.method} ${ctx.path} from ${ctx.ip} - Request ID: ${ctx.state.requestId}`);
  try {
    await next();
  } finally {
    const ms = Date.now() - start;
    console.log(`[RequestLogger] Finished: ${ctx.method} ${ctx.path} - Status: ${ctx.status} - Duration: ${ms}ms - Request ID: ${ctx.state.requestId}`);
  }
});

// General middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Be more specific in production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
})); 
app.use(bodyParser()); 

// Simple Root Router
const rootRouter = new Router();
rootRouter.get('/', (ctx) => {
  console.log('[RootRoute] GET / requested. Responding with simple message.');
  ctx.status = 200;
  ctx.body = { 
    message: 'Hello from Koa API root!',
    timestamp: new Date().toISOString(),
    status: 'ok'
  };
});
app.use(rootRouter.routes()).use(rootRouter.allowedMethods());

// API Routes
app.use(userRoutes.routes()).use(userRoutes.allowedMethods());
app.use(conversationRoutes.routes()).use(conversationRoutes.allowedMethods());
app.use(messageRoutes.routes()).use(messageRoutes.allowedMethods());
app.use(uploadRoutes.routes()).use(uploadRoutes.allowedMethods());

// Your detailed app.on('error') logger
app.on('error', (err, ctx) => {
    console.error('<<<<< KOA APP ERROR >>>>>');
    console.error('Error object:', err);
    if (ctx) {
        console.error('Error context path:', ctx.path);
        console.error('Error context method:', ctx.method);
        // Avoid sending error details to client here if errorHandler middleware already does
    }
    // Consider logging more context or sending to an error tracking service
});

module.exports = app; 