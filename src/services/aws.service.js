const AWS = require('aws-sdk');
const config = require('../../config');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');

// AWS.config.update({
//   accessKeyId: config.aws.accessKeyId,
//   secretAccessKey: config.aws.secretAccessKey,
//   region: config.aws.region,
// });
// It's often better to configure the S3 client directly

const s3 = new AWS.S3({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region,
  s3ForcePathStyle: true, // Enforce path-style URLs
  signatureVersion: 'v4',   // Recommended signature version
});

exports.generatePresignedPutUrl = async (originalFileName, fileType, userId) => {
  if (!config.aws.s3BucketName) {
    throw new AppError('S3 bucket name is not configured.', 500);
  }
  if (!originalFileName || !fileType) {
    throw new AppError('File name and file type are required to generate a presigned URL.', 400);
  }

  const fileExtension = originalFileName.split('.').pop();
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  // Ensure s3Key does not start with a '/' if bucket name already implies it or for consistency
  const s3Key = `user-uploads/${userId || 'general'}/${uniqueFileName}`;

  const params = {
    Bucket: config.aws.s3BucketName,
    Key: s3Key,
    Expires: config.aws.s3PresignedUrlExpiresIn, 
    ContentType: fileType,
  };

  try {
    const presignedUrl = await s3.getSignedUrlPromise('putObject', params);
    // Construct public URL using path style for consistency
    const publicFileUrl = `https://s3.${config.aws.region}.amazonaws.com/${config.aws.s3BucketName}/${s3Key}`;
    
    return {
      presignedUrl,
      fileKey: s3Key, 
      publicUrl: publicFileUrl 
    };
  } catch (error) {
    console.error('Error generating presigned URL for S3:', error);
    throw new AppError('Could not generate presigned URL.', 500);
  }
}; 