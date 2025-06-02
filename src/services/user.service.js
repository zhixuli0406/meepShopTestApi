const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const AppError = require('../utils/appError');

const signToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

// This function is for direct use by controllers after service layer logic
exports.createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined; // Ensure password is not in the user object being sent

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.registerUser = async (userData) => {
  const { username, password, avatar, legacyUserId } = userData;

  if (!username || !password) {
    throw new AppError('Please provide username and password!', 400);
  }
  
  const existingUserByUsername = await User.findOne({ username });
  if (existingUserByUsername) {
    throw new AppError('Username already exists.', 409);
  }

  if (legacyUserId) {
    const existingUserByLegacyId = await User.findOne({ legacyUserId });
    if (existingUserByLegacyId) {
      throw new AppError(`Legacy User ID ${legacyUserId} already exists.`, 409);
    }
  }

  const newUser = await User.create({
    username,
    password,
    avatar,
    legacyUserId,
  });
  return newUser;
};

exports.loginUser = async (username, password) => {
  if (!username || !password) {
    throw new AppError('Please provide username and password!', 400);
  }

  const user = await User.findOne({ username }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Incorrect username or password', 401);
  }
  return user;
};

exports.getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('No user found with that ID', 404);
  }
  return user;
};

exports.findUserByLegacyId = async (legacyUserId) => {
    return await User.findOne({ legacyUserId });
};

exports.findOrCreateUserFromLegacy = async (legacyUserData) => {
    let user = await User.findOne({ legacyUserId: legacyUserData.userId });
    if (!user) {
        user = await User.create({
            legacyUserId: legacyUserData.userId,
            username: legacyUserData.user,
            avatar: legacyUserData.avatar,
        });
    }
    return user;
};

exports.updateUserProfile = async (userId, updateData) => {
  // Filter out fields that users are not allowed to update directly
  const allowedUpdates = {};
  if (updateData.username !== undefined) allowedUpdates.username = updateData.username;
  if (updateData.avatar !== undefined) allowedUpdates.avatar = updateData.avatar;
  // Add other fields here if they are allowed to be updated, e.g., bio, preferences etc.

  if (Object.keys(allowedUpdates).length === 0) {
    throw new AppError('No valid fields provided for update.', 400);
  }

  // If username is being updated, check for uniqueness if your business logic requires it
  if (allowedUpdates.username) {
    const existingUser = await User.findOne({ username: allowedUpdates.username });
    // Ensure the found user is not the current user if username is a unique field
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      throw new AppError('This username is already taken.', 409);
    }
  }

  const updatedUser = await User.findByIdAndUpdate(userId, allowedUpdates, {
    new: true, // Return the modified document rather than the original
    runValidators: true, // Ensure that schema validations are run
  });

  if (!updatedUser) {
    throw new AppError('No user found with that ID to update.', 404);
  }

  return updatedUser;
}; 