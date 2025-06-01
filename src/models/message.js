const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: {
    type: String,
    enum: ['text', 'image', 'system'],
    required: true
  },
  content: {
    type: String,
    required: function() { return this.type === 'text' || this.type === 'system'; }
  },
  s3Key: {
    type: String,
    required: function() { return this.type === 'image'; }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

messageSchema.path('senderId').validate(function(value) {
  if (value === null || value === undefined) {
    return true;
  }
  return mongoose.Types.ObjectId.isValid(value);
}, 'Invalid senderId: must be a valid ObjectId if provided.');

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 