const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user'); // Needed to add participant details

const getConversationParticipants = async (conversationId) => {
    try {
        const conversation = await Conversation.findById(conversationId)
            .populate({
                path: 'participants',
                select: 'username avatar' // Select only username and avatar
            })
            .lean(); // Use lean for faster, plain JS objects

        if (!conversation) {
            console.warn(`[ConvService] Conversation not found for ID: ${conversationId}`);
            return [];
        }

        // Map to the desired format { userId, username, avatar }
        return conversation.participants.map(p => ({
            userId: p._id.toString(), 
            username: p.username,
            avatar: p.avatar
        }));
    } catch (error) {
        console.error(`[ConvService] Error fetching participants for conversation ${conversationId}:`, error);
        return []; // Return empty array on error to prevent crashes
    }
};

const addParticipantToConversation = async (conversationId, userId, username, avatar) => {
    try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            console.warn(`[ConvService] addParticipantToConversation: Conversation ${conversationId} not found.`);
            return false;
        }

        // Check if user is already a participant
        const isAlreadyParticipant = conversation.participants.some(pId => pId.toString() === userId);
        if (isAlreadyParticipant) {
            console.log(`[ConvService] User ${userId} is already a participant in conversation ${conversationId}.`);
            return false; // Not an error, but no change made
        }

        // Add new participant
        conversation.participants.push(userId); // Assuming userId is a valid ObjectId string or ObjectId
        await conversation.save();
        console.log(`[ConvService] User ${userId} (${username}) added to conversation ${conversationId}.`);
        return true;
    } catch (error) {
        console.error(`[ConvService] Error adding participant ${userId} to conversation ${conversationId}:`, error);
        return false;
    }
};


const createSystemMessage = async (conversationId, content) => {
    try {
        const systemMessage = new Message({
            conversationId: conversationId,
            // senderId: null, // System messages might not have a conventional sender, or a designated system user ID
            type: 'system',
            content: content,
        });
        await systemMessage.save();

        // Populate sender information (even if null, or for a system user)
        // For now, we don't have a system user, so sender will be effectively null
        const populatedMessage = {
            id: systemMessage._id.toString(),
            conversationId: systemMessage.conversationId.toString(),
            sender: null, // Or a system user object if you define one
            type: systemMessage.type,
            content: systemMessage.content,
            timestamp: systemMessage.createdAt.toISOString(),
        };

        // Also update the conversation's lastMessage
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: systemMessage._id,
            updatedAt: Date.now(),
        });

        console.log(`[ConvService] System message created for conversation ${conversationId}: "${content}"`);
        return populatedMessage;
    } catch (error) {
        console.error(`[ConvService] Error creating system message for conversation ${conversationId}:`, error);
        return null;
    }
};

module.exports = {
    getConversationParticipants,
    addParticipantToConversation,
    createSystemMessage,
}; 