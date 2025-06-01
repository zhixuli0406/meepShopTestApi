const Joi = require('joi');

// Custom validator for MongoDB ObjectId (can be shared or defined per validator file)
const objectIdValidator = (value, helpers) => {
  if (Joi.string().regex(/^[0-9a-fA-F]{24}$/).validate(value).error) {
    return helpers.error('any.invalidObjectId'); // Use a specific error code for clarity
  }
  return value; // Valid ObjectId string
};

const conversationIdParamsSchema = Joi.object({
  conversationId: Joi.string().custom(objectIdValidator, 'MongoDB ObjectId').required()
    .messages({
      'string.base': 'Conversation ID must be a string',
      'any.required': 'Conversation ID is required',
      'any.invalidObjectId': 'Conversation ID must be a valid MongoDB ObjectId'
    })
});

const createMessageBodySchema = Joi.object({
  senderId: Joi.string().custom(objectIdValidator, 'MongoDB ObjectId').required()
    .messages({
      'string.base': 'Sender ID must be a string',
      'any.required': 'Sender ID is required',
      'any.invalidObjectId': 'Sender ID must be a valid MongoDB ObjectId'
    }),
  type: Joi.string().valid('text', 'image').required()
    .messages({
      'string.base': 'Message type must be a string',
      'any.only': 'Message type must be either \'text\' or \'image\'',
      'any.required': 'Message type is required'
    }),
  content: Joi.string().when('type', {
    is: 'text',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().uri({ scheme: ['http', 'https'] }).required()
  }).messages({
    'string.base': 'Message content must be a string',
    'string.empty': 'Text message content cannot be empty',
    'string.min': 'Text message content cannot be empty',
    'string.uri': 'Image message content must be a valid URL (http or https)',
    'any.required': 'Message content is required' 
  }),
  s3Key: Joi.string().allow(null, '').optional()
    .when('type', {
        is: 'image',
        // then: Joi.string().required(), // Can make s3Key mandatory for images if needed
        // otherwise: Joi.forbidden() // s3Key should not be present for text messages
    })
    .messages({
        'string.base': 's3Key must be a string',
        // 'any.required': 's3Key is required for image messages'
    })
});

// More schemas will be added here for createMessage

module.exports = {
  conversationIdParamsSchema,
  createMessageBodySchema,
  // Will export createMessageSchema later
}; 