const Message = require('../models/message');
const Conversation = require('../models/conversation');
const User = require('../models/user'); // For populating sender details
const mongoose = require('mongoose');
const { conversationIdParamsSchema, createMessageBodySchema } = require('../validators/messageValidators'); // Import Joi schema
// Multer is no longer needed here as file upload is handled by presigned URL flow
// const multer = require('@koa/multer'); 

// S3 upload service placeholder is also removed as client uploads directly to S3

exports.getMessagesForConversation = async (ctx) => {
  try {
    // Validate URL parameters
    const { error: paramsError, value: paramsValue } = conversationIdParamsSchema.validate(ctx.params, {
        abortEarly: false,
        // stripUnknown: true, // Not typically needed for params as they are strictly defined by router
    });
    if (paramsError) {
        paramsError.status = 400;
        throw paramsError;
    }
    const { conversationId } = paramsValue; // Validated conversationId

    // The old manual mongoose.Types.ObjectId.isValid(conversationId) check is now handled by Joi

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const notFoundError = new Error('Conversation not found');
      notFoundError.status = 404;
      notFoundError.errorCode = 'CONVERSATION_NOT_FOUND';
      throw notFoundError;
    }

    // TODO: Authorization - Check if the requesting user is part of this conversation
    // This might involve ctx.state.user if you have user authentication middleware

    const messages = await Message.find({ conversationId })
      .populate({
        path: 'senderId',
        select: 'username avatar _id'
      })
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      conversationId: msg.conversationId,
      sender: {
        userId: msg.senderId._id,
        user: msg.senderId.username,
        avatar: msg.senderId.avatar
      },
      type: msg.type,
      content: msg.content,
      s3Key: msg.s3Key, // Include s3Key if present
      timestamp: msg.createdAt.getTime(),
    }));

    ctx.status = 200;
    ctx.body = {
        status: 'success',
        data: formattedMessages
    };

  } catch (error) {
    // Let the central errorHandler handle Joi errors, Mongoose errors, and custom thrown errors.
    throw error;
  }
};

exports.createMessageInConversation = async (ctx) => {
  try {
    // Validate URL parameters first
    const { error: paramsError, value: paramsValue } = conversationIdParamsSchema.validate(ctx.params, {
      abortEarly: false,
    });
    if (paramsError) {
      paramsError.status = 400;
      throw paramsError;
    }
    const { conversationId } = paramsValue;

    // Validate request body
    const { error: bodyError, value: bodyValue } = createMessageBodySchema.validate(ctx.request.body, {
      abortEarly: false,
      stripUnknown: true 
    });
    if (bodyError) {
      bodyError.status = 400;
      throw bodyError;
    }
    // Use validated values from bodyValue
    const { senderId, type, content, s3Key: validatedS3Key } = bodyValue;

    // Check if conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const convNotFoundError = new Error('Conversation not found');
      convNotFoundError.status = 404;
      convNotFoundError.errorCode = 'CONVERSATION_NOT_FOUND';
      throw convNotFoundError;
    }

    // Check if sender exists
    const sender = await User.findById(senderId);
    if (!sender) {
      const userNotFoundError = new Error('Sender not found');
      userNotFoundError.status = 404;
      userNotFoundError.errorCode = 'USER_NOT_FOUND';
      throw userNotFoundError;
    }

    // Check if sender is a participant in the conversation
    if (!conversation.participants.map(p => p.toString()).includes(senderId)) {
      const forbiddenError = new Error('Sender is not a participant in this conversation');
      forbiddenError.status = 403;
      forbiddenError.errorCode = 'SENDER_NOT_PARTICIPANT';
      throw forbiddenError;
    }

    const newMessage = new Message({
      conversationId,
      senderId,
      type, // Already validated by Joi to be 'text' or 'image'
      content, // Already validated by Joi based on type
      s3Key: type === 'text' ? null : validatedS3Key // Ensure s3Key is null for text messages
    });

    await newMessage.save();

    conversation.lastMessage = newMessage._id;
    conversation.updatedAt = newMessage.createdAt;
    await conversation.save();

    await newMessage.populate({ path: 'senderId', select: 'username avatar _id' });
    
    const messageForResponseAndSocket = {
        id: newMessage._id,
        conversationId: newMessage.conversationId,
        sender: { userId: newMessage.senderId._id, user: newMessage.senderId.username, avatar: newMessage.senderId.avatar },
        type: newMessage.type,
        content: newMessage.content,
        s3Key: newMessage.s3Key,
        timestamp: newMessage.createdAt.getTime()
    };

    if (ctx.io) {
      const roomName = String(conversationId);
      ctx.io.to(roomName).emit('newMessage', messageForResponseAndSocket);
      console.log(`Message broadcasted to room: ${roomName}`);
    } else {
      console.warn('Socket.IO instance (ctx.io) not available for broadcasting message.');
    }

    ctx.status = 201;
    ctx.body = { status: 'success', data: messageForResponseAndSocket };

  } catch (error) {
    throw error;
  }
}; 