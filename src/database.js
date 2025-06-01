const mongoose = require('mongoose');
const dbConfig = require('./config/database.config');

const connectDB = async () => {
    try {
        await mongoose.connect(dbConfig.mongoURI, {
            // For Mongoose 6 and later, useNewUrlParser and useUnifiedTopology
            // are true by default and no longer need to be explicitly set.
            // useCreateIndex and useFindAndModify are also no longer supported.
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB; 