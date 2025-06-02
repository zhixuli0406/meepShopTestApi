// config/index.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); // Load environment variables from .env file

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGO_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    s3BucketName: process.env.AWS_S3_BUCKET_NAME,
    s3PresignedUrlExpiresIn: parseInt(process.env.AWS_S3_PRESIGNED_URL_EXPIRES_IN, 10) || 300,
  }
};

// Validate essential configurations
if (!config.mongoURI) {
  console.error('FATAL ERROR: MONGO_URI is not defined.');
  process.exit(1);
}

if (!config.jwt.secret) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !config.aws.region || !config.aws.s3BucketName) {
  console.warn('WARNING: AWS S3 credentials or bucket name are not fully configured. Image upload functionality will be affected.');
}

module.exports = config; 