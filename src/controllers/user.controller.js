const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.updateMe = catchAsync(async (req, res, next) => {
  // User ID comes from req.user set by the 'protect' middleware
  const userId = req.user.id;

  // Filter request body to only include allowed fields for update by user themselves
  // This is an additional layer of security/control on top of what service layer does.
  const filteredBody = {};
  if (req.body.username) filteredBody.username = req.body.username;
  if (req.body.avatar) filteredBody.avatar = req.body.avatar;
  // Do NOT allow password updates via this route for security reasons.
  // Password updates should have a dedicated flow (e.g., /updateMyPassword).

  if (Object.keys(filteredBody).length === 0) {
    return next(new AppError('Please provide at least one field to update (username or avatar).', 400));
  }

  const updatedUser = await userService.updateUserProfile(userId, filteredBody);

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
}); 