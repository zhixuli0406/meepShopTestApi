const Router = require('koa-router');
const messageController = require('../controllers/messageController');
// Multer is no longer needed for the createMessageInConversation route directly
// const multer = require('@koa/multer'); 
// const upload = multer(); 

const router = new Router();

// Potentially, middleware for authentication/authorization can be added here
// ... existing code ...
router.get('/conversations/:conversationId/messages', messageController.getMessagesForConversation);

// Future routes for messages can be added here, e.g.:
// router.post('/conversations/:conversationId/messages', ensureAuthenticated, isParticipant, messageController.createMessageInConversation);

// Route to create a new message in a specific conversation
// Multer middleware is removed as file upload is handled via pre-signed URL flow
router.post(
  '/conversations/:conversationId/messages',
  // upload.single('imageFile'), // REMOVED: Multer middleware no longer needed here
  messageController.createMessageInConversation
);

module.exports = router; 