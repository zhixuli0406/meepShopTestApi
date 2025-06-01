// This module will handle Socket.IO server-side logic

console.log('[SocketManager_TOP] socketManager.js execution started. Timestamp:', new Date().toISOString()); 
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
    console.log(`[AuthService] isValidToken called for token: ${token ? token.substring(0, 10) + '...' : 'null'}`);
    if (token === 'valid-token-for-testing') {
        console.log('[AuthService] Token is the valid test token.');
        return true;
    }
    // In a real app, implement actual token validation.
    console.warn(`[AuthService] isValidToken: No real token validation implemented. Token received: ${token}`);
    return false; // Default to false if not the test token
}

async function getAuthenticatedUserFromToken(token) {
    // Example: Decode JWT and fetch user details from DB
    console.log(`[AuthService] getAuthenticatedUserFromToken called for token: ${token ? token.substring(0, 10) + '...' : 'null'}`);
    if (token === 'valid-token-for-testing') {
        // Simulate fetching a user for the test token
        // In a real scenario, you'd use the decoded token payload (e.g., userId) to find the user.
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // const user = await User.findById(decoded.id).lean();
        // return user ? { userId: user._id.toString(), username: user.username, avatar: user.avatar } : null;
        
        // FOR TESTING: Replace 'YOUR_REAL_OBJECT_ID_STRING_HERE' 
        // with an actual _id (as a string) from a user in your database.
        // If you don't have one readily available, you can use a placeholder like '000000000000000000000000' 
        // but the DB operations in conversationService might still fail if that user doesn't exist.
        // The BEST approach for this mock is to use an ID of a user that genuinely exists in your DB.
        const mockUser = { 
            userId: '60c72b2f9b1d8e001c8e4abc', // <<< IMPORTANT: REPLACE THIS with a REAL User ObjectId string from your DB
            username: 'MockTestUserWithRealObjectId',
            avatar: 'https://i.pravatar.cc/150?u=mockrealid' 
        };
        console.log('[AuthService] Mock user (intended to have DB-valid ObjectId) retrieved for test token:', mockUser);
        return mockUser;
    }
    console.warn(`[AuthService] getAuthenticatedUserFromToken: No real user retrieval from token implemented. Token: ${token}`);
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

    console.log('[SocketManager] Socket.IO server configured with CORS for origin:', process.env.CLIENT_URL || "*");

    // Socket.IO Authentication Middleware
    io.use(async (socket, next) => {
        const socketId = socket.id;
        let token = null;
        if (socket.handshake.auth && socket.handshake.auth.token) {
            token = socket.handshake.auth.token;
            console.log(`[AuthMiddleware] Token found in handshake.auth for socket ${socketId}`);
        } else if (socket.handshake.query && socket.handshake.query.token) {
            token = socket.handshake.query.token; // Fallback, less secure for tokens
            console.log(`[AuthMiddleware] Token found in handshake.query for socket ${socketId}`);
        }

        if (token) {
            console.log(`[AuthMiddleware] Attempting to validate token for socket ${socketId}: ${token.substring(0,10)}...`);
            const user = await getAuthenticatedUserFromToken(token);
            if (user && user.userId) {
                socket.userId = user.userId;
                socket.username = user.username;
                socket.avatar = user.avatar;
                console.log(`[AuthMiddleware] Authentication successful for socket ${socketId}. UserID: ${socket.userId}, Username: ${socket.username}`);
                next();
            } else {
                const authErrorMsg = 'Authentication error: Invalid token or user not found.';
                console.warn(`[AuthMiddleware] Authentication failed for socket ${socketId}: Could not retrieve user from token. Emitting 'authentication_error'.`);
                // Note: Emitting an event here might not reach the client if 'next(new Error())' closes the connection immediately.
                // The 'connect_error' event on the client is the primary way to catch this.
                next(new Error(authErrorMsg));
            }
        } else {
            const noTokenMsg = 'Authentication error: Token not provided.';
            console.warn(`[AuthMiddleware] Authentication failed for socket ${socketId}: No token provided. Emitting 'authentication_error'.`);
            next(new Error(noTokenMsg));
        }
    });

    io.on('connection', (socket) => {
        // This block is reached only if authentication via io.use() was successful
        console.log(`[Connection] User connected: SocketID: ${socket.id}, UserID: ${socket.userId}, Username: ${socket.username}`);

        socket.on('joinConversation', async (data) => {
            const conversationId = typeof data === 'string' ? data : data?.conversationId;
            const { userId, username, id: socketId } = socket;

            console.log(`[Event_JoinConversation] Received 'joinConversation' from UserID: ${userId} (SocketID: ${socketId}) for ConversationID: ${conversationId}, Data:`, data);
            
            if (!userId) {
                console.error(`[Event_JoinConversation] Critical: UserID not found on authenticated socket ${socketId}. This indicates an issue with the auth middleware flow.`);
                socket.emit('joinConversationError', { conversationId, message: 'Authentication integrity error. Please reconnect.' });
                console.log(`[Event_JoinConversation] Emitted 'joinConversationError' to SocketID: ${socketId} due to missing UserID.`);
                return;
            }

            if (!conversationId) {
                console.warn(`[Event_JoinConversation] User ${userId} (${username}) provided invalid conversationId: ${conversationId}. Data received:`, data);
                socket.emit('joinConversationError', { message: 'Invalid conversation ID provided.' });
                console.log(`[Event_JoinConversation] Emitted 'joinConversationError' to SocketID: ${socketId} due to invalid ConversationID.`);
                return;
            }

            try {
                console.log(`[JoinConversation_Logic] User ${userId} (${username}) attempting to join room: ${conversationId}`);
                socket.join(conversationId);
                console.log(`[JoinConversation_Logic] User ${userId} (${username}) successfully joined conversation room: ${conversationId}`);
                
                socket.emit('joinedConversation', { 
                    conversationId: conversationId,
                    status: 'success', 
                    message: `Successfully joined conversation ${conversationId}`
                });
                console.log(`[Event_JoinConversation] Emitted 'joinedConversation' to SocketID: ${socketId} for room ${conversationId}.`);

                const participants = await getConversationParticipants(conversationId);
                const isAlreadyParticipant = participants.some(p => p.userId.toString() === userId);

                if (!isAlreadyParticipant) {
                    const added = await addParticipantToConversation(conversationId, userId, username, socket.avatar);
                    if (added) {
                       console.log(`[JoinConversation_Logic] User ${userId} (${username}) added as a new participant to conversation ${conversationId}`);
                        const systemMessageContent = `${username || 'A user'} has joined the conversation.`;
                        const systemMessage = await createSystemMessage(conversationId, systemMessageContent);
                        if (systemMessage) {
                            io.to(conversationId).emit('newMessage', systemMessage);
                            console.log(`[Broadcast_NewMessage] System message (user joined) broadcasted to room ${conversationId}: "${systemMessageContent}"`);
                        } else {
                            console.warn(`[JoinConversation_Logic] Failed to create system message for user ${userId} joining ${conversationId}.`);
                        }
                    } else {
                        console.warn(`[JoinConversation_Logic] Failed to add user ${userId} as participant to ${conversationId}, though they were not listed.`);
                    }
                } else {
                    console.log(`[JoinConversation_Logic] User ${userId} (${username}) was already a participant in conversation ${conversationId}.`);
                }

            } catch (error) {
                console.error(`[Event_JoinConversation] Error for UserID: ${userId} (SocketID: ${socketId}) joining conversation ${conversationId}:`, error);
                socket.emit('joinConversationError', { conversationId, message: 'Server error while trying to join conversation.', details: error.message });
                console.log(`[Event_JoinConversation] Emitted 'joinConversationError' to SocketID: ${socketId} for room ${conversationId} due to server error.`);
            }
        });

        socket.on('leaveConversation', async ({ conversationId }) => {
            const { userId, username, id: socketId } = socket;
            console.log(`[Event_LeaveConversation] Received 'leaveConversation' from UserID: ${userId} (SocketID: ${socketId}) for ConversationID: ${conversationId}`);

            if (!conversationId) {
                console.warn(`[Event_LeaveConversation] User ${userId} (${username}) provided invalid conversationId for leaveConversation.`);
                socket.emit('leaveConversationError', { message: 'Invalid conversation ID provided for leaving.'});
                console.log(`[Event_LeaveConversation] Emitted 'leaveConversationError' to SocketID: ${socketId} due to invalid ConversationID.`);
                return;
            }
            try {
                console.log(`[LeaveConversation_Logic] User ${userId} (${username}) attempting to leave room: ${conversationId}`);
                socket.leave(conversationId);
                console.log(`[LeaveConversation_Logic] User ${userId} (${username}) left conversation room: ${conversationId}`);
                socket.emit('leftConversation', { conversationId, status: 'success' });
                console.log(`[Event_LeaveConversation] Emitted 'leftConversation' to SocketID: ${socketId} for room ${conversationId}.`);
                
                const userLeftMessage = `${username || 'A user'} has left the conversation.`;
                // Option 1: Create a system message and broadcast it as 'newMessage'
                // const systemMessage = await createSystemMessage(conversationId, userLeftMessage);
                // if (systemMessage) {
                //    io.to(conversationId).emit('newMessage', systemMessage);
                //    console.log(`[Broadcast_NewMessage] System message (user left) broadcasted to room ${conversationId}: "${userLeftMessage}"`);
                // } else {
                //    console.warn(`[LeaveConversation_Logic] Failed to create system message for user ${userId} leaving ${conversationId}.`);
                // }

                // Option 2: Emit a dedicated 'userLeftNotification' event (current implementation)
                // This avoids mixing system notifications with regular messages if desired.
                socket.to(conversationId).emit('userLeftNotification', {
                    conversationId,
                    userId: userId,
                    username: username,
                    message: userLeftMessage
                });
                console.log(`[Broadcast_UserLeft] "userLeftNotification" emitted to room ${conversationId} for UserID: ${userId}`);

            } catch (error) {
                console.error(`[Event_LeaveConversation] Error for UserID: ${userId} (SocketID: ${socketId}) leaving conversation ${conversationId}:`, error);
                socket.emit('leaveConversationError', { conversationId, message: 'Server error while trying to leave conversation.', details: error.message });
                console.log(`[Event_LeaveConversation] Emitted 'leaveConversationError' to SocketID: ${socketId} for room ${conversationId} due to server error.`);
            }
        });
        
        socket.on('disconnecting', (reason) => {
            const { userId, username, id: socketId } = socket;
            console.log(`[Event_Disconnecting] User disconnecting: SocketID: ${socketId}, UserID: ${userId}, Username: ${username}, Reason: ${reason}`);
            // Notify rooms the user is in
            socket.rooms.forEach(room => {
                if (room !== socketId) { // Don't emit to the socket's self-room (which is its own ID)
                    const userLeftMessage = `${username || 'A user'} has disconnected.`;
                    socket.to(room).emit('userLeftNotification', {
                        conversationId: room,
                        userId: userId,
                        username: username,
                        message: userLeftMessage
                    });
                     console.log(`[Broadcast_UserLeft_Disconnecting] "userLeftNotification" (due to disconnecting) emitted to room ${room} for UserID: ${userId}`);
                }
            });
        });

        socket.on('disconnect', (reason) => {
            const { userId, username, id: socketId } = socket;
            console.log(`[Event_Disconnect] User disconnected: SocketID: ${socketId}, UserID: ${userId}, Username: ${username}, Reason: ${reason}`);
        });

        socket.on('error', (error) => {
            const { userId, username, id: socketId } = socket;
            console.error(`[Event_SocketError] Error on SocketID: ${socketId} (UserID: ${userId}, Username: ${username}):`, error);
        });
    });

    // Global error handler for Socket.IO engine, useful for low-level errors
    io.engine.on('connection_error', (err) => {
        console.error('[SocketIO_Engine_Error] Low-level Socket.IO Engine Connection Error:', {
            code: err.code, // e.g., 1 (UNKNOWN_TRANSPORT), 2 (UNKNOWN_SID), etc.
            message: err.message, // e.g., "Transport unknown"
            context: err.context // Additional context, like the underlying request
        });
    });
    
    console.log('[SocketManager] Socket.IO event handlers configured.');
    return io;
};

module.exports = setupSocketIO; 