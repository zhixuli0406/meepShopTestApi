const messageService = require('../services/message.service');
const conversationService = require('../services/conversation.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createMessage = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params; // Assuming route is /conversations/:conversationId/messages
  const { type, content } = req.body;
  const senderId = req.user.id;

  // Verify user is part of the conversation
  // This also populates conversation which can be useful
  const conversation = await conversationService.getConversationById(conversationId, senderId);
  // conversationService.getConversationById will throw AppError if not found or user not participant

  const messageData = { conversationId, senderId, type, content };
  const newMessage = await messageService.createMessage(messageData);

  // Emit message via Socket.IO
  const io = req.app.get('socketio');
  if (io) {
      // Emit to all participants in the conversation room
      // conversation.participants.forEach(participant => {
      //   if (participant._id.toString() !== senderId.toString()) { // Don't send to self if handled by client
      //     // This requires mapping user._id to socket.id if you want to send to specific sockets
      //   }
      // });
      // A simpler approach is to have clients join rooms named after conversationId
      io.to(conversationId).emit('newMessage', newMessage);
      // Also update conversation list for participants if they are on a page showing that
      // This might require a different event or for clients to refetch
      conversation.participants.forEach(participant => {
        io.to(participant._id.toString()).emit('updateConversationList', { conversationId: conversation._id, lastMessage: newMessage });
      });

  } else {
      console.warn("Socket.IO instance not available in message controller for emitting 'newMessage'");
  }

  res.status(201).json({
    status: 'success',
    data: {
      message: newMessage,
    },
  });
});

exports.getMessages = catchAsync(async (req, res, next) => {
  // API spec: /messages?conversationId={id}
  const { conversationId } = req.query; 
  const userId = req.user.id;

  if (!conversationId) {
    throw new AppError('Conversation ID is required as a query parameter.', 400);
  }

  // Verify user is part of the conversation before fetching messages
  await conversationService.getConversationById(conversationId, userId);
  // conversationService.getConversationById will throw if not found or user not participant
  
  const queryOptions = {
    page: req.query.page,
    limit: req.query.limit,
    sortBy: req.query.sortBy, 
  };

  const result = await messageService.getMessagesByConversation(conversationId, userId, queryOptions);

  res.status(200).json({
    status: 'success',
    // results: result.messages.length, // result itself contains totalMessages and messages array
    data: result,
  });
}); 