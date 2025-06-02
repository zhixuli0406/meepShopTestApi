const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  like: { type: Number, default: 0 },
  love: { type: Number, default: 0 },
  laugh: { type: Number, default: 0 },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  legacyConvId: { 
    type: Number,
    index: true,
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  legacySenderId: { 
    type: Number,
    index: true,
  },
  type: { 
    type: String,
    required: true,
    enum: ['text', 'image', 'system'], 
    default: 'text',
  },
  content: { 
    type: String,
    required: true,
    trim: true,
  },
  reactions: { 
    type: reactionSchema,
    default: () => ({}),
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true, 
});

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 