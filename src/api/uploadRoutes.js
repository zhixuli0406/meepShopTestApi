const Router = require('koa-router');
const uploadController = require('../controllers/uploadController');
// Potentially, add authentication middleware here if only logged-in users can get signed URLs
// const { ensureAuthenticated } = require('../middlewares/authMiddleware');

const router = new Router();

// Route to generate a pre-signed URL for S3 uploads
// Example of how authentication middleware could be used:
// router.post('/uploads/generate-signed-url', ensureAuthenticated, uploadController.generateSignedUrl);
router.post('/uploads/generate-signed-url', uploadController.generateSignedUrl);

module.exports = router; 