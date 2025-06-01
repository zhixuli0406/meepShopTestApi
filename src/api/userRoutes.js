const Router = require('koa-router');
const userController = require('../controllers/userController');

const router = new Router();

// Define user routes
router.post('/users', userController.createUser);

// Future user routes can be added here, e.g.:
// router.get('/users', userController.getAllUsers);
// router.get('/users/:userId', userController.getUserById);

module.exports = router; 