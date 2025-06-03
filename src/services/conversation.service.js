const Conversation = require('../models/conversation.model');
const User = require('../models/user.model');
const AppError = require('../utils/appError');
const messageService = require('./message.service');

exports.createConversation = async (userId, participantIds, title) => {
  console.log('[Service:createConversation] Called with:');
  console.log('  Initiator User ID:', userId);
  console.log('  Participant IDs (from request):', participantIds);
  console.log('  Title:', title);

  if (!participantIds || participantIds.length === 0) {
    console.error('[Service:createConversation] Error: Participants are required.');
    throw new AppError('Participants are required to create a conversation.', 400);
  }
  // It's generally good practice to have a title for group chats, 
  // but allow no title for 2-person chats if that's the design.
  // For this new logic, title becomes a key part of uniqueness.
  if (!title && (participantIds.length + 1 > 2)) { // More than 2 participants implies a group chat that should have a title
      console.error('[Service:createConversation] Error: Title is required for group conversations.');
      throw new AppError('Title is required for group conversations with more than 2 participants.', 400);
  } else if (!title && (participantIds.length +1 <=2)) {
    // For 2-person chats, if no title is provided, we might auto-generate one or leave it null
    // For now, if title is part of uniqueness, it should be provided or handled consistently.
    // Let's assume for now that a 2-person chat CAN have an empty/null title, and uniqueness will be based on that.
    console.log('[Service:createConversation] No title provided for a 2-person chat.');
  }

  const allParticipantMongoIds = [...new Set([userId.toString(), ...participantIds.map(id => String(id))])];
  console.log('[Service:createConversation] All distinct participant Mongo IDs (initiator + provided):', allParticipantMongoIds);

  const usersExist = await User.find({ _id: { $in: allParticipantMongoIds } }).select('_id username');
  console.log('[Service:createConversation] Users found in DB based on IDs:', usersExist.map(u => u.username));

  if (usersExist.length !== allParticipantMongoIds.length) {
    const foundIds = usersExist.map(u => u._id.toString());
    const missingIds = allParticipantMongoIds.filter(id => !foundIds.includes(id));
    console.error('[Service:createConversation] Error: Some participant user IDs not found:', missingIds);
    throw new AppError(`One or more participant user IDs are invalid or not found: ${missingIds.join(', ')}.`, 404);
  }

  let queryParticipantsCriteria = { $all: allParticipantMongoIds, $size: allParticipantMongoIds.length };
  if (allParticipantMongoIds.length === 2) {
    const sortedParticipantIdsForQuery = [...allParticipantMongoIds].sort();
    queryParticipantsCriteria = { $all: sortedParticipantIdsForQuery, $size: sortedParticipantIdsForQuery.length };
    console.log('[Service:createConversation] Participant criteria for 2-person chat (sorted for query):', sortedParticipantIdsForQuery);
  } else {
    console.log('[Service:createConversation] Participant criteria for group chat:', allParticipantMongoIds);
  }
  
  // New logic: Check for existing conversation with THE SAME participants AND THE SAME title.
  // title can be null or an empty string, so handle that in the query.
  const queryTitle = title === undefined || title === null ? null : title; // Normalize title for query

  console.log('[Service:createConversation] Querying for existing chat with participants criteria and title:', queryTitle);
  const existingConversation = await Conversation.findOne({
    participants: queryParticipantsCriteria,
    title: queryTitle 
  });

  if (existingConversation) {
    console.error('[Service:createConversation] Error: Conversation with these participants and title already exists. ID:', existingConversation._id);
    throw new AppError('A conversation with the same participants and title already exists.', 409); // 409 Conflict
  }

  console.log('[Service:createConversation] No existing conflicting conversation found. Creating a new one...');
  const conversationData = {
    participants: allParticipantMongoIds, 
    title: queryTitle, // Use the normalized title
  };
  console.log('[Service:createConversation] Data for new conversation:', conversationData);

  let newConversation;
  try {
    newConversation = await Conversation.create(conversationData);
    console.log('[Service:createConversation] Successfully created new conversation, ID:', newConversation._id);
  } catch (error) {
    console.error('[Service:createConversation] Error creating conversation in DB:', error);
    // Consider if the error might be due to a race condition creating a duplicate after the check.
    // Mongoose unique index on (participants, title) would be more robust if this is a strict requirement.
    if (error.code === 11000) { // MongoDB duplicate key error
        throw new AppError('A conversation with these details already exists (duplicate key error).', 409);
    }
    throw new AppError('Failed to create conversation in database.', 500, error);
  }
  
  console.log('[Service:createConversation] Populating participants for the new conversation...');
  const populatedConversation = await Conversation.findById(newConversation._id).populate('participants', 'username avatar legacyUserId _id');
  
  let initialSystemMessage = null;
  if (populatedConversation && populatedConversation.participants && populatedConversation.participants.length > 0) {
    const participantNames = populatedConversation.participants.map(p => p.username).join(', ');
    const systemMessageContent = `Users ${participantNames} have joined the conversation.`;
    
    try {
      console.log(`[Service:createConversation] Creating system message for new conversation ${populatedConversation._id}: "${systemMessageContent}"`);
      initialSystemMessage = await messageService.createSystemMessage(populatedConversation._id, systemMessageContent);
      console.log(`[Service:createConversation] System message created with ID: ${initialSystemMessage._id}`);
      // Update conversation's last message with this system message
      if (initialSystemMessage) {
        await exports.updateConversationLastMessage(populatedConversation._id, initialSystemMessage);
        console.log(`[Service:createConversation] Updated last message for conversation ${populatedConversation._id} with the system message.`);
      }
    } catch (error) {
      console.error(`[Service:createConversation] Failed to create or set initial system message for conversation ${populatedConversation._id}:`, error);
      // Do not throw an error if system message creation fails; main conversation creation is still successful.
    }
  }

  console.log('[Service:createConversation] Returning populated new conversation and initial system message.');
  return { conversation: populatedConversation, systemMessage: initialSystemMessage };
};

exports.getUserConversations = async (userId) => {
  const conversations = await Conversation.find({ participants: userId })
    .populate({
      path: 'participants',
      select: 'username avatar legacyUserId _id',
    })
    .sort({ updatedAt: -1 });
  return conversations;
};

exports.getAllConversations = async () => {
  const conversations = await Conversation.find({})
    .populate({
      path: 'participants',
      select: 'username avatar legacyUserId _id',
    })
    .sort({ updatedAt: -1 });
  return conversations;
};

exports.getConversationById = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId)
    .populate({
      path: 'participants',
      select: 'username avatar legacyUserId _id',
    });

  if (!conversation) {
    throw new AppError('Conversation not found.', 404);
  }

  if (!conversation.participants.some(p => p._id.equals(userId))) {
    throw new AppError('You are not authorized to view this conversation.', 403);
  }
  return conversation;
};

exports.addUserToConversation = async (conversationId, userId) => {
  // Find the conversation and add the user to the participants array if not already present
  // Using $addToSet ensures idempotency (user is only added if not already there)
  const updatedConversation = await Conversation.findByIdAndUpdate(
    conversationId,
    { $addToSet: { participants: userId } },
    { new: true } // Return the updated document
  ).populate('participants', 'username avatar _id'); // Populate for returning updated list if needed

  if (!updatedConversation) {
    // This case should ideally be handled before calling this, 
    // e.g., by ensuring conversation exists.
    // But as a safeguard:
    throw new AppError('Conversation not found while trying to add user.', 404);
  }
  return updatedConversation;
};

exports.findConversationByLegacyId = async (legacyConvId) => {
    return await Conversation.findOne({ legacyConvId });
};

exports.findOrCreateConversationFromLegacy = async (legacyConvData, userMap) => {
    let conversation = await Conversation.findOne({ legacyConvId: legacyConvData.id });
    if (!conversation) {
        const participantMongoIds = legacyConvData.participants.map(p => userMap[p.userId]?._id).filter(id => id);
        
        if (participantMongoIds.length < legacyConvData.participants.length) {
            console.warn(`Legacy Conversation ${legacyConvData.id}: Some participants could not be mapped from legacy IDs. Found ${participantMongoIds.length}/${legacyConvData.participants.length}.`);
            // If it was supposed to be a 2-person chat and one is missing, it might be problematic
            if (legacyConvData.participants.length >= 2 && participantMongoIds.length < 2) {
                console.error(`Skipping legacy conversation ${legacyConvData.id} due to insufficient mapped participants for a viable chat.`);
                return null;
            }
        }
        if (participantMongoIds.length === 0 && legacyConvData.participants.length > 0) {
            console.error(`Skipping legacy conversation ${legacyConvData.id} as no participants could be mapped.`);
            return null;
        }

        conversation = await Conversation.create({
            legacyConvId: legacyConvData.id,
            participants: participantMongoIds,
            lastMessageText: legacyConvData.lastMessage,
            lastMessageTimestamp: legacyConvData.timestamp ? new Date(legacyConvData.timestamp) : new Date(),
        });
    }
    return conversation;
};

exports.updateConversationLastMessage = async (conversationId, message) => {
    let lastMessageTextContent;
    if (message.type === 'text' || message.type === 'system') {
        lastMessageTextContent = message.content;
    } else if (message.type === 'image') {
        lastMessageTextContent = '[Image]';
    } else {
        lastMessageTextContent = '[Message]'; // Fallback for other types
    }

    await Conversation.findByIdAndUpdate(conversationId, {
        lastMessageText: lastMessageTextContent,
        lastMessageTimestamp: message.createdAt,
    });
}; 