const User = require('../models/user');
const { createUserSchema } = require('../validators/userValidators');
const { userIdParamsSchema, updateUserAvatarBodySchema } = require('../validators/userValidators'); // Import Joi schema
const s3Service = require('../services/s3Service'); // Import s3Service

const createUser = async (ctx) => {
    try {
        // Validate request body
        const validatedData = await createUserSchema.validateAsync(ctx.request.body);

        const { username, avatar } = validatedData;

        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            ctx.status = 409; // Conflict
            ctx.body = {
                status: 'fail',
                message: '使用者名稱已存在。',
                errorCode: 'USERNAME_TAKEN'
            };
            return;
        }

        const newUser = new User({ username, avatar });
        await newUser.save();

        ctx.status = 201; // Created
        ctx.body = {
            status: 'success',
            data: newUser
        };
    } catch (err) {
        if (err.isJoi) {
            // Let the global error handler manage Joi validation errors
            // It will provide a 400 status and formatted details
            throw err;
        }
        // For other errors, like database errors not caught by USERNAME_TAKEN check
        // or unexpected errors, let the global error handler manage them as well.
        // Log the error for server-side inspection
        console.error('Error creating user:', err);
        // Rethrow to be caught by the global error handler, which will send a 500 response
        throw err; 
    }
};

const updateUserAvatar = async (ctx) => {
    // This is a placeholder implementation.
    // We will add Joi validation and full logic later.
    // For now, just ensure the route can be registered.
    // TODO: Validate ctx.params.userId
    // TODO: Validate ctx.request.body (avatarUrl, s3Key)
    // TODO: Find user by userId
    // TODO: Update user's avatar and avatarS3Key fields
    // TODO: Optionally delete old avatar from S3
    // TODO: Respond with updated user data or success message

    ctx.status = 200;
    ctx.body = {
        status: 'success',
        message: `Placeholder for updating avatar for user ${ctx.params.userId}`,
        data: {
            userId: ctx.params.userId,
            receivedBody: ctx.request.body
        }
    };
};

module.exports = {
    createUser,
    updateUserAvatar
}; 