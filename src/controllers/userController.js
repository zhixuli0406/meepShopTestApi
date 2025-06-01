const User = require('../models/user');
const { createUserSchema } = require('../validators/userValidators'); // Import Joi schema

exports.createUser = async (ctx) => {
  try {
    // Validate request body using Joi schema
    const { error, value } = createUserSchema.validate(ctx.request.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove any fields not defined in the schema
    });

    if (error) {
      // Throw the Joi error object directly. Our errorHandler middleware will catch and format it.
      // Joi errors have an 'isJoi' property which the errorHandler can use.
      error.status = 400; // Set a status for Joi validation errors
      throw error;
    }

    const { username, avatar } = value; // Use validated and potentially sanitized values

    // Check if user already exists (moved after validation)
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      ctx.status = 409; // Conflict
      // For specific business logic errors like this, we can still format it directly
      // or throw a custom error that the errorHandler can recognize.
      // Throwing a custom error is often cleaner.
      const conflictError = new Error('Username already exists.');
      conflictError.status = 409;
      conflictError.errorCode = 'USERNAME_TAKEN';
      throw conflictError;
    }

    const newUser = new User({
      username,
      // If avatar is an empty string or null from validation, mongoose default will apply
      avatar: avatar === null || avatar === '' ? undefined : avatar 
    });

    await newUser.save(); // This can also throw Mongoose validation errors or DB errors

    ctx.status = 201; // Created
    ctx.body = {
      status: 'success',
      data: {
        _id: newUser._id,
        username: newUser.username,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt
      }
    };

  } catch (err) {
    // If the error is not already handled and thrown by Joi or our custom conflictError,
    // or a Mongoose error, it will be passed to the errorHandler.
    // The errorHandler will set the status and format the body.
    // We just need to ensure it's re-thrown if not specifically handled here.
    
    // If the error was thrown by Joi validation or our custom conflictError, 
    // it would have already been thrown and caught by the errorHandler if this controller 
    // is wrapped in the try/catch of the errorHandler (which it is via app.use).
    // So, this catch block will primarily handle database errors from newUser.save()
    // or other unexpected errors within this try block after validation.

    // Let the central errorHandler handle it.
    // The errorHandler will check for err.status, err.name (e.g., 'ValidationError'), err.code (e.g. 11000 for duplicate key from Mongoose)
    throw err; 
  }
}; 