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
  
  const conversation = await conversationService.createConversation(userId, participantIds, title);
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