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
        // This can be null initially or if a conversation has no messages
    }
}, {
    timestamps: true // This will add createdAt and updatedAt fields
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation; 