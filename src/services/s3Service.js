const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK v3
// Credentials and region should be configured via environment variables or IAM roles when deployed.
// Ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (if not using IAM roles), and AWS_REGION are set.
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: { // Only include credentials if NOT using IAM roles for EC2 or Lambda
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const bucketName = process.env.AWS_S3_BUCKET_NAME;

/**
 * Generates a pre-signed URL for uploading a file to S3.
 * @param {string} originalFilename - The original name of the file.
 * @param {string} contentType - The MIME type of the file (e.g., 'image/jpeg').
 * @param {string} userId - ID of the user uploading, for organizing files.
 * @param {string} [uploadType=\'general\'] - Type of upload, e.g., 'avatar', 'chat_image'.
 * @returns {Promise<{ signedUrl: string, objectKey: string, fileUrl: string }>} An object containing the pre-signed URL, the S3 object key, and the final public URL.
 */
exports.generatePresignedPutUrl = async ({ originalFilename, contentType, userId, uploadType = 'chat_image' }) => {
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME is not configured.');
  }
  if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION is not configured.');
  }
  if (!originalFilename || !contentType || !userId) {
    throw new Error('Original filename, content type, and userId are required.');
  }

  const fileExtension = originalFilename.split('.').pop() || 'bin';
  const uniqueId = uuidv4();
  // Sanitize filename - keep it simple for avatars
  const baseFilename = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
  const sanitizedFilename = `${baseFilename.replace(/[^a-zA-Z0-9_.-]/g, '_')}.${fileExtension}`;
  
  let objectPathPrefix = 'uploads/general/';
  if (uploadType === 'avatar') {
    objectPathPrefix = `uploads/avatars/${userId}/`;
  } else if (uploadType === 'chat_image') {
    // Example for chat images, assuming you might pass a conversationId or other context
    // For now, let's assume chat images might also be user-specific if not tied to a conversationId directly here
    objectPathPrefix = `uploads/chat_images/${userId}/`; 
  }
  
  const objectKey = `${objectPathPrefix}${uniqueId}-${sanitizedFilename}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
    // ACL: 'public-read' // For S3 v3, ACLs are handled differently. Prefer bucket policies or default object ownership.
                          // If you need objects to be public, ensure your bucket policy allows s3:GetObject for public.
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // URL expires in 5 minutes
    
    // Construct the final public URL. This might vary based on your S3 setup (e.g., if using CloudFront)
    // Make sure your bucket has public access enabled OR use CloudFront with OAI for secure access.
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${objectKey}`;
    
    return { signedUrl, objectKey, fileUrl };
  } catch (error) {
    console.error('Error generating pre-signed URL (SDK v3):', error);
    throw new Error('Could not generate pre-signed URL for S3 upload.');
  }
};

/**
 * Deletes a file from S3.
 * @param {string} objectKey - The S3 object key of the file to delete.
 * @returns {Promise<void>}
 */
exports.deleteFile = async (objectKey) => {
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME is not configured.');
  }
  if (!objectKey) {
    throw new Error('S3 object key is required for deletion.');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  try {
    await s3Client.send(command);
    console.log(`Successfully deleted ${objectKey} from S3 bucket ${bucketName}`);
  } catch (error) {
    console.error(`Error deleting file ${objectKey} from S3:`, error);
    // Decide if you want to re-throw or handle (e.g., if file not found is not an error for your use case)
    // For now, re-throwing to let the caller know.
    throw new Error(`Could not delete file ${objectKey} from S3.`);
  }
}; 