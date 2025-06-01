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
        enum: ['text', 'image'],
        required: true
    },
    content: { // For text, it's the message string; for image, it's the S3 URL
        type: String,
        required: true,
        trim: true
    },
    s3Key: { // Optional: For S3 object management if we upload directly from backend
        type: String,
        trim: true
    }
}, {
    timestamps: true // This will add createdAt and updatedAt fields
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 