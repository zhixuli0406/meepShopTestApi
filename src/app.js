console.log("<<<<< EXECUTING SIMPLIFIED src/app.js - VERSION " + Date.now() + " >>>>>");
// src/app.js (Final Version for now)
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const errorHandler = require('./middlewares/errorHandler');
const userRoutes = require('./api/userRoutes');
const conversationRoutes = require('./api/conversationRoutes');
const messageRoutes = require('./api/messageRoutes');
const uploadRoutes = require('./api/uploadRoutes');

const app = new Koa();

app.proxy = true;

// Error handler should be the first middleware
app.use(errorHandler);

// General middlewares
app.use(cors()); 
app.use(bodyParser()); 

// API Routes
app.use(userRoutes.routes()).use(userRoutes.allowedMethods());
app.use(conversationRoutes.routes()).use(conversationRoutes.allowedMethods());
app.use(messageRoutes.routes()).use(messageRoutes.allowedMethods());
app.use(uploadRoutes.routes()).use(uploadRoutes.allowedMethods());

// Your detailed app.on('error') logger
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
});

module.exports = app; 