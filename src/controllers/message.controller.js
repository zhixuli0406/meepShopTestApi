const messageService = require('../services/message.service');
const conversationService = require('../services/conversation.service');
const Conversation = require('../models/conversation.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createMessage = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  const { type, content } = req.body;
  const currentUser = req.user;

  if (!type || !content) {
    return next(new AppError('Message type and content are required.', 400));
  }

  let conversation = await Conversation.findById(conversationId).populate('participants', 'username avatar _id legacyUserId');
  if (!conversation) {
    return next(new AppError('Conversation not found.', 404));
  }

  const io = req.app.get('socketio');
  let systemMessageInstance = null;

  const isParticipant = conversation.participants.some(p => p._id.equals(currentUser.id));

  if (!isParticipant) {
    const updatedConversation = await conversationService.addUserToConversation(conversationId, currentUser.id);
    if (!updatedConversation) {
        return next(new AppError('Failed to add user to conversation.', 500));
    }
    conversation.participants = updatedConversation.participants;

    const systemMessageContent = 'User ' + currentUser.username + ' has joined the conversation.';
    systemMessageInstance = await messageService.createSystemMessage(conversationId, systemMessageContent);
    
    if (io && systemMessageInstance) {
      io.to(conversationId).emit('newMessage', systemMessageInstance);
      io.to(conversationId).emit('participantsUpdated', { 
        conversationId, 
        participants: conversation.participants 
      });
    }
  }

  const userMessageData = { 
    conversationId, 
    senderId: currentUser.id, 
    type, 
    content 
  };
  const userMessageInstance = await messageService.createMessage(userMessageData);

  if (io && userMessageInstance) {
    io.to(conversationId).emit('newMessage', userMessageInstance);
    
    conversation.participants.forEach(participant => {
      io.to(participant._id.toString()).emit('updateConversationList', { 
        conversationId: conversation._id, 
        lastMessage: userMessageInstance 
      });
    });
  } else if (!io) {
    console.warn("Socket.IO instance not available in message controller.");
  }
  
  res.status(201).json({
    status: 'success',
    data: {
      message: userMessageInstance,
      ...(systemMessageInstance && { systemMessage: systemMessageInstance })
    },
  });
});

exports.getMessages = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  // const userId = req.user.id; // Removed: No longer needed for auth check here

  if (!conversationId) {
    throw new AppError('Conversation ID is required as a route parameter.', 400);
  }

  // Removed user authorization check for this public endpoint
  // await conversationService.getConversationById(conversationId, userId);
  
  const queryOptions = {
    page: req.query.page,       
    limit: req.query.limit,      
    sortBy: req.query.sortBy,    
  };

  // Pass only conversationId and queryOptions to the service
  const result = await messageService.getMessagesByConversation(conversationId, queryOptions);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

exports.reactToMessage = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const { reactionType, action } = req.body;
  const userId = req.user.id; // Assuming user is authenticated via `protect` middleware

  if (!reactionType || !action) {
    return next(new AppError('Reaction type and action are required.', 400));
  }

  const updatedMessageReactions = await messageService.updateMessageReaction(
    messageId,
    userId,
    reactionType,
    action
  );

  // Emit socket event to the conversation room
  const io = req.app.get('socketio');
  if (io && updatedMessageReactions && updatedMessageReactions.conversationId) {
    io.to(updatedMessageReactions.conversationId.toString()).emit('messageReactionUpdated', {
      messageId: updatedMessageReactions._id,
      reactions: updatedMessageReactions.reactions,
    });
  } else if (!io) {
    console.warn("Socket.IO instance not available in message controller for reaction update.");
  } else if (!updatedMessageReactions || !updatedMessageReactions.conversationId) {
    console.warn("Failed to get conversationId from updatedMessageReactions for socket emission.");
  }

  res.status(200).json({
    status: 'success',
    data: {
      messageId: updatedMessageReactions._id,
      reactions: updatedMessageReactions.reactions,
    },
  });
}); 