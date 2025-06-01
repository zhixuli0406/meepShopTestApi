const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    avatar: {
        type: String,
        trim: true
    }
}, {
    timestamps: true // This will add createdAt and updatedAt fields
});

const User = mongoose.model('User', userSchema);

module.exports = User; 