const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK v3
let s3ClientConfig = {
  region: process.env.AWS_REGION,
};

// Conditionally add credentials only if both accessKeyId and secretAccessKey are present
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3ClientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}
const s3Client = new S3Client(s3ClientConfig);

const bucketName = process.env.AWS_S3_BUCKET_NAME;

/**
 * Generates a pre-signed URL for uploading a file to S3.
 * @param {string} originalFilename - The original name of the file.
 * @param {string} contentType - The MIME type of the file (e.g., 'image/jpeg').
 * @param {string} userId - ID of the user uploading, for organizing files. (Can be optional if uploadType doesn't require it)
 * @param {string} uploadType - Type of upload, e.g., 'avatar', 'message_image'.
 * @returns {Promise<{ signedUrl: string, objectKey: string, fileUrl: string }>} An object containing the pre-signed URL, the S3 object key, and the final public URL.
 */
const getPresignedUrlForUpload = async ({ originalFilename, contentType, userId, uploadType = 'general' }) => {
  if (!bucketName) {
    // This error will be caught by the controller and then by the global error handler
    const error = new Error('AWS S3 儲存桶名稱未設定。');
    error.errorCode = 'S3_BUCKET_NOT_CONFIGURED';
    error.status = 500; // Internal server error, as it's a config issue
    throw error;
  }
  if (!process.env.AWS_REGION) {
    const error = new Error('AWS 區域未設定。');
    error.errorCode = 'S3_REGION_NOT_CONFIGURED';
    error.status = 500;
    throw error;
  }
  if (!originalFilename || !contentType) {
    const error = new Error('原始檔案名稱和內容類型為必填。');
    error.errorCode = 'MISSING_UPLOAD_PARAMS';
    error.status = 400; // Bad request from client
    throw error;
  }
  // UserId might be optional for some uploadTypes, but required for 'avatar' or 'message_image' if paths depend on it
  if ((uploadType === 'avatar' || uploadType === 'message_image') && !userId) {
    const error = new Error('此上傳類型需要使用者 ID。');
    error.errorCode = 'USER_ID_REQUIRED_FOR_UPLOAD_TYPE';
    error.status = 400;
    throw error;
  }

  const fileExtension = originalFilename.split('.').pop() || 'bin';
  const uniqueId = uuidv4();
  const baseFilename = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
  const sanitizedFilename = `${baseFilename.replace(/[^a-zA-Z0-9_.-]/g, '_')}.${fileExtension}`;
  
  let objectPathPrefix = 'uploads/general/'; // Default path
  if (uploadType === 'avatar') {
    objectPathPrefix = `uploads/avatars/${userId}/`;
  } else if (uploadType === 'message_image') { 
    objectPathPrefix = `uploads/messages/${userId}/`; // Or perhaps include conversationId if available and relevant
  }
  
  const objectKey = `${objectPathPrefix}${uniqueId}-${sanitizedFilename}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 360 }); // URL expires in 6 minutes
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${objectKey}`;
    
    return { signedUrl, objectKey, fileUrl };
  } catch (err) {
    console.error('Error generating pre-signed URL (SDK v3):', err);
    // Throw a more generic error to be handled by the controller/global error handler
    const error = new Error('無法產生 S3 上傳的預簽名 URL。');
    error.errorCode = 'S3_PRESIGN_URL_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }
};

/**
 * Deletes a file from S3.
 * @param {string} objectKey - The S3 object key of the file to delete.
 * @returns {Promise<void>}
 */
const deleteFile = async (objectKey) => {
  if (!bucketName) {
    const error = new Error('AWS S3 儲存桶名稱未設定。');
    error.errorCode = 'S3_BUCKET_NOT_CONFIGURED';
    error.status = 500;
    throw error;
  }
  if (!objectKey) {
    const error = new Error('刪除操作需要 S3 物件金鑰。');
    error.errorCode = 'S3_OBJECT_KEY_REQUIRED_FOR_DELETE';
    error.status = 400;
    throw error;
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  try {
    await s3Client.send(command);
    console.log(`Successfully deleted ${objectKey} from S3 bucket ${bucketName}`);
  } catch (err) {
    console.error(`Error deleting file ${objectKey} from S3:`, err);
    const error = new Error(`無法從 S3 刪除檔案 ${objectKey}。`);
    error.errorCode = 'S3_DELETE_FAILED';
    error.status = 500;
    // Check if the error is because the file was not found, which might not be a critical error
    if (err.name === 'NoSuchKey') { // Or specific error code for S3 file not found
        console.warn(`File ${objectKey} not found in S3 for deletion, possibly already deleted.`);
        return; // Or handle as non-critical
    }
    throw error;
  }
};

module.exports = {
    getPresignedUrlForUpload,
    deleteFile
}; 