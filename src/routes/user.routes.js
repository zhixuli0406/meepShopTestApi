const express = require('express');
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management operations
 */

// All routes below are protected as they pertain to user-specific actions or data
router.use(protect);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get a list of all users (Protected)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 results: { type: integer, example: 5 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/UserResponse' } # Assuming UserResponse schema exists and excludes password
 *       401:
 *         description: Unauthorized (Missing or invalid token)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/', userController.listAllUsers);

// router.patch('/me', userController.updateMe); // This line and its JSDoc are removed

// Future user-related routes can be added here, e.g.:
// router.patch('/updateMyPassword', authController.updatePassword); // (Requires authController to have this method)
// router.delete('/deleteMe', userController.deleteMe); // (Requires userController to have this method)

module.exports = router; 