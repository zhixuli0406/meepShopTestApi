const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'system'], // Added 'system' based on chat_data.json
    required: true
  },
  content: {
    type: String,
    required: true
  },
  s3Key: {
    type: String // Optional: for image type messages, storing the S3 object key
  },
  // reactions: { type: Schema.Types.Mixed } // As seen in chat_data.json, could be a future enhancement
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only manage createdAt
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 