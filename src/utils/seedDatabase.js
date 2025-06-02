const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose'); // Keep mongoose import for ObjectId if needed, but connection is managed externally
const User = require('../models/user.model');
const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const config = require('../../config'); // For NODE_ENV

const seedDatabase = async () => {
  console.log('[SEEDER] Checking conditions for database seeding...');
  console.log(`[SEEDER] Current NODE_ENV: ${config.nodeEnv}`);

  if (config.nodeEnv !== 'development') {
    console.log('[SEEDER] Skipped: Not in development environment.');
    return;
  }
  console.log('[SEEDER] Condition met: Running in development environment.');

  try {
    console.log('[SEEDER] Checking existing user count...');
    const userCount = await User.countDocuments();
    console.log(`[SEEDER] Found ${userCount} users in the database.`);

    if (userCount > 0) {
      console.log('[SEEDER] Skipped: Database already contains users.');
      return;
    }
    console.log('[SEEDER] Condition met: No users found, proceeding with seed.');

    const chatDataPath = path.join(__dirname, '../../chat_data.json'); // Adjusted path from utils directory
    console.log(`[SEEDER] Looking for seed data file at: ${chatDataPath}`);

    if (!fs.existsSync(chatDataPath)) {
        console.error(`[SEEDER] Skipped: Seed data file not found at ${chatDataPath}.`);
        return;
    }
    console.log('[SEEDER] Seed data file found. Reading and parsing...');
    const chatData = JSON.parse(fs.readFileSync(chatDataPath, 'utf-8'));
    console.log('[SEEDER] Seed data parsed successfully.');

    const usersToCreate = [];
    const userMap = {}; // Stores legacyId -> MongoUser object

    console.log('[SEEDER] Processing users from seed data...');
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
      console.log(`[SEEDER] Attempting to create ${uniqueUsersToCreate.length} unique users.`);
      try {
        await User.insertMany(uniqueUsersToCreate, { ordered: false });
        console.log(`[SEEDER] User.insertMany executed for ${uniqueUsersToCreate.length} users.`);
      } catch (err) {
        if (err.code === 11000) {
          console.warn('[SEEDER] Warning during User.insertMany: Some users might already exist (duplicate legacyUserId or username). This is usually fine.');
        } else {
          console.error('[SEEDER] Error during User.insertMany:', err);
        }
      }
      const existingAndNewUsers = await User.find({ legacyUserId: { $in: uniqueUsersToCreate.map(u => u.legacyUserId) } });
      existingAndNewUsers.forEach(u => {
          userMap[u.legacyUserId] = u;
      });
      console.log(`[SEEDER] ${Object.values(userMap).filter(u => u && !u.temp).length} Users in userMap after creation/fetch attempt.`);
    } else {
        console.log('[SEEDER] No new users to import from seed data.');
    }

    console.log('[SEEDER] Processing conversations from seed data...');
    const conversationsToCreate = [];
    const convMap = {}; 

    for (const convData of chatData.conversations) {
      const participantMongoIds = convData.participants
        .map(p => userMap[p.userId]?._id) 
        .filter(id => id); 

      if (participantMongoIds.length !== convData.participants.length) {
        console.warn(`[SEEDER] Legacy Conversation ${convData.id}: Not all participants were mapped. Mapped ${participantMongoIds.length}/${convData.participants.length}.`);
        if (convData.participants.length >= 2 && participantMongoIds.length < 2) {
            console.error(`[SEEDER] Skipping legacy conversation ${convData.id} due to insufficient mapped participants.`);
            continue;
        }
         if (participantMongoIds.length === 0 && convData.participants.length > 0) {
            console.error(`[SEEDER] Skipping legacy conversation ${convData.id} as NO participants could be mapped.`);
            continue;
        }
      }
      
      conversationsToCreate.push({
        legacyConvId: convData.id,
        participants: participantMongoIds,
        lastMessageText: convData.lastMessage,
        lastMessageTimestamp: convData.timestamp ? new Date(convData.timestamp) : new Date(),
      });
    }
    
    if (conversationsToCreate.length > 0) {
      console.log(`[SEEDER] Attempting to create ${conversationsToCreate.length} conversations.`);
      try {
        await Conversation.insertMany(conversationsToCreate, { ordered: false });
        console.log(`[SEEDER] Conversation.insertMany executed for ${conversationsToCreate.length} conversations.`);
      } catch (err) {
        if (err.code === 11000) {
          console.warn('[SEEDER] Warning during Conversation.insertMany: Some conversations might already exist.');
        } else {
          console.error('[SEEDER] Error during Conversation.insertMany:', err);
        }
      }
      const existingAndNewConversations = await Conversation.find({ legacyConvId: { $in: conversationsToCreate.map(c => c.legacyConvId) } });
      existingAndNewConversations.forEach(c => {
          convMap[c.legacyConvId] = c;
      });
      console.log(`[SEEDER] ${Object.values(convMap).length} Conversations in convMap after creation/fetch attempt.`);
    } else {
      console.log('[SEEDER] No new conversations to import from seed data.');
    }

    console.log('[SEEDER] Processing messages from seed data...');
    const messagesToCreate = [];
    for (const msgData of chatData.messages) {
      const conversationMongoId = convMap[msgData.conversationId]?._id;
      const senderMongoId = userMap[msgData.userId]?._id;

      if (!conversationMongoId) {
        console.warn(`[SEEDER] Message for legacyConvId ${msgData.conversationId} (content: "${String(msgData.message).substring(0,20)}...") skipped: Conv not found in convMap.`);
        continue;
      }
      if (!senderMongoId) {
        console.warn(`[SEEDER] Message by legacyUserId ${msgData.userId} (user: "${msgData.user}", content: "${String(msgData.message).substring(0,20)}...") skipped: User not found in userMap.`);
        continue;
      }

      messagesToCreate.push({
        conversationId: conversationMongoId,
        legacyConvId: msgData.conversationId,
        senderId: senderMongoId,
        legacySenderId: msgData.userId,
        type: msgData.messageType === 'text' ? 'text' : (msgData.messageType === 'image' ? 'image' : 'text'),
        content: msgData.message,
        reactions: msgData.reactions || {},
        createdAt: msgData.timestamp ? new Date(msgData.timestamp) : new Date(),
      });
    }

    if (messagesToCreate.length > 0) {
      console.log(`[SEEDER] Attempting to insert ${messagesToCreate.length} messages.`);
      try {
        await Message.insertMany(messagesToCreate, { ordered: false });
        console.log(`[SEEDER] ${messagesToCreate.length} Messages were processed for insertion by Message.insertMany.`);
      } catch (err) {
        console.error('[SEEDER] Error inserting messages during seed Message.insertMany:', err.message);
      }
    } else {
      console.log('[SEEDER] No messages to import from seed data.');
    }

    console.log('[SEEDER] Database seeding process finished.');

  } catch (error) {
    console.error('[SEEDER] CRITICAL ERROR during database seeding process:', error);
    console.error(error.stack); // Print stack trace for more details
  }
};

module.exports = seedDatabase; 