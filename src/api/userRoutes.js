const Router = require('koa-router');
const userController = require('../controllers/userController');

const router = new Router({ prefix: '/users' });

// POST /users - Create a new user
router.post('/', userController.createUser);

// PUT /users/:userId/avatar - Update user avatar
router.put('/:userId/avatar', userController.updateUserAvatar);

// TODO: Add more user-related routes here if needed
// e.g., GET /users/:userId - Get user profile
// e.g., PUT /users/:userId - Update user profile (other fields)

module.exports = router; 