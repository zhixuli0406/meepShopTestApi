const Router = require('koa-router');
const conversationController = require('../controllers/conversationController');

const router = new Router();

// Prefix for all conversation routes if desired, e.g. router.prefix('/api/v1')

router.get('/conversations', conversationController.getAllConversations);
// Future routes for conversations can be added here:
router.post('/conversations', conversationController.createConversation);
// router.get('/conversations/:conversationId/messages', messageController.getMessagesForConversation);
// router.post('/conversations/:conversationId/messages', messageController.createMessageInConversation);

module.exports = router; 