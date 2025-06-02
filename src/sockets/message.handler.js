// src/sockets/message.handler.js
const messageService = require('../services/message.service');
const conversationService = require('../services/conversation.service');

module.exports = (io, socket, onlineUsers) => {
  const sendMessage = async (data, callback) => {
    try {
      const { conversationId, type, content } = data;
      const senderId = socket.user?._id; // Get senderId from the authenticated socket.user

      if (!senderId) {
        if (callback) callback({ status: 'error', message: 'User not authenticated for this socket connection.' });
        console.error('sendMessage attempt failed: User not authenticated on socket.', socket.id);
        return;
      }
      if (!conversationId || !type || !content) {
        if (callback) callback({ status: 'error', message: 'Missing conversationId, type, or content.' });
        return;
      }

      const conversation = await conversationService.getConversationById(conversationId, senderId);
      if (!conversation) {
          if (callback) callback({ status: 'error', message: 'Conversation not found or you are not a participant.' });
          return;
      }

      const messageData = { conversationId, senderId, type, content };
      const newMessage = await messageService.createMessage(messageData);

      io.to(conversationId.toString()).emit('newMessage', newMessage);
      
      conversation.participants.forEach(participant => {
        // Emit to the user's personal room (which they joined using their userId)
        // This ensures that if they have the conversation list open (even if not this specific chat),
        // they get an update.
        io.to(participant._id.toString()).emit('updateConversationList', { 
            conversationId: conversation._id.toString(), 
            lastMessage: newMessage 
        });
      });

      if (callback) callback({ status: 'success', data: newMessage });
    } catch (error) {
      console.error('Error in sendMessage socket handler:', error.message, error.stack);
      if (callback) callback({ status: 'error', message: error.message || 'Failed to send message.' });
    }
  };

  socket.on('sendMessage', sendMessage);
}; 