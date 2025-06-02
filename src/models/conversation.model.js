const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  legacyConvId: { // From chat_data.json id
    type: Number,
    unique: true,
    sparse: true,
    index: true,
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  title: { // Optional for group chats
    type: String,
    trim: true,
  },
  lastMessageText: { // From chat_data.json lastMessage
    type: String,
    trim: true,
  },
  lastMessageTimestamp: { // From chat_data.json conversation.timestamp
    type: Date,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation; 