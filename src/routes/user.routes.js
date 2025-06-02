const express = require('express');
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes below are protected as they pertain to user-specific actions or data
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profile operations (Currently no specific user routes, see Auth for /me)
 */

// router.patch('/me', userController.updateMe); // This line and its JSDoc are removed

// Future user-related routes can be added here, e.g.:
// router.patch('/updateMyPassword', authController.updatePassword); // (Requires authController to have this method)
// router.delete('/deleteMe', userController.deleteMe); // (Requires userController to have this method)

module.exports = router; 