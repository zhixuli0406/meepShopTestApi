const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI, {
      // useNewUrlParser: true, // Deprecated in Mongoose 6
      // useUnifiedTopology: true, // Deprecated in Mongoose 6
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB; 