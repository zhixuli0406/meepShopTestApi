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

exports.updateUserAvatar = async (ctx) => {
  try {
    // Validate URL parameters
    const { error: paramsError, value: paramsValue } = userIdParamsSchema.validate(ctx.params);
    if (paramsError) {
      paramsError.status = 400;
      throw paramsError;
    }
    const { userId } = paramsValue;

    // Validate request body
    const { error: bodyError, value: bodyValue } = updateUserAvatarBodySchema.validate(ctx.request.body);
    if (bodyError) {
      bodyError.status = 400;
      throw bodyError;
    }
    const { avatarUrl, s3Key } = bodyValue;

    const user = await User.findById(userId);
    if (!user) {
      const notFoundError = new Error('User not found.');
      notFoundError.status = 404;
      notFoundError.errorCode = 'USER_NOT_FOUND';
      throw notFoundError;
    }

    // If user already has an avatar and it's different from the new one, delete the old one from S3
    if (user.avatarS3Key && user.avatarS3Key !== s3Key) {
      try {
        await s3Service.deleteFile(user.avatarS3Key);
      } catch (s3DeleteError) {
        // Log the error, but don't necessarily fail the entire avatar update operation
        // if deleting the old file fails. Or, decide on a stricter error handling.
        console.error(`Failed to delete old avatar ${user.avatarS3Key} from S3:`, s3DeleteError);
        // Potentially, you could add a retry mechanism or flag for cleanup later.
      }
    }

    user.avatar = avatarUrl;
    user.avatarS3Key = s3Key;
    await user.save();

    ctx.status = 200;
    ctx.body = {
      status: 'success',
      message: 'User avatar updated successfully.',
      data: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        avatarS3Key: user.avatarS3Key,
        createdAt: user.createdAt
      }
    };

  } catch (error) {
    // Let the central errorHandler handle it
    throw error;
  }
}; 

module.exports = {
    createUser
}; 