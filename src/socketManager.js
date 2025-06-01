// This module will handle Socket.IO server-side logic
const User = require('./models/user'); // Corrected path
const Conversation = require('./models/conversation'); // Corrected path
const { Server } = require('socket.io');
const { addParticipantToConversation, getConversationParticipants, createSystemMessage } = require('../services/conversationService'); // 假設的路徑
const { getUserById } = require('../services/userService'); // 假設的路徑

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
        console.log('Socket connection attempt. Handshake query:', socket.handshake.query);
        console.log('Socket connection attempt. Handshake auth:', socket.handshake.auth);

        const tokenFromQuery = socket.handshake.query.token;
        const tokenFromAuth = socket.handshake.auth.token;
        let token = tokenFromQuery || tokenFromAuth;

        if (token) {
            console.log(`Token received by middleware: ${token}`);
            const valid = await isValidToken(token);
            if (valid) {
                const userId = await getUserIdFromToken(token);
                if (userId) {
                    socket.userId = userId; // Attach userId to socket object
                    console.log(`Authentication successful for socket ID: ${socket.id}, User ID: ${userId}`);
                    return next();
                } else {
                    console.log(`Authentication failed: User ID not found for token. Socket ID: ${socket.id}`);
                    return next(new Error('Authentication error: User ID not found for token'));
                }
            } else {
                console.log(`Authentication failed: Invalid token. Socket ID: ${socket.id}`);
                return next(new Error('Authentication error: Invalid token'));
            }
        } else {
            console.log(`Authentication failed: No token provided. Socket ID: ${socket.id}`);
            return next(new Error('Authentication error: No token provided'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}, UserID: ${socket.userId || 'N/A (auth pending or failed)'}`);

        socket.on('joinConversation', async ({ conversationId }) => {
            try {
                console.log(`Socket ID ${socket.id} (User ID: ${socket.userId}) attempting to join conversation ${conversationId}`);
                if (!socket.userId) {
                    console.error(`Error: User ID not found on socket ${socket.id} when trying to join conversation ${conversationId}. Authentication might have failed or is incomplete.`);
                    socket.emit('socketError', { message: 'Authentication error, cannot join conversation.' });
                    return;
                }

                socket.join(conversationId);
                console.log(`User ${socket.userId} (Socket ${socket.id}) joined conversation room: ${conversationId}`);

                // Emit a test event back to the client who just joined
                socket.emit('testEventFromServer', { 
                    message: `Successfully joined conversation ${conversationId}`, 
                    conversationId: conversationId,
                    socketId: socket.id,
                    userId: socket.userId 
                });
                console.log(`Emitted 'testEventFromServer' to ${socket.id} for joining ${conversationId}`);

                // Notify other users in the room that a new user has joined (optional)
                // Check if user was already a participant
                const participants = await getConversationParticipants(conversationId);
                const currentUserData = await getUserById(socket.userId); // Fetch user's details
                
                if (!participants.find(p => p.userId === socket.userId)) {
                    if (currentUserData) {
                        await addParticipantToConversation(conversationId, socket.userId, currentUserData.username, currentUserData.avatar);
                        console.log(`User ${socket.userId} (${currentUserData.username}) was not a participant and has been added to conversation ${conversationId}`);
                        
                        const systemMessage = await createSystemMessage(
                            conversationId,
                            `${currentUserData.username || 'A user'} has joined the conversation.`
                        );
                        io.to(conversationId).emit('newMessage', systemMessage);
                        console.log(`System message (user joined) broadcasted to room: ${conversationId}`);
                    } else {
                        console.error(`Could not find user data for User ID: ${socket.userId} to add as participant or create system message.`);
                    }
                } else {
                    console.log(`User ${socket.userId} (${currentUserData?.username || 'Unknown User'}) was already a participant in conversation ${conversationId}.`);
                }

            } catch (error) {
                console.error(`Error in joinConversation for socket ${socket.id}, conversation ${conversationId}:`, error);
                socket.emit('socketError', { message: 'Error joining conversation.', details: error.message });
            }
        });

        socket.on('leaveConversation', ({ conversationId }) => {
            try {
                console.log(`Socket ID ${socket.id} (User ID: ${socket.userId}) attempting to leave conversation ${conversationId}`);
                socket.leave(conversationId);
                console.log(`User ${socket.userId} (Socket ${socket.id}) left conversation room: ${conversationId}`);
                // Optionally notify others, though usually not needed for 'leave' if it's just closing the tab/app
            } catch (error) {
                console.error(`Error in leaveConversation for socket ${socket.id}, conversation ${conversationId}:`, error);
                // socket.emit('socketError', { message: 'Error leaving conversation.', details: error.message });
            }
        });
        
        // newMessage event is handled by HTTP POST, but server broadcasts it
        // So no socket.on('newMessage', ...) listener is typically needed here from client sending.
        // The server will use io.to(conversationId).emit('newMessage', createdMessage) after HTTP POST.

        socket.on('disconnect', (reason) => {
            console.log(`User disconnected: ${socket.id}, UserID: ${socket.userId || 'N/A'}, Reason: ${reason}`);
            // Handle any cleanup, e.g., if you track active users in conversations
        });

        socket.on('error', (error) => {
            console.error(`Socket error for ${socket.id}:`, error);
        });
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