const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  // Consider if we should store the last message content directly for quick display
  // lastMessageContent: { type: String },
  // lastMessageTimestamp: { type: Date },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // This will automatically manage createdAt and updatedAt
});

// Middleware to update `updatedAt` on save, if not using {timestamps: true}
// conversationSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation; 