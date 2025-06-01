const fs = require('fs').promises;
const path = require('path');
const User = require('./models/user');
const Conversation = require('./models/conversation');
const Message = require('./models/message');

// Helper function to check if initial load is needed (e.g., by checking if User collection is empty)
async function isInitialLoadNeeded() {
    try {
        const userCount = await User.countDocuments();
        // If there are no users, assume initial load is needed.
        // You might want a more robust check, e.g., a specific flag in the DB or config.
        return userCount === 0;
    } catch (error) {
        console.error("Error checking if initial load is needed:", error);
        return false; // Default to not loading if there's an error, to be safe
    }
}

async function loadInitialData() {
    try {
        const shouldLoad = await isInitialLoadNeeded();
        if (!shouldLoad) {
            console.log("Initial data already loaded or not needed. Skipping.");
            return;
        }
        console.log("Starting initial data load...");

        const filePath = path.join(__dirname, '..', 'chat_data.json'); // Assuming chat_data.json is in the root
        const jsonData = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(jsonData);

        const { conversations: jsonConversations, messages: jsonMessages } = data;

        // 1. Load Users
        const usersToCreate = [];
        const jsonUserIdToMongoUserIdMap = new Map();
        const usernamesLoaded = new Set();

        // Collect users from conversations participants
        for (const convo of jsonConversations) {
            for (const p of convo.participants) {
                if (!usernamesLoaded.has(p.user)) {
                    usersToCreate.push({ username: p.user, avatar: p.avatar, originalJsonId: p.userId });
                    usernamesLoaded.add(p.user);
                }
            }
        }
        // Collect users from messages (in case some users only sent messages but are not in convo.participants explicitly, or for completeness)
        for (const msg of jsonMessages) {
             if (!usernamesLoaded.has(msg.user)) {
                usersToCreate.push({ username: msg.user, avatar: msg.avatar, originalJsonId: msg.userId });
                usernamesLoaded.add(msg.user);
            }
        }
        
        const createdUsers = await User.insertMany(usersToCreate.map(u => ({username: u.username, avatar: u.avatar})));
        // Correctly map originalJsonId to the new MongoDB _id
        usersToCreate.forEach(originalUser => {
            const createdUserDoc = createdUsers.find(uDoc => uDoc.username === originalUser.username);
            if (createdUserDoc) {
                jsonUserIdToMongoUserIdMap.set(originalUser.originalJsonId, createdUserDoc._id);
            }
        });
        console.log(`${createdUsers.length} users loaded.`);


        // 2. Load Conversations
        const conversationsToCreate = [];
        const jsonConversationIdToMongoConversationIdMap = new Map();

        for (const convo of jsonConversations) {
            const participantMongoIds = convo.participants
                .map(p => jsonUserIdToMongoUserIdMap.get(p.userId))
                .filter(id => id); // Filter out undefined IDs if any participant wasn't found

            if (participantMongoIds.length === convo.participants.length) { // Ensure all participants were found
                conversationsToCreate.push({
                    participants: participantMongoIds,
                    // lastMessage will be updated later
                    createdAt: new Date(convo.timestamp), // Assuming timestamp is epoch ms
                    updatedAt: new Date(convo.timestamp),
                    originalJsonId: convo.id
                });
            } else {
                console.warn(`Skipping conversation with original ID ${convo.id} due to missing participant mappings.`);
            }
        }
        const createdConversations = await Conversation.insertMany(conversationsToCreate.map(c => ({participants: c.participants, createdAt: c.createdAt, updatedAt: c.updatedAt })));
        
        // Correctly map originalJsonId to the new MongoDB _id
        conversationsToCreate.forEach(originalConvo => {
            // Find the created conversation. This match might need to be more robust.
            const createdConvoDoc = createdConversations.find(cDoc => 
                cDoc.participants.length === originalConvo.participants.length &&
                cDoc.participants.every((pId, index) => pId.equals(originalConvo.participants[index])) &&
                cDoc.createdAt.getTime() === originalConvo.createdAt.getTime()
            );
            if(createdConvoDoc){
                 jsonConversationIdToMongoConversationIdMap.set(originalConvo.originalJsonId, createdConvoDoc._id);
            }
        });
        console.log(`${createdConversations.length} conversations loaded.`);

        // 3. Load Messages
        const messagesToCreate = [];
        for (const msg of jsonMessages) {
            const mongoConversationId = jsonConversationIdToMongoConversationIdMap.get(msg.conversationId);
            const mongoSenderId = jsonUserIdToMongoUserIdMap.get(msg.userId);

            if (mongoConversationId && mongoSenderId) {
                let messageType = 'text'; // Default to text
                if (msg.messageType) {
                    const lowerMessageType = msg.messageType.toLowerCase();
                    if (lowerMessageType === 'image') {
                        messageType = 'image';
                    } else if (lowerMessageType === 'system') {
                        messageType = 'system';
                    }
                    // Any other explicit messageType will default to text unless handled here
                }

                messagesToCreate.push({
                    conversationId: mongoConversationId,
                    senderId: mongoSenderId,
                    type: messageType, 
                    content: msg.message, // This is the text or image URL
                    createdAt: new Date(msg.timestamp), // Assuming timestamp is epoch ms
                    // s3Key can be added if we derive it from the URL or if JSON provides it
                });
            } else {
                 console.warn(`Skipping message due to missing conversation or sender mapping. Original convo ID: ${msg.conversationId}, user ID: ${msg.userId}`);
            }
        }
        await Message.insertMany(messagesToCreate);
        console.log(`${messagesToCreate.length} messages loaded.`);

        // 4. Update Conversation.lastMessage
        const allConversationsFromDB = await Conversation.find().populate('participants'); // Renamed to avoid conflict
        for (const convo of allConversationsFromDB) {
            const lastMsg = await Message.findOne({ conversationId: convo._id })
                                         .sort({ createdAt: -1 });
            if (lastMsg) {
                convo.lastMessage = lastMsg._id;
                // Also update the conversation's updatedAt to the last message's timestamp for consistency
                convo.updatedAt = lastMsg.createdAt;
                await convo.save();
            }
        }
        console.log("Updated lastMessage for conversations.");
        console.log("Initial data load completed successfully.");

    } catch (error) {
        console.error("Error during initial data load:", error);
        // Decide if you want to exit or let the app continue without initial data
    }
}

module.exports = { loadInitialData, isInitialLoadNeeded }; 