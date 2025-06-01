// This module will handle Socket.IO server-side logic
const User = require('./models/user'); 
const Conversation = require('./models/conversation');
const { Server } = require('socket.io');

// Assume services are in ./services/ relative to src/
const { addParticipantToConversation, getConversationParticipants, createSystemMessage } = require('./services/conversationService'); 
const { getUserById } = require('./services/userService'); 

// --- Placeholder Authentication Functions ---
// TODO: Replace these with your actual, secure authentication logic (e.g., JWT validation)
async function isValidToken(token) {
    // Example: Decode JWT, check against DB, verify signature, check expiration, etc.
    console.log(`[Auth] isValidToken called for token: ${token ? token.substring(0, 10) + '...' : 'null'}`);
    if (token === 'valid-token-for-testing') {
        console.log('[Auth] Token is the valid test token.');
        return true;
    }
    // In a real app, implement actual token validation.
    console.warn(`[Auth] isValidToken: No real token validation implemented. Token received: ${token}`);
    return false; // Default to false if not the test token
}

async function getAuthenticatedUserFromToken(token) {
    // Example: Decode JWT and fetch user details from DB
    console.log(`[Auth] getAuthenticatedUserFromToken called for token: ${token ? token.substring(0, 10) + '...' : 'null'}`);
    if (token === 'valid-token-for-testing') {
        // Simulate fetching a user for the test token
        // In a real scenario, you'd use the decoded token payload (e.g., userId) to find the user.
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // const user = await User.findById(decoded.id).lean();
        // return user ? { userId: user._id.toString(), username: user.username, avatar: user.avatar } : null;
        
        // For testing with 'valid-token-for-testing'
        const mockUser = { 
            userId: 'test-user-id-from-valid-token', 
            username: 'TestUserFromToken',
            avatar: 'https://i.pravatar.cc/150?u=test-user-id-from-valid-token' 
        };
        console.log('[Auth] Mock user retrieved for test token:', mockUser);
        return mockUser;
    }
    console.warn(`[Auth] getAuthenticatedUserFromToken: No real user retrieval from token implemented. Token: ${token}`);
    return null; // No user found or token invalid
}
// --- End Placeholder Authentication Functions ---

const setupSocketIO = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || "*", // Adjust for production, '*' is insecure
            methods: ["GET", "POST"],
        },
        // path: "/socket.io", // Default path, usually not needed unless customized
    });

    // Socket.IO Authentication Middleware
    io.use(async (socket, next) => {
        let token = null;
        if (socket.handshake.auth && socket.handshake.auth.token) {
            token = socket.handshake.auth.token;
            console.log(`[AuthMiddleware] Token found in handshake.auth for socket ${socket.id}`);
        } else if (socket.handshake.query && socket.handshake.query.token) {
            token = socket.handshake.query.token; // Fallback, less secure for tokens
            console.log(`[AuthMiddleware] Token found in handshake.query for socket ${socket.id}`);
        }

        if (token) {
            console.log(`[AuthMiddleware] Attempting to validate token for socket ${socket.id}: ${token.substring(0,10)}...`);
            const user = await getAuthenticatedUserFromToken(token);
            if (user && user.userId) {
                socket.userId = user.userId;
                socket.username = user.username;
                socket.avatar = user.avatar;
                console.log(`[AuthMiddleware] Authentication successful for socket ${socket.id}. UserID: ${socket.userId}, Username: ${socket.username}`);
                next();
            } else {
                console.log(`[AuthMiddleware] Authentication failed: Could not retrieve user from token. Socket ID: ${socket.id}`);
                next(new Error('Authentication error: Invalid token or user not found.'));
            }
        } else {
            console.log(`[AuthMiddleware] Authentication failed: No token provided. Socket ID: ${socket.id}`);
            next(new Error('Authentication error: Token not provided.'));
        }
    });

    io.on('connection', (socket) => {
        // This block is reached only if authentication via io.use() was successful
        console.log(`[Connection] User connected: SocketID: ${socket.id}, UserID: ${socket.userId}, Username: ${socket.username}`);

        socket.on('joinConversation', async (data) => {
            const conversationId = typeof data === 'string' ? data : data?.conversationId;
            
            if (!socket.userId) { // Should not happen if auth middleware is effective
                console.error(`[joinConversation] Critical: UserID not found on authenticated socket ${socket.id}. This indicates an issue with the auth middleware flow.`);
                socket.emit('joinConversationError', { conversationId, message: 'Authentication integrity error. Please reconnect.' });
                return;
            }

            if (!conversationId) {
                console.warn(`[joinConversation] User ${socket.userId} (${socket.username}) provided invalid conversationId:`, data);
                socket.emit('joinConversationError', { message: 'Invalid conversation ID provided.' });
                return;
            }

            console.log(`[joinConversation] User ${socket.userId} (${socket.username}) attempting to join conversation ${conversationId}`);
            try {
                socket.join(conversationId);
                console.log(`[joinConversation] User ${socket.userId} (${socket.username}) successfully joined conversation room: ${conversationId}`);
                
                socket.emit('joinedConversation', { 
                    conversationId: conversationId,
                    status: 'success', 
                    message: `Successfully joined conversation ${conversationId}`
                });

                // Logic to add participant and send system message if they are new
                const participants = await getConversationParticipants(conversationId);
                const isAlreadyParticipant = participants.some(p => p.userId.toString() === socket.userId);

                if (!isAlreadyParticipant) {
                    // User details for system message and adding participant
                    // socket.username and socket.avatar were attached during authentication
                    const added = await addParticipantToConversation(conversationId, socket.userId, socket.username, socket.avatar);
                    if (added) {
                       console.log(`[joinConversation] User ${socket.userId} (${socket.username}) added as a new participant to conversation ${conversationId}`);
                        const systemMessageContent = `${socket.username || 'A user'} has joined the conversation.`;
                        const systemMessage = await createSystemMessage(conversationId, systemMessageContent);
                        if (systemMessage) {
                            io.to(conversationId).emit('newMessage', systemMessage); // Broadcast to all in room
                            console.log(`[joinConversation] System message (user joined) broadcasted to room ${conversationId}: "${systemMessageContent}"`);
                        }
                    } else {
                        console.warn(`[joinConversation] Failed to add user ${socket.userId} as participant to ${conversationId}, though they were not listed.`);
                    }
                } else {
                    console.log(`[joinConversation] User ${socket.userId} (${socket.username}) was already a participant in conversation ${conversationId}.`);
                }

            } catch (error) {
                console.error(`[joinConversation] Error for user ${socket.userId} joining conversation ${conversationId}:`, error);
                socket.emit('joinConversationError', { conversationId, message: 'Server error while trying to join conversation.', details: error.message });
            }
        });

        socket.on('leaveConversation', ({ conversationId }) => {
            if (!conversationId) {
                console.warn(`[leaveConversation] User ${socket.userId} (${socket.username}) provided invalid conversationId.`);
                return;
            }
            try {
                console.log(`[leaveConversation] User ${socket.userId} (${socket.username}) attempting to leave conversation ${conversationId}`);
                socket.leave(conversationId);
                console.log(`[leaveConversation] User ${socket.userId} (${socket.username}) left conversation room: ${conversationId}`);
                socket.emit('leftConversation', { conversationId, status: 'success' });
                // Optionally, notify others in the room
                const userLeftMessage = `${socket.username || 'A user'} has left the conversation.`;
                // const systemMessage = await createSystemMessage(conversationId, userLeftMessage);
                // if (systemMessage) io.to(conversationId).emit('newMessage', systemMessage);
                // Consider if this notification is via 'newMessage' or a dedicated 'userLeftRoom' event
                 socket.to(conversationId).emit('userLeftNotification', {
                    conversationId,
                    userId: socket.userId,
                    username: socket.username,
                    message: userLeftMessage
                });
                console.log(`[leaveConversation] "userLeftNotification" emitted to room ${conversationId} for user ${socket.userId}`);


            } catch (error) {
                console.error(`[leaveConversation] Error for user ${socket.userId} leaving conversation ${conversationId}:`, error);
                // socket.emit('socketError', { message: 'Error leaving conversation.', details: error.message });
            }
        });
        
        socket.on('disconnecting', (reason) => {
            console.log(`[Disconnecting] User disconnecting: SocketID: ${socket.id}, UserID: ${socket.userId}, Username: ${socket.username}, Reason: ${reason}`);
            // Notify rooms the user is in
            socket.rooms.forEach(room => {
                if (room !== socket.id) { // Don't emit to the socket's self-room
                    const userLeftMessage = `${socket.username || 'A user'} has disconnected.`;
                    // const systemMessage = await createSystemMessage(room, userLeftMessage); // Async op here is tricky
                    // if (systemMessage) io.to(room).emit('newMessage', systemMessage);
                    socket.to(room).emit('userLeftNotification', {
                        conversationId: room,
                        userId: socket.userId,
                        username: socket.username,
                        message: userLeftMessage
                    });
                     console.log(`[Disconnecting] "userLeftNotification" emitted to room ${room} for user ${socket.userId}`);
                }
            });
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Disconnect] User disconnected: SocketID: ${socket.id}, UserID: ${socket.userId}, Username: ${socket.username}, Reason: ${reason}`);
        });

        socket.on('error', (error) => {
            console.error(`[SocketError] Error on socket ${socket.id} (User: ${socket.userId}):`, error);
        });
    });

    return io;
};

module.exports = setupSocketIO; 