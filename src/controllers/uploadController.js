const s3Service = require('../services/s3Service');
const { generateSignedUrlBodySchema } = require('../validators/uploadValidators');

exports.generateSignedUrl = async (ctx) => {
  try {
    // Validate request body
    // Use validateAsync for Joi, it throws on error, simplifying error handling here
    const validatedBody = await generateSignedUrlBodySchema.validateAsync(ctx.request.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove any fields not defined in the schema
    });

    // Use validated values
    const { filename, contentType, uploadType, userId } = validatedBody;
    // conversationId is also in validatedBody if provided, but not directly used by s3Service.getPresignedUrlForUpload for path construction yet.

    const s3Data = await s3Service.getPresignedUrlForUpload({
      originalFilename: filename,
      contentType: contentType,
      uploadType: uploadType, 
      userId: userId 
      // If conversationId were to be used by s3Service, it would be passed here: 
      // conversationId: validatedBody.conversationId 
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
    // If error is a Joi validation error, it will have 'isJoi' property.
    // The global errorHandler will handle formatting it.
    // If error is from s3Service (e.g., config error, S3 SDK error),
    // it should have been thrown with .status and .errorCode by s3Service itself.
    // The global errorHandler will also handle these.
    
    // Log the error for server-side inspection, regardless of type
    console.error('Error in generateSignedUrl controller:', error.message, error.details || error.stack);

    // Rethrow the error to be caught by the global errorHandler
    throw error;
  }
}; 