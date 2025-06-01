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
    const { conversationId } = await conversationIdParamsSchema.validateAsync(ctx.params);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const notFoundError = new Error('對話未找到');
      notFoundError.status = 404;
      notFoundError.errorCode = 'CONVERSATION_NOT_FOUND';
      throw notFoundError;
    }

    const messages = await Message.find({ conversationId })
      .populate({
        path: 'senderId',
        select: 'username avatar _id'
      })
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      conversationId: msg.conversationId,
      // System messages will now also have senderId populated (pointing to the user who joined)
      // Client can use msg.type === 'system' to render it differently.
      sender: msg.senderId ? { 
        userId: msg.senderId._id,
        user: msg.senderId.username,
        avatar: msg.senderId.avatar
      } : null, // Keeping this for robustness, though system messages will have senderId now
      type: msg.type,
      content: msg.content,
      s3Key: msg.s3Key,
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
    const { conversationId } = await conversationIdParamsSchema.validateAsync(ctx.params);
    const { senderId, type, content, s3Key: validatedS3Key } = await createMessageBodySchema.validateAsync(ctx.request.body);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const convNotFoundError = new Error('對話未找到');
      convNotFoundError.status = 404;
      convNotFoundError.errorCode = 'CONVERSATION_NOT_FOUND';
      throw convNotFoundError;
    }

    const sender = await User.findById(senderId);
    if (!sender) {
      const userNotFoundError = new Error('發送者未找到');
      userNotFoundError.status = 404;
      userNotFoundError.errorCode = 'USER_NOT_FOUND';
      throw userNotFoundError;
    }

    const senderIsParticipant = conversation.participants.map(p => p.toString()).includes(senderId);
    if (!senderIsParticipant) {
      conversation.participants.addToSet(senderId);
      await conversation.save(); 
      console.log(`User ${senderId} (${sender.username}) was not a participant and has been added to conversation ${conversationId}`);

      const systemMessageContent = `${sender.username} 已加入對話`;
      const systemJoinMessage = new Message({
        conversationId,
        senderId: sender._id, // Assign the joining user's ID as senderId for the system message
        type: 'system',
        content: systemMessageContent,
      });
      await systemJoinMessage.save();

      if (ctx.io) {
        // Populate sender for the system message to send complete sender info via socket
        await systemJoinMessage.populate({ path: 'senderId', select: 'username avatar _id' });

        const roomName = String(conversationId);
        const systemMessageForSocket = {
            id: systemJoinMessage._id,
            conversationId: systemJoinMessage.conversationId,
            sender: { // Include sender object for system message as well
                userId: systemJoinMessage.senderId._id,
                user: systemJoinMessage.senderId.username,
                avatar: systemJoinMessage.senderId.avatar
            },
            type: systemJoinMessage.type,
            content: systemJoinMessage.content,
            timestamp: systemJoinMessage.createdAt.getTime(),
        };
        ctx.io.to(roomName).emit('newMessage', systemMessageForSocket);
        console.log(`System message (user joined) broadcasted to room: ${roomName}`);
      }
    }

    const newMessage = new Message({
      conversationId,
      senderId,
      type,
      content,
      s3Key: type === 'text' ? null : validatedS3Key
    });

    await newMessage.save();

    conversation.lastMessage = newMessage._id;
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
    } else {
      console.warn('Socket.IO instance (ctx.io) not available for broadcasting message.');
    }

    ctx.status = 201;
    ctx.body = { status: 'success', data: messageForResponseAndSocket };

  } catch (error) {
    if (error.isJoi) {
        // Joi errors are already structured, let errorHandler handle them
        throw error;
    }
    // For other errors, log and rethrow for global handler
    console.error(`Error in createMessageInConversation for ${ctx.params.conversationId || 'unknown'}:`, error);
    throw error; 
  }
}; 