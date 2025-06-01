const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: [/^[a-zA-Z0-9]+$/, 'Username must be alphanumeric']
  },
  avatar: {
    type: String,
    trim: true,
    default: 'https://i.pravatar.cc/150?img=defaultUser' // A default avatar
  },
  avatarS3Key: { // New field for S3 object key of the avatar
    type: String,
    trim: true,
    default: null
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