const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  legacyUserId: { // From chat_data.json userId
    type: Number,
    unique: true,
    sparse: true, // Allows multiple documents to have a null value for this field if not provided
    index: true,
  },
  username: { // From chat_data.json user
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    minlength: 6,
  },
  avatar: { // From chat_data.json avatar
    type: String,
    trim: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Hash password before saving if it's modified (or new)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false; // No password set for this user
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 