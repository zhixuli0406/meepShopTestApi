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