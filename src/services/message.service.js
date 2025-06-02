const Message = require('../models/message.model');
const ConversationService = require('./conversation.service'); 
const AppError = require('../utils/appError');

exports.createMessage = async (messageData) => {
  const { conversationId, senderId, type, content, legacyConvId, legacySenderId, reactions, timestamp } = messageData;

  if (!conversationId || !senderId || !type || !content) {
    throw new AppError('Missing required message fields (conversationId, senderId, type, content).', 400);
  }

  const message = await Message.create({
    conversationId,
    senderId,
    type,
    content,
    legacyConvId,     
    legacySenderId,   
    reactions,        
    createdAt: timestamp ? new Date(timestamp) : new Date(), 
  });

  const populatedMessage = await Message.findById(message._id)
    .populate({ path: 'senderId', select: 'username avatar legacyUserId _id' });

  if (populatedMessage) {
    await ConversationService.updateConversationLastMessage(conversationId, populatedMessage);
  }
  
  return populatedMessage;
};

exports.getMessagesByConversation = async (conversationId, queryOptions = {}) => {
  const page = parseInt(queryOptions.page, 10) || 1;
  const limit = parseInt(queryOptions.limit, 10) || 50;
  const skip = (page - 1) * limit;
  const sortBy = queryOptions.sortBy || 'createdAt:asc'; 
  
  const sortParams = {};
  if (sortBy) {
    const parts = sortBy.split(':');
    sortParams[parts[0]] = parts[1] === 'desc' ? -1 : 1;
  }

  const messages = await Message.find({ conversationId })
    .populate({
      path: 'senderId',
      select: 'username avatar legacyUserId _id',
    })
    .sort(sortParams)
    .skip(skip)
    .limit(limit);
  
  const totalMessages = await Message.countDocuments({ conversationId });

  return {
    messages,
    currentPage: page,
    totalPages: Math.ceil(totalMessages / limit),
    totalMessages,
  };
};

exports.findOrCreateMessageFromLegacy = async (legacyMsgData, convMap, userMap) => {
    const conversationMongoId = convMap[legacyMsgData.conversationId]?._id;
    const senderMongoId = userMap[legacyMsgData.userId]?._id;

    if (!conversationMongoId) {
        console.warn(`Message skipped: Legacy conversation ID ${legacyMsgData.conversationId} not found in convMap for message content: "${legacyMsgData.message}".`);
        return null;
    }
    if (!senderMongoId) {
        console.warn(`Message skipped: Legacy sender ID ${legacyMsgData.userId} (user: ${legacyMsgData.user}) not found in userMap for message in conversation ${legacyMsgData.conversationId}.`);
        return null;
    }

    const message = await Message.create({
        conversationId: conversationMongoId,
        legacyConvId: legacyMsgData.conversationId,
        senderId: senderMongoId,
        legacySenderId: legacyMsgData.userId,
        type: legacyMsgData.messageType === 'text' ? 'text' : (legacyMsgData.messageType === 'image' ? 'image' : 'text'),
        content: legacyMsgData.message,
        reactions: legacyMsgData.reactions || {},
        createdAt: legacyMsgData.timestamp ? new Date(legacyMsgData.timestamp) : new Date(),
    });
    return message;
}; 