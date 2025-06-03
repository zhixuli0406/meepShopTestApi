// src/controllers/conversation.controller.js
const conversationService = require('../services/conversation.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createConversation = catchAsync(async (req, res, next) => {
  const { participantIds, title } = req.body; 
  const userId = req.user.id;

  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    throw new AppError('Please provide a non-empty array of participant IDs.', 400);
  }
  
  const { conversation, systemMessage } = await conversationService.createConversation(userId, participantIds, title);

  const io = req.app.get('socketio');
  if (io && systemMessage && conversation) {
    console.log(`[Controller:createConversation] Emitting 'newMessage' for system message ${systemMessage._id} to room ${conversation._id}`);
    io.to(conversation._id.toString()).emit('newMessage', systemMessage);
    
    // Optionally, if this new conversation should immediately appear in participants' lists
    // (even before any user message), you might want to emit 'updateConversationList' here as well.
    // For now, let's assume the client handles adding the new conversation upon receiving it via REST
    // or upon the first user message in it. Or, if it's a direct join, the client might already know.
  } else if (!io) {
    console.warn("[Controller:createConversation] Socket.IO instance not available.");
  } else if (!systemMessage) {
    console.warn("[Controller:createConversation] No system message was created or returned by the service.");
  }

  res.status(201).json({
    status: 'success',
    data: {
      conversation,
    },
  });
});

exports.listAllConversations = catchAsync(async (req, res, next) => {
  const conversations = await conversationService.getAllConversations();
  res.status(200).json({
    status: 'success',
    results: conversations.length,
    data: {
      conversations,
    },
  });
});

exports.getConversationById = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  const userId = req.user.id; 

  const conversation = await conversationService.getConversationById(conversationId, userId);
  
  // Service layer handles the AppError if not found or not authorized.
  // No need to re-check for !conversation here if service does it.

  res.status(200).json({
    status: 'success',
    data: {
      conversation,
    },
  });
}); 