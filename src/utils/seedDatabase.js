const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose'); // Keep mongoose import for ObjectId if needed, but connection is managed externally
const User = require('../models/user.model');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const config = require('../../config'); // For NODE_ENV

const seedDatabase = async () => {
  if (config.nodeEnv !== 'development') {
    console.log('Skipping database seeding in non-development environment.');
    return;
  }

  try {
    const userCount = await User.countDocuments();
    // Check if any collection is empty, or a specific one like User
    if (userCount > 0) {
      console.log('Database already contains users. Skipping seed.');
      return;
    }

    console.log('Development environment and no users found. Proceeding with database seeding...');

    const chatDataPath = path.join(__dirname, '../../chat_data.json'); // Adjusted path from utils directory
    if (!fs.existsSync(chatDataPath)) {
        console.error(`Seed data file not found at ${chatDataPath}. Skipping seed.`);
        return;
    }
    const chatData = JSON.parse(fs.readFileSync(chatDataPath, 'utf-8'));

    const usersToCreate = [];
    const userMap = {}; // Stores legacyId -> MongoUser object

    // Consolidate user creation logic
    const addUserToProcess = (legacyId, username, avatar) => {
        if (!userMap[legacyId]) {
            usersToCreate.push({ legacyUserId: legacyId, username, avatar });
            userMap[legacyId] = { temp: true }; // Mark as pending creation
        }
    };

    chatData.conversations.forEach(conv => {
        conv.participants.forEach(p => addUserToProcess(p.userId, p.user, p.avatar));
    });
    chatData.messages.forEach(msg => {
        addUserToProcess(msg.userId, msg.user, msg.avatar);
    });
    
    const uniqueUsersToCreate = usersToCreate.filter((v, i, a) => a.findIndex(t => (t.legacyUserId === v.legacyUserId)) === i);
    
    if (uniqueUsersToCreate.length > 0) {
      console.log(`Attempting to create ${uniqueUsersToCreate.length} unique users from seed data.`);
      try {
        // Insert new users, ignore if they already exist (e.g., due to unique index on legacyUserId or username)
        await User.insertMany(uniqueUsersToCreate, { ordered: false });
      } catch (err) {
        if (err.code === 11000) { // Duplicate key error
          console.warn('Some users might already exist (duplicate legacyUserId or username during insertMany). This is usually fine if seeding an already partially seeded DB.');
        } else {
          console.error('Error inserting users during seed:', err);
          // Decide if to throw or continue
        }
      }
      // Fetch all users (newly created or pre-existing) that match the legacy IDs
      const existingAndNewUsers = await User.find({ legacyUserId: { $in: uniqueUsersToCreate.map(u => u.legacyUserId) } });
      existingAndNewUsers.forEach(u => {
          userMap[u.legacyUserId] = u; // Replace temp placeholder with actual user document
      });
      console.log(`${Object.values(userMap).filter(u => u && !u.temp).length} Users processed/found after creation attempt.`);
    } else {
        console.log('No new users to import based on legacy IDs found in seed data.');
    }


    const conversationsToCreate = [];
    const convMap = {}; // Stores legacyConvId -> MongoConversation object

    for (const convData of chatData.conversations) {
      const participantMongoIds = convData.participants
        .map(p => userMap[p.userId]?._id) // Use the populated userMap
        .filter(id => id); // Filter out undefined if a user wasn't found/created

      if (participantMongoIds.length !== convData.participants.length) {
        console.warn(`Legacy Conversation ${convData.id}: Not all participants were mapped. Mapped ${participantMongoIds.length}/${convData.participants.length}.`);
        // Decide if conversation is still valid (e.g., requires at least 2 participants)
        if (convData.participants.length >= 2 && participantMongoIds.length < 2) {
            console.error(`Skipping legacy conversation ${convData.id} due to insufficient mapped participants for a viable chat.`);
            continue;
        }
         if (participantMongoIds.length === 0 && convData.participants.length > 0) {
            console.error(`Skipping legacy conversation ${convData.id} as NO participants could be mapped.`);
            continue;
        }
      }
      
      conversationsToCreate.push({
        legacyConvId: convData.id,
        participants: participantMongoIds,
        // Assuming title is not in chat_data.json for conversations, if it is, add it here.
        // title: convData.title || `Conversation with ${convData.participants.map(p=>p.user).join(', ')}`,
        lastMessageText: convData.lastMessage,
        lastMessageTimestamp: convData.timestamp ? new Date(convData.timestamp) : new Date(),
        // createdBy: participantMongoIds[0] // Or decide a convention if needed
      });
    }
    
    if (conversationsToCreate.length > 0) {
      console.log(`Attempting to create ${conversationsToCreate.length} conversations.`);
      try {
        await Conversation.insertMany(conversationsToCreate, { ordered: false });
      } catch (err) {
        if (err.code === 11000) {
          console.warn('Some conversations might already exist (duplicate legacyConvId during insertMany).');
        } else {
          console.error('Error inserting conversations during seed:', err);
        }
      }
      const existingAndNewConversations = await Conversation.find({ legacyConvId: { $in: conversationsToCreate.map(c => c.legacyConvId) } });
      existingAndNewConversations.forEach(c => {
          convMap[c.legacyConvId] = c;
      });
      console.log(`${Object.values(convMap).length} Conversations processed/found after creation attempt.`);
    } else {
      console.log('No new conversations to import from seed data.');
    }

    const messagesToCreate = [];
    for (const msgData of chatData.messages) {
      const conversationMongoId = convMap[msgData.conversationId]?._id;
      const senderMongoId = userMap[msgData.userId]?._id;

      if (!conversationMongoId) {
        console.warn(`Message for legacyConvId ${msgData.conversationId} (content: "${String(msgData.message).substring(0,20)}...") skipped: Conversation not found in convMap.`);
        continue;
      }
      if (!senderMongoId) {
        console.warn(`Message by legacyUserId ${msgData.userId} (user: "${msgData.user}", content: "${String(msgData.message).substring(0,20)}...") skipped: User not found in userMap.`);
        continue;
      }

      messagesToCreate.push({
        conversationId: conversationMongoId,
        legacyConvId: msgData.conversationId,
        senderId: senderMongoId,
        legacySenderId: msgData.userId,
        type: msgData.messageType === 'text' ? 'text' : (msgData.messageType === 'image' ? 'image' : 'text'), // Basic mapping
        content: msgData.message,
        reactions: msgData.reactions || {},
        createdAt: msgData.timestamp ? new Date(msgData.timestamp) : new Date(),
      });
    }

    if (messagesToCreate.length > 0) {
      console.log(`Attempting to insert ${messagesToCreate.length} messages.`);
      try {
        // Consider if messages need an idempotency check or if duplicates are okay/unlikely
        await Message.insertMany(messagesToCreate, { ordered: false });
        console.log(`${messagesToCreate.length} Messages were processed for insertion.`);
      } catch (err) {
        // Message insertion errors might be less critical to halt on, or could indicate issues.
        // Duplicate errors (11000) are less likely for messages unless they have a unique index beyond _id.
        console.error('Error inserting messages during seed:', err.message, '(some messages may not have been inserted)');
      }
    } else {
      console.log('No messages to import from seed data.');
    }

    console.log('Database seeding process completed.');

  } catch (error) {
    console.error('Error during database seeding process:', error);
    // Do not exit process(1) here, let the application continue or handle it in server.js
  }
};

module.exports = seedDatabase; 