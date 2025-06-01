const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid'); // For generating unique filenames or parts of keys

// Configure AWS SDK
// Credentials and region should be configured via environment variables or IAM roles when deployed.
// For local development, ensure AWS CLI is configured or environment variables are set.
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const bucketName = process.env.AWS_S3_BUCKET_NAME;

/**
 * Generates a pre-signed URL for uploading a file to S3.
 * @param {string} originalFilename - The original name of the file.
 * @param {string} contentType - The MIME type of the file (e.g., 'image/jpeg').
 * @param {string} [userId='anonymous'] - Optional: ID of the user uploading, for organizing files.
 * @param {string} [conversationId='general'] - Optional: ID of the conversation, for organizing files.
 * @returns {Promise<{ signedUrl: string, objectKey: string, fileUrl: string }>} An object containing the pre-signed URL, the S3 object key, and the final public URL.
 */
exports.getPresignedUrlForUpload = async ({ originalFilename, contentType, userId = 'anonymous', conversationId = 'general' }) => {
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME is not configured.');
  }
  if (!originalFilename || !contentType) {
    throw new Error('Original filename and content type are required.');
  }

  const fileExtension = originalFilename.split('.').pop() || 'bin';
  const uniqueId = uuidv4();
  // Sanitize filename parts if necessary
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  
  // Construct a structured S3 key
  const objectKey = `uploads/conversations/${conversationId}/users/${userId}/${uniqueId}-${sanitizedFilename}`;

  const params = {
    Bucket: bucketName,
    Key: objectKey,
    Expires: 60 * 5, // URL expires in 5 minutes (300 seconds)
    ContentType: contentType,
    // ACL: 'public-read' // Uncomment if uploaded files should be publicly readable by default
                           // Or manage permissions via bucket policy.
  };

  try {
    const signedUrl = await s3.getSignedUrlPromise('putObject', params);
    // Construct the final public URL. This might vary based on your S3 setup (e.g., if using CloudFront)
    const fileUrl = `https://${bucketName}.s3.${AWS.config.region || 'your-default-region'}.amazonaws.com/${objectKey}`;
    
    return { signedUrl, objectKey, fileUrl };
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw new Error('Could not generate pre-signed URL for S3 upload.');
  }
}; 