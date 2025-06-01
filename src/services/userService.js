const User = require('../models/user');

const getUserById = async (userId) => {
    try {
        // Use .lean() for a plain JavaScript object and .select() to pick specific fields
        const user = await User.findById(userId).select('username avatar').lean();
        if (!user) {
            console.warn(`[UserService] User not found for ID: ${userId}`);
            return null;
        }
        // Ensure _id is converted to userId string for consistency
        return { userId: user._id.toString(), username: user.username, avatar: user.avatar };
    } catch (error) {
        console.error(`[UserService] Error fetching user by ID ${userId}:`, error);
        // Depending on desired error handling, you might throw the error or return null
        // For socket operations, returning null and logging might be safer to prevent crashes
        return null; 
    }
};

module.exports = {
    getUserById,
}; 