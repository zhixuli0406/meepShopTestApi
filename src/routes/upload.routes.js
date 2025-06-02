const express = require('express');
const uploadController = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/presigned-url', uploadController.generatePresignedS3Url);

module.exports = router; 