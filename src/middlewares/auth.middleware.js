const jwt = require('jsonwebtoken');
const config = require('../../config');
const User = require('../models/user.model');
const AppError = require('../utils/appError');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid token. Please log in again.', 401));
      }
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Your token has expired! Please log in again.', 401));
      }
      return next(err);
    }
    
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      );
    }

    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
}; 