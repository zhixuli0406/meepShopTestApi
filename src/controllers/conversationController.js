const Conversation = require('../models/conversation');
const User = require('../models/user'); // Needed for populating participants
const Message = require('../models/message'); // Needed for populating lastMessage
const mongoose = require('mongoose');
const { createConversationSchema } = require('../validators/conversationValidators'); // Import Joi schema

exports.getAllConversations = async (ctx) => {
  try {
    const conversations = await Conversation.find()
      .populate({
        path: 'participants',
        select: 'username avatar' // Assuming avatar might be added to User model
      })
      .populate({
        path: 'lastMessage',
        select: 'content type senderId createdAt',
        populate: {
          path: 'senderId',
          select: 'username avatar' // Populate sender of the last message
        }
      })
      .sort({ updatedAt: -1 }); // Sort by most recently updated

    // Format the response to somewhat match chat_data.json structure
    const formattedConversations = conversations.map(conv => {
      let lastMessageContent = '';
      if (conv.lastMessage) {
        lastMessageContent = conv.lastMessage.content;
        // Potentially add prefix for system messages or based on type
        // if (conv.lastMessage.type === 'image') lastMessageContent = '[Image]';
      }

      return {
        id: conv._id, // Use MongoDB _id
        participants: conv.participants.map(p => ({
          userId: p._id,
          user: p.username,
          avatar: p.avatar || 'https://i.pravatar.cc/150?img=default' // Default avatar if not set
        })),
        lastMessage: lastMessageContent,
        timestamp: conv.updatedAt.getTime() // Return as Unix ms timestamp like in chat_data
        // Or return conv.updatedAt for ISO string and let client format
      };
    });

    ctx.status = 200;
    ctx.body = {
        status: 'success',
        data: formattedConversations
    };
  } catch (error) {
    // Let the central errorHandler handle it
    throw error;
  }
};

exports.createConversation = async (ctx) => {
  try {
    const { error, value } = createConversationSchema.validate(ctx.request.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      error.status = 400;
      throw error;
    }

    const { participantIds } = value; // Validated participant IDs

    // Further validation: Check if participant IDs correspond to existing users
    // and ensure no duplicate participantIds after converting to string for comparison and Set creation.
    const uniqueParticipantMongoIds = [];
    const participantIdStrings = new Set();

    for (const id of participantIds) {
      // The Joi custom validator already ensures it's a valid ObjectId string format.
      // Now, check if the user exists.
      const user = await User.findById(id);
      if (!user) {
        const notFoundError = new Error(`User not found with ID: ${id}`);
        notFoundError.status = 404;
        notFoundError.errorCode = 'USER_NOT_FOUND';
        notFoundError.details = { userId: id };
        throw notFoundError;
      }
      if (!participantIdStrings.has(user._id.toString())) {
        uniqueParticipantMongoIds.push(user._id); // Store actual ObjectId
        participantIdStrings.add(user._id.toString());
      }
    }
    
    if (uniqueParticipantMongoIds.length < 2) {
      const validationError = new Error('Conversation must have at least two unique, valid participants.');
      validationError.status = 400;
      validationError.errorCode = 'INSUFFICIENT_UNIQUE_PARTICIPANTS';
      throw validationError;
    }

    // Sort participant IDs to ensure consistent query for existing conversations
    const sortedParticipantObjectIds = uniqueParticipantMongoIds.sort((a, b) => a.toString().localeCompare(b.toString()));

    const existingConversation = await Conversation.findOne({
      participants: {
        $all: sortedParticipantObjectIds,
        $size: sortedParticipantObjectIds.length
      }
    });

    if (existingConversation) {
      // Populate participants for the response of existing conversation
      await existingConversation.populate({ path: 'participants', select: 'username avatar' });
      ctx.status = 200; // OK, instead of 409, as we are returning the existing one
      ctx.body = {
        status: 'success',
        message: 'A conversation with these participants already exists.',
        data: {
            id: existingConversation._id,
            participants: existingConversation.participants.map(p => ({
                userId: p._id,
                user: p.username,
                avatar: p.avatar
            })),
            lastMessage: existingConversation.lastMessage, // This will be an ID, consider populating if needed
            createdAt: existingConversation.createdAt,
            updatedAt: existingConversation.updatedAt
        }
      };
      return;
    }

    const newConversation = new Conversation({
      participants: sortedParticipantObjectIds
    });

    await newConversation.save();
    await newConversation.populate({ path: 'participants', select: 'username avatar' });

    ctx.status = 201; // Created
    ctx.body = {
        status: 'success',
        data: {
            id: newConversation._id,
            participants: newConversation.participants.map(p => ({
                userId: p._id,
                user: p.username,
                avatar: p.avatar
            })),
            lastMessage: null,
            createdAt: newConversation.createdAt,
            updatedAt: newConversation.updatedAt
        }
    };

  } catch (err) {
    // Let the central errorHandler handle Joi errors, Mongoose errors, and custom thrown errors.
    throw err;
  }
}; 