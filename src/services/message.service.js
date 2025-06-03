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

exports.createSystemMessage = async (conversationId, content) => {
  if (!conversationId || !content) {
    throw new AppError('Missing required fields for system message (conversationId, content).', 400);
  }

  const systemMessage = await Message.create({
    conversationId,
    type: 'system',
    content,
    senderId: null, // Explicitly set senderId to null for system messages
  });

  // Populate senderId (even if null, to maintain consistency if needed downstream, though it will be null)
  // Or simply return the message without populating sender if it's always null for system messages
  const populatedSystemMessage = await Message.findById(systemMessage._id)
    .populate({ path: 'senderId', select: 'username avatar legacyUserId _id' }); // This will resolve to null for senderId

  // Optionally, update the conversation's last message if system messages should also do that.
  // For "user joined" messages, it might be better not to update the last message preview.
  // Or, if they should, then call ConversationService.updateConversationLastMessage here.
  // For now, let's assume system "join" messages don't become "lastMessageText".
  // If they should, this would be the place:
  // await ConversationService.updateConversationLastMessage(conversationId, populatedSystemMessage);
  
  return populatedSystemMessage;
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

exports.updateMessageReaction = async (messageId, userId, reactionType, action) => {
  // 1. Fetch message to get conversationId for auth check
  const messageForAuth = await Message.findById(messageId).select('conversationId').lean();
  if (!messageForAuth) {
    throw new AppError('Message not found.', 404);
  }

  // 2. Authenticate: Check if user is part of the conversation
  // This will throw an error if user is not a participant or conversation doesn't exist
  await ConversationService.getConversationById(messageForAuth.conversationId, userId);

  // 3. Validate reactionType
  const allowedReactionTypes = Object.keys(Message.schema.path('reactions').schema.paths);
  if (!allowedReactionTypes.includes(reactionType)) {
    throw new AppError(`Invalid reaction type: ${reactionType}. Allowed types are: ${allowedReactionTypes.join(', ')}.`, 400);
  }

  // 4. Validate action
  if (!['increment', 'decrement'].includes(action)) {
    throw new AppError('Invalid action. Must be \'increment\' or \'decrement\'.', 400);
  }

  const reactionPath = `reactions.${reactionType}`;
  let updatedMessage;

  if (action === 'increment') {
    updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { $inc: { [reactionPath]: 1 } },
      { new: true, upsert: false, select: '_id reactions conversationId' }
    ).lean(); // Use lean to get a plain JS object
  } else { // action === 'decrement'
    updatedMessage = await Message.findOneAndUpdate(
      { _id: messageId, [reactionPath]: { $gt: 0 } }, // Only decrement if current value > 0
      { $inc: { [reactionPath]: -1 } },
      { new: true, upsert: false, select: '_id reactions conversationId' }
    ).lean();

    if (!updatedMessage) {
      // If update didn't happen (e.g., reaction count was already 0 or message deleted),
      // fetch the current state to return. If messageForAuth was found, message should still exist.
      const currentMessageState = await Message.findById(messageId).select('_id reactions conversationId').lean();
      if (!currentMessageState) {
        // This is highly unlikely if messageForAuth was found, but as a safeguard
        throw new AppError('Message disappeared during reaction update.', 500);
      }
      // No actual change in reaction count occurred (was 0), return current state.
      return currentMessageState; 
    }
  }

  if (!updatedMessage) {
    // Should not be reached if messageForAuth was found and action is increment, 
    // or if action is decrement and handled above.
    throw new AppError('Failed to update message reaction.', 500);
  }

  return updatedMessage;
}; 