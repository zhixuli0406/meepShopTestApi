// Placeholder for database configuration
// We'll use environment variables for sensitive data like connection strings

module.exports = {
    mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/chat_app_db', // Default for local dev
    // Add other database related configurations if needed
}; 