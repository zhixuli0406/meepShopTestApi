const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.register = catchAsync(async (req, res, next) => {
  const { username, password, passwordConfirm, avatar, legacyUserId } = req.body;

  if (password !== passwordConfirm) {
     throw new AppError('Passwords do not match.', 400);
  }
  
  const newUser = await userService.registerUser({ username, password, avatar, legacyUserId });
  userService.createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await userService.loginUser(username, password);
  userService.createSendToken(user, 200, res);
});

exports.getMe = catchAsync(async (req, res, next) => {
  // req.user is populated by the 'protect' middleware
  // The protect middleware already fetches and verifies the user.
  // So, req.user should be the up-to-date user document.
  // No need to call userService.getUserById(req.user.id) again unless you need fresh population or specific fields.
  
  // Make sure password is not sent, even if 'protect' middleware might not remove it.
  const userToSend = { ...req.user._doc }; // Shallow copy mongoose document
  delete userToSend.password;
  // If legacyUserId is sensitive or not needed by client for /me, remove it too.
  // delete userToSend.legacyUserId; 

  res.status(200).json({
    status: 'success',
    data: {
      user: userToSend,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // User ID comes from req.user set by the 'protect' middleware
  const userId = req.user.id;

  // Filter request body to only include allowed fields for update by user themselves
  const filteredBody = {};
  if (req.body.username) filteredBody.username = req.body.username;
  if (req.body.avatar) filteredBody.avatar = req.body.avatar;
  // Do NOT allow password updates via this route for security reasons.
  // Password updates should have a dedicated flow (e.g., /updateMyPassword).
  // Email is not in the User model currently.

  if (Object.keys(filteredBody).length === 0) {
    return next(new AppError('Please provide at least one field to update (username or avatar).', 400));
  }

  const updatedUser = await userService.updateUserProfile(userId, filteredBody);

  // userService.updateUserProfile should return the user document without the password
  // If it does, and you want to be absolutely sure, you can do:
  // const userToSend = { ...updatedUser._doc };
  // delete userToSend.password;

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser, // Assuming updateUserProfile returns user without password
    },
  });
}); 