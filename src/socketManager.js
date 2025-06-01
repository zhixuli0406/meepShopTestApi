// This module will handle Socket.IO server-side logic
const User = require('./models/user'); // Corrected path
const Conversation = require('./models/conversation'); // Corrected path

// Placeholder for now. We will define event handlers here.
// e.g., on connection, on disconnect, custom events like 'joinConversation', 'sendMessage'

function initializeSocketIO(io) {
    // Socket.IO Middleware for authentication (example)
    // This middleware runs for every incoming connection
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token; // Client should send token in auth object
        // const { token } = socket.handshake.query; // Or via query param (less secure for tokens)
        if (token) {
            // TODO: Implement your actual token verification logic here
            // For example, verify a JWT token and get the user ID
            // const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // const user = await User.findById(decoded.id);
            // if (!user) {
            //     return next(new Error('Authentication error: User not found'));
            // }
            // socket.userId = user._id.toString(); // Attach userId to the socket object
            // socket.username = user.username;
            console.log(`Socket ${socket.id} trying to authenticate with token.`);
            // For this example, let's assume a placeholder userId if token is present
            if (token === 'valid-token-for-testing') { // Replace with real validation
                socket.userId = 'mockUserId-' + socket.id.substring(0,5); // Example user ID
                socket.username = 'MockUser-' + socket.id.substring(0,5);
                console.log(`Socket ${socket.id} authenticated as ${socket.username} (${socket.userId})`);
                return next();
            } else {
                console.log(`Socket ${socket.id} authentication failed: Invalid token.`);
                return next(new Error('Authentication error: Invalid token'));
            }
        } else {
            console.log(`Socket ${socket.id} connection attempt without authentication token.`);
            return next(new Error('Authentication error: No token provided'));
        }
    });

    io.on('connection', (socket) => {
        // This code now runs only for authenticated sockets
        console.log(`Authenticated socket connected: ${socket.id}, User: ${socket.username} (${socket.userId})`);

        socket.on('joinConversation', async (data) => {
            const conversationId = typeof data === 'string' ? data : data?.conversationId;
            
            if (!socket.userId) {
                socket.emit('joinConversationError', { conversationId, message: 'Authentication required.' });
                return console.warn(`Socket ${socket.id} tried to join ${conversationId} without being authenticated.`);
            }

            if (conversationId) {
                try {
                    const conversation = await Conversation.findById(conversationId).lean();
                    if (!conversation) {
                        socket.emit('joinConversationError', { conversationId, message: 'Conversation not found.' });
                        return console.warn(`Socket ${socket.id} tried to join non-existent conversation: ${conversationId}`);
                    }

                    // Check if the authenticated user is a participant of the conversation
                    const isParticipant = conversation.participants.map(p => p.toString()).includes(socket.userId);
                    if (!isParticipant) {
                        // Option 1: Deny joining
                        // socket.emit('joinConversationError', { conversationId, message: 'You are not a participant of this conversation.' });
                        // return console.warn(`User ${socket.userId} (${socket.username}) denied joining ${conversationId}: not a participant.`);
                        
                        // Option 2: Add user to conversation if they are not already (consider security implications)
                        // This might be better handled via an API endpoint that explicitly adds a user to a conversation.
                        // For this example, let's assume an admin/system might add them, or it's an open conversation.
                        // Or, for simplicity in this example, let's allow joining but log it.
                        console.warn(`User ${socket.userId} (${socket.username}) joined ${conversationId} but was not initially listed as a participant. Ensure this is intended behavior.`);
                    }

                    socket.join(conversationId);
                    console.log(`Socket ${socket.id} (User: ${socket.username}) joined conversation room: ${conversationId}`);
                    socket.emit('joinedConversation', { conversationId, status: 'success', message: `Successfully joined conversation ${conversationId}` });

                    // Example: Notify others in the room that a user has joined
                    // You might want to send more user details like username, avatar etc.
                    socket.to(conversationId).emit('userJoinedNotification', {
                        conversationId,
                        userId: socket.userId,
                        username: socket.username,
                        message: `${socket.username || 'A user'} has joined the conversation.`
                    });

                } catch (error) {
                    console.error(`Error joining conversation ${conversationId} for socket ${socket.id}:`, error);
                    socket.emit('joinConversationError', { conversationId, message: 'Server error while trying to join conversation.' });
                }
            } else {
                const errMsg = 'Invalid conversation ID provided for joinConversation.';
                console.warn(`Socket ${socket.id} (User: ${socket.username}): ${errMsg}`);
                socket.emit('joinConversationError', { message: errMsg });
            }
        });

        socket.on('leaveConversation', (conversationId) => {
            if (conversationId) {
                socket.leave(conversationId);
                console.log(`Socket ${socket.id} (User: ${socket.username}) left conversation room: ${conversationId}`);
                socket.emit('leftConversation', { conversationId, status: 'success' });
                // Optionally notify others
                socket.to(conversationId).emit('userLeftNotification', {
                    conversationId,
                    userId: socket.userId,
                    username: socket.username,
                    message: `${socket.username || 'A user'} has left the conversation.`
                });
            }
        });

        socket.on('disconnecting', () => {
            console.log(`Socket ${socket.id} (User: ${socket.username}) disconnecting. Rooms:`, Array.from(socket.rooms));
            for (const room of socket.rooms) {
                if (room !== socket.id) { // Don't emit to the socket's own room
                    socket.to(room).emit('userLeftNotification', { // Or a more generic 'presenceUpdate' event
                        conversationId: room,
                        userId: socket.userId,
                        username: socket.username,
                        message: `${socket.username || 'A user'} has disconnected and left the room.`
                    });
                }
            }
        });

        socket.on('disconnect', () => {
            console.log(`Authenticated socket disconnected: ${socket.id}, User: ${socket.username} (${socket.userId})`);
        });

        // Client-initiated 'sendMessage' is generally handled via HTTP API in this project.
        // The broadcast of 'newMessage' is triggered by the server after successful DB save in messageController.

    });
}

module.exports = initializeSocketIO; 