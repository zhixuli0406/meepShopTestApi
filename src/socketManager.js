// This module will handle Socket.IO server-side logic
const User = require('./models/user'); // Corrected path
const Conversation = require('./models/conversation'); // Corrected path
const { Server } = require('socket.io');

// Placeholder for now. We will define event handlers here.
// e.g., on connection, on disconnect, custom events like 'joinConversation', 'sendMessage'

const setupSocketIO = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "*", // Adjust for production
            methods: ["GET", "POST"],
        },
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        console.log('Socket connection attempt. Handshake query:', socket.handshake.query); // Log the entire query object
        console.log('Socket connection attempt. Handshake auth:', socket.handshake.auth);   // Log the auth object

        const tokenFromQuery = socket.handshake.query.token;
        const tokenFromAuth = socket.handshake.auth.token; // Keep checking auth as well, some versions might populate it

        let token = tokenFromQuery || tokenFromAuth; // Prioritize token from query for this test

        if (token) {
            console.log(`Token received: ${token}`);
            if (token === 'valid-token-for-testing' || (await isValidToken(token))) { // Assuming isValidToken is your actual validation logic
                console.log(`Authentication successful for socket ID: ${socket.id}`);
                socket.userId = await getUserIdFromToken(token); // Example: Store userId on socket
                return next();
            } else {
                console.log(`Authentication failed: Invalid token for socket ID: ${socket.id}`);
                return next(new Error('Authentication error: Invalid token'));
            }
        } else {
            console.log(`Authentication failed: No token provided for socket ID: ${socket.id}`);
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

    return io;
};

// Dummy/placeholder functions for isValidToken and getUserIdFromToken
// Replace these with your actual token validation logic
async function isValidToken(token) {
    // In a real app, you'd validate this against your auth system (e.g., decode JWT, check session)
    if (token === 'valid-token-for-testing') return true; // For our hardcoded test
    // Replace with actual validation logic
    console.warn(`isValidToken: Actual token validation not implemented. Token received: ${token}`);
    return false; // Default to false if not the test token and no real validation
}

async function getUserIdFromToken(token) {
    // In a real app, extract user ID from the validated token
    if (token === 'valid-token-for-testing') return 'test-user-id-from-valid-token'; // Example
    // Replace with actual user ID extraction logic
    console.warn(`getUserIdFromToken: Actual user ID extraction not implemented. Token received: ${token}`);
    return null;
}

module.exports = setupSocketIO; 