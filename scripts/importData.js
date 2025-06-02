// scripts/importData.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/user.model');
const Conversation = require('../src/models/conversation.model');
const Message = require('../src/models/message.model');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for data import...');
  } catch (err) {
    console.error('MongoDB Connection Error for import:',err.message);
    process.exit(1);
  }
};

const importData = async () => {
  try {
    await connectDB();

    // Comment out deleteMany in production or if appending data
    // await User.deleteMany();
    // await Conversation.deleteMany();
    // await Message.deleteMany();
    // console.log('Existing data cleared (Users, Conversations, Messages).');

    const chatDataPath = path.join(__dirname, '../chat_data.json');
    const chatData = JSON.parse(fs.readFileSync(chatDataPath, 'utf-8'));

    const usersToCreate = [];
    const userMap = {}; 

    for (const conv of chatData.conversations) {
      for (const p of conv.participants) {
        if (!userMap[p.userId]) { 
          usersToCreate.push({
            legacyUserId: p.userId,
            username: p.user,
            avatar: p.avatar,
          });
          userMap[p.userId] = { temp: true }; 
        }
      }
    }
     for (const msg of chatData.messages) {
        if (!userMap[msg.userId]) {
             usersToCreate.push({
                legacyUserId: msg.userId,
                username: msg.user,
                avatar: msg.avatar,
            });
            userMap[msg.userId] = { temp: true };
        }
    }
    
    const uniqueUsersToCreate = usersToCreate.filter((v,i,a)=>a.findIndex(t=>(t.legacyUserId === v.legacyUserId))===i);
    
    if (uniqueUsersToCreate.length > 0) {
      try {
        await User.insertMany(uniqueUsersToCreate, { ordered: false });
      } catch (err) {
        if (err.code === 11000) { 
          console.warn('Some legacy users might already exist (duplicate legacyUserId or username). Continuing by fetching existing users.');
        } else {
          throw err; 
        }
      }
      (await User.find({legacyUserId: {$in: uniqueUsersToCreate.map(u => u.legacyUserId) }})).forEach(u => {
          userMap[u.legacyUserId] = u; 
      });
      console.log(`${Object.values(userMap).filter(u => u && !u.temp).length} Users processed/found.`);
    } else {
        console.log('No new users to import based on legacy IDs found in conversations/messages.');
    }

    const conversationsToCreate = [];
    const convMap = {};

    for (const convData of chatData.conversations) {
      const participantMongoIds = convData.participants
        .map(p => userMap[p.userId]?._id)
        .filter(id => id);

      if (participantMongoIds.length !== convData.participants.length) {
        console.warn(`Conversation ${convData.id} has unmapped participants. Mapped ${participantMongoIds.length}/${convData.participants.length}`);
         if (convData.participants.length >= 2 && participantMongoIds.length < 2) {
            console.error(`Skipping legacy conversation ${convData.id} due to insufficient mapped participants for a viable chat.`);
            continue;
        }
      }
       if (participantMongoIds.length === 0 && convData.participants.length > 0) {
            console.error(`Skipping legacy conversation ${convData.id} as no participants could be mapped.`);
            continue;
        }

      conversationsToCreate.push({
        legacyConvId: convData.id,
        participants: participantMongoIds,
        lastMessageText: convData.lastMessage,
        lastMessageTimestamp: convData.timestamp ? new Date(convData.timestamp) : new Date(),
      });
    }

    if (conversationsToCreate.length > 0) {
      try {
        await Conversation.insertMany(conversationsToCreate, { ordered: false });
      } catch (err) {
         if (err.code === 11000) {
              console.warn('Some legacy conversations might already exist. Continuing by fetching existing.');
          } else {
            throw err;
        }
      }
      (await Conversation.find({legacyConvId: {$in: conversationsToCreate.map(c => c.legacyConvId) }})).forEach(c => {
          convMap[c.legacyConvId] = c;
      });
      console.log(`${Object.values(convMap).length} Conversations processed/found.`);
    } else {
        console.log('No new conversations to import.');
    }

    const messagesToCreate = [];
    for (const msgData of chatData.messages) {
      const conversationMongoId = convMap[msgData.conversationId]?._id;
      const senderMongoId = userMap[msgData.userId]?._id;

      if (!conversationMongoId) {
        console.warn(`Message for legacyConvId ${msgData.conversationId} (content: "${msgData.message.substring(0,20)}...") skipped: Conversation not found in convMap.`);
        continue;
      }
      if (!senderMongoId) {
        console.warn(`Message by legacyUserId ${msgData.userId} (user: "${msgData.user}", content: "${msgData.message.substring(0,20)}...") skipped: User not found in userMap.`);
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
      try {
        await Message.insertMany(messagesToCreate, { ordered: false });
        console.log(`${messagesToCreate.length} Messages attempted to insert.`);
      } catch (err) {
          console.error('Error inserting messages:', err.message, '(some messages may not have been inserted if duplicates or other issues)');
      }
    } else {
        console.log('No messages to import.');
    }

    console.log('Data Import Script Finished.');
    process.exit();
  } catch (error) {
    console.error('Error during data import script execution:', error);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();
    await User.deleteMany();
    await Conversation.deleteMany();
    await Message.deleteMany();
    console.log('Data Destroyed! (Users, Conversations, Messages)');
    process.exit();
  } catch (error) {
    console.error('Error destroying data:', error);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
} 