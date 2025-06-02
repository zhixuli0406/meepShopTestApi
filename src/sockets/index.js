const messageHandlers = require('./message.handler');
const User = require('../models/user.model'); 

const onlineUsers = new Map(); 

module.exports = (io) => {
  io.on('connection', async (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    const userId = socket.handshake.query.userId;

    if (userId) {
      // Simple check if user exists - for more robust auth, use a token
      const user = await User.findById(userId);
      if (user) {
        socket.user = user; // Attach user object to socket for use in handlers
        console.log(`User ${user.username} (ID: ${userId}) connected with socket ${socket.id}`);
        onlineUsers.set(userId.toString(), socket.id);
        socket.join(userId.toString()); 
        socket.join(userId); // for compatibility if some parts use string others ObjectId

        socket.emit('connected', { message: `Welcome ${user.username}!`});
      } else {
        console.warn(`Socket ${socket.id} connected with invalid userId: ${userId}. Disconnecting.`);
        socket.disconnect(true);
        return;
      }
    } else {
      console.warn(`Socket ${socket.id} connected without a userId in handshake. Allowing anonymous for now.`);
      // Or disconnect: socket.disconnect(true); return;
    }
    
    messageHandlers(io, socket, onlineUsers);

    socket.on('joinConversation', (conversationId) => {
      if (conversationId) {
        socket.join(conversationId.toString());
        console.log(`Socket ${socket.id} (user ${socket.user?.username}) joined conversation room ${conversationId}`);
        socket.emit('joinedConversation', { conversationId });
      }
    });

    socket.on('leaveConversation', (conversationId) => {
        if (conversationId) {
            socket.leave(conversationId.toString());
            console.log(`Socket ${socket.id} (user ${socket.user?.username}) left conversation room ${conversationId}`);
        }
    });
    
    socket.on('typing', ({ conversationId, isTyping }) => {
        if (conversationId && socket.user) {
            socket.to(conversationId.toString()).emit('userTyping', { 
                conversationId, 
                userId: socket.user._id,
                username: socket.user.username, 
                isTyping 
            });
        }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (socket.user && socket.user._id) {
        const userIdStr = socket.user._id.toString();
        if (onlineUsers.get(userIdStr) === socket.id) {
            onlineUsers.delete(userIdStr);
            console.log(`User ${socket.user.username} (ID: ${userIdStr}) disconnected and removed from online users.`);
        } else {
             // This might happen if user opens multiple tabs/clients
            console.log(`Socket ${socket.id} for user ${socket.user.username} disconnected, but was not their primary registered socket.`);
        }
      }
    });
  });
}; 