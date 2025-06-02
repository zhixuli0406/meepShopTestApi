const Conversation = require('../models/conversation.model');
const User = require('../models/user.model');
const AppError = require('../utils/appError');

exports.createConversation = async (userId, participantIds, title) => {
  if (!participantIds || participantIds.length === 0) {
    throw new AppError('Participants are required to create a conversation.', 400);
  }

  const allParticipantMongoIds = [...new Set([userId.toString(), ...participantIds.map(id => id.toString())])];

  const usersExist = await User.find({ _id: { $in: allParticipantMongoIds } });
  if (usersExist.length !== allParticipantMongoIds.length) {
    const foundIds = usersExist.map(u => u._id.toString());
    const missingIds = allParticipantMongoIds.filter(id => !foundIds.includes(id));
    throw new AppError(`One or more participant user IDs are invalid or not found: ${missingIds.join(', ')}.`, 404);
  }

  let queryParticipants = allParticipantMongoIds;
  if (allParticipantMongoIds.length === 2) { 
      queryParticipants = [...allParticipantMongoIds].sort();
  }
  
  const existingConversation = await Conversation.findOne({
    participants: { $all: queryParticipants, $size: queryParticipants.length }
  });

  if (existingConversation) {
    return existingConversation;
  }

  const conversation = await Conversation.create({
    participants: allParticipantMongoIds,
    title,
  });
  return await Conversation.findById(conversation._id).populate('participants', 'username avatar legacyUserId _id');
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
    await Conversation.findByIdAndUpdate(conversationId, {
        lastMessageText: message.type === 'text' ? message.content : (message.type === 'image' ? '[Image]' : '[Message]'),
        lastMessageTimestamp: message.createdAt,
    });
}; 