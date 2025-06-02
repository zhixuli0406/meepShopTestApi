const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// exports.updateMe = catchAsync(async (req, res, next) => { ... }); // This method is removed

exports.listAllUsers = catchAsync(async (req, res, next) => {
  const users = await userService.getAllUsers();

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

// If other user-specific controller functions are added later, they would go here. 