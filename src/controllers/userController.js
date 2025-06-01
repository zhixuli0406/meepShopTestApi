const User = require('../models/user');
const {
    createUserSchema,
    userIdParamsSchema,
    updateUserAvatarBodySchema
} = require('../validators/userValidators');
const s3Service = require('../services/s3Service'); // Assuming s3Service has a deleteFile method

const createUser = async (ctx) => {
    try {
        const validatedData = await createUserSchema.validateAsync(ctx.request.body);
        const { username, avatar } = validatedData;

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            ctx.status = 409;
            ctx.body = {
                status: 'fail',
                message: '使用者名稱已存在。',
                errorCode: 'USERNAME_TAKEN'
            };
            return;
        }

        const newUser = new User({ username, avatar });
        await newUser.save();

        ctx.status = 201;
        ctx.body = {
            status: 'success',
            data: newUser
        };
    } catch (err) {
        if (err.isJoi) {
            throw err; // Handled by global errorHandler
        }
        console.error('Error creating user:', err);
        throw err; // Handled by global errorHandler
    }
};

const updateUserAvatar = async (ctx) => {
    try {
        // 1. Validate URL parameters (userId)
        const { userId } = await userIdParamsSchema.validateAsync(ctx.params);

        // 2. Validate request body (avatarUrl, s3Key)
        const { avatarUrl, s3Key } = await updateUserAvatarBodySchema.validateAsync(ctx.request.body);

        // 3. Find user by userId
        const user = await User.findById(userId);
        if (!user) {
            ctx.status = 404;
            ctx.body = {
                status: 'fail',
                message: '找不到指定的使用者。',
                errorCode: 'USER_NOT_FOUND'
            };
            return;
        }

        // 4. (Optional but recommended) Delete old avatar from S3 if it exists and is different
        if (user.avatarS3Key && user.avatarS3Key !== s3Key) {
            try {
                await s3Service.deleteFile(user.avatarS3Key); 
                // Assuming s3Service.deleteFile exists and handles its own errors or throws them.
                // It should not throw if the file doesn't exist, or handle that gracefully.
            } catch (s3DeleteError) {
                console.error(`Failed to delete old S3 avatar ${user.avatarS3Key} for user ${userId}:`, s3DeleteError);
                // Decide if this error should halt the process or just be logged.
                // For now, we log it and continue, as updating the DB record is primary.
            }
        }

        // 5. Update user's avatar and avatarS3Key fields
        user.avatar = avatarUrl;
        user.avatarS3Key = s3Key; // Store the S3 key for future reference (e.g., deletion)
        user.updatedAt = Date.now(); // Manually update if timestamps:true is not in schema or to be explicit

        await user.save();

        // 6. Respond with updated user data or success message
        ctx.status = 200;
        ctx.body = {
            status: 'success',
            message: '使用者頭像更新成功。',
            data: user
        };

    } catch (err) {
        if (err.isJoi) {
            throw err; // Handled by global errorHandler
        }
        // For other errors (e.g., DB errors during save, or if findById fails unexpectedly)
        console.error(`Error updating avatar for user ${ctx.params.userId || 'unknown'}:`, err);
        throw err; // Handled by global errorHandler
    }
};

module.exports = {
    createUser,
    updateUserAvatar
}; 