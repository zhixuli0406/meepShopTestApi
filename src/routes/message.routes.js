// src/routes/message.routes.js
const express = require('express');
const messageController = require('../controllers/message.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', messageController.getMessages);

module.exports = router; 