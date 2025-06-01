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
    default: 'https://i.pravatar.cc/150?img=default' // Default avatar if not provided
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only manage createdAt
});

const User = mongoose.model('User', userSchema);

module.exports = User; 