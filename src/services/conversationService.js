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
    console.log(`[ConvService] Attempting to add/ensure participant ${userId} (${username || 'N/A'}) in conversation ${conversationId}`);
    try {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            console.warn(`[ConvService] addParticipantToConversation: Conversation not found for ID: ${conversationId}`);
            return false; // Indicate failure: conversation not found
        }

        // Use $addToSet to add the userId to the participants array if it's not already present.
        // $addToSet returns the modified document if successful or the original if no change was needed (already present).
        const updateResult = await Conversation.updateOne(
            { _id: conversationId },
            { $addToSet: { participants: userId } }
        );

        if (updateResult.modifiedCount > 0) {
            console.log(`[ConvService] User ${userId} (${username || 'N/A'}) successfully added to conversation ${conversationId} participants array.`);
            return true; // Successfully added
        } else if (updateResult.matchedCount > 0 && updateResult.modifiedCount === 0) {
            // This means the conversation was found, but the user was already in the participants array (no modification needed by $addToSet)
            console.log(`[ConvService] User ${userId} (${username || 'N/A'}) was already a participant in conversation ${conversationId}. No change made by $addToSet.`);
            return true; // Still considered a success in terms of the user being a participant
        } else if (updateResult.matchedCount === 0) {
            // This case should ideally be caught by the initial findById, but as a safeguard for updateOne:
            console.warn(`[ConvService] addParticipantToConversation: Conversation not found for ID: ${conversationId} during updateOne.`);
            return false; // Conversation not found during update
        }
        
        // Fallback for unexpected updateResult scenarios, though less likely with $addToSet logic above.
        console.warn(`[ConvService] addParticipantToConversation: User ${userId} (${username || 'N/A'}) may not have been added to conversation ${conversationId}. UpdateResult:`, updateResult);
        return false;

    } catch (error) {
        console.error(`[ConvService] Error in addParticipantToConversation for conv ${conversationId}, user ${userId}:`, error);
        // Re-throw the error or return false depending on how you want to handle it upstream
        // For now, returning false to indicate failure at the service level.
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