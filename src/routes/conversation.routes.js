// src/routes/conversation.routes.js
const express = require('express');
const conversationController = require('../controllers/conversation.controller');
const messageController = require('../controllers/message.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(conversationController.createConversation)
  .get(conversationController.getMyConversations);

router.route('/:conversationId')
  .get(conversationController.getConversationById);

// API Spec: POST /conversations/:id/messages/create
// Changed to /:conversationId/messages to align with RESTful practices for creating a sub-resource.
// The controller `messageController.createMessage` handles this.
router.post('/:conversationId/messages', messageController.createMessage); 

module.exports = router; 