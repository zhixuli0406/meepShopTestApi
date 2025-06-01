const s3Service = require('../services/s3Service');
const { generateSignedUrlBodySchema } = require('../validators/uploadValidators'); // Import Joi schema

exports.generateSignedUrl = async (ctx) => {
  try {
    // Validate request body
    const { error, value } = generateSignedUrlBodySchema.validate(ctx.request.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      error.status = 400;
      throw error;
    }

    // Use validated values
    const { filename, contentType, userId, conversationId } = value;

    // The s3Service will handle default values for userId and conversationId if they are null/undefined
    const s3Data = await s3Service.getPresignedUrlForUpload({
      originalFilename: filename,
      contentType: contentType,
      userId: userId, 
      conversationId: conversationId 
    });

    ctx.status = 200;
    ctx.body = {
      status: 'success',
      data: {
        signedUrl: s3Data.signedUrl,
        objectKey: s3Data.objectKey,
        fileUrl: s3Data.fileUrl 
      }
    };

  } catch (error) {
    // Let the central errorHandler handle Joi errors and errors from s3Service
    // s3Service might throw errors like 'AWS_S3_BUCKET_NAME is not configured.'
    // or 'Could not generate pre-signed URL for S3 upload.'
    // These will be caught by the errorHandler.
    // If we want specific error codes for these, the s3Service should throw errors with .status and .errorCode properties.
    console.error('Error in generateSignedUrl controller:', error);
    ctx.status = 500;
    // Provide a more generic error message to the client unless it's a known, safe-to-expose error
    if (error.message === 'AWS_S3_BUCKET_NAME is not configured.' || error.message === 'Original filename and content type are required.') {
        ctx.body = { message: 'Server configuration error or missing parameters.', detail: error.message };
    } else if (error.message === 'Could not generate pre-signed URL for S3 upload.'){
        ctx.body = { message: 'Failed to prepare file upload. Please try again.' };
    } else {
        ctx.body = { message: 'An unexpected error occurred while preparing the file upload.' };
    }
  }
}; 