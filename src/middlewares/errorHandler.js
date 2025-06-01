module.exports = async (ctx, next) => {
  try {
    await next();

    // Handle cases where no route was matched (Koa default is 404 without a body)
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404; // Ensure status is set before body
      ctx.body = {
        status: 'fail',
        message: 'The requested resource was not found on this server.',
        errorCode: 'NOT_FOUND'
      };
    }

  } catch (err) {
    console.error('Error caught by errorHandler middleware:', err.stack || err);

    ctx.status = err.statusCode || err.status || 500;
    
    const responseBody = {
      status: ctx.status >= 500 ? 'error' : 'fail',
      message: err.message || 'An error occurred.',
    };

    if (err.expose) {
      responseBody.message = err.message;
    } else if (ctx.status >= 500) {
      responseBody.message = 'An unexpected internal server error occurred. Please try again later.';
    } else if (ctx.status < 500 && ctx.status !== 404) { 
      responseBody.message = err.message || 'A client-side error occurred.';
    }

    // Specific error type handling
    if (err.isJoi) {
        responseBody.message = 'Input validation failed.';
        responseBody.errorCode = 'VALIDATION_ERROR';
        responseBody.details = err.details.map(d => ({
            message: d.message.replace(/\"|\'/g, ''),
            field: d.path.join('.'),
        }));
        ctx.status = 400;
        responseBody.status = 'fail';
    } else if (err.name === 'ValidationError' && err.errors) {
      responseBody.message = 'One or more fields failed validation.';
      responseBody.errorCode = 'VALIDATION_ERROR';
      responseBody.details = Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      ctx.status = 400;
      responseBody.status = 'fail';
    } else if (err.name === 'CastError' && err.path && err.kind) {
        responseBody.message = `Invalid format for field '${err.path}'. Expected a ${err.kind}.`;
        responseBody.errorCode = 'INVALID_FORMAT';
        responseBody.details = { field: err.path, expected: err.kind, received: String(err.value) };
        ctx.status = 400;
        responseBody.status = 'fail';
    } else if (err.code === 11000) {
        responseBody.message = 'A record with the provided unique field(s) already exists.';
        responseBody.errorCode = 'DUPLICATE_KEY';
        const fieldMatch = err.message.match(/index: (\w+)_1/);
        if (fieldMatch && fieldMatch[1]) {
            responseBody.details = { field: fieldMatch[1] };
        }
        ctx.status = 409;
        responseBody.status = 'fail';
    }

    if (err.errorCode && !responseBody.errorCode) {
      responseBody.errorCode = err.errorCode;
    }
    if (err.details && !responseBody.details) {
      responseBody.details = err.details;
    }
    
    if (responseBody.errorCode === 'VALIDATION_ERROR' || responseBody.errorCode === 'INVALID_FORMAT') {
        ctx.status = 400;
        responseBody.status = 'fail';
    } else if (responseBody.errorCode === 'DUPLICATE_KEY') {
        ctx.status = 409;
        responseBody.status = 'fail';
    }

    ctx.body = responseBody;

  }
}; 