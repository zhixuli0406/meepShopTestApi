const Joi = require('joi');

const generateSignedUrlBodySchema = Joi.object({
  filename: Joi.string().trim().min(1).required()
    .messages({
      'string.base': 'Filename must be a string',
      'string.empty': 'Filename cannot be empty',
      'string.min': 'Filename cannot be empty',
      'any.required': 'Filename is required'
    }),
  contentType: Joi.string().trim().regex(/^\w+\/[-.\w]+$/).required() // Basic MIME type format check
    .messages({
      'string.base': 'Content type must be a string',
      'string.empty': 'Content type cannot be empty',
      'string.pattern.base': 'Content type must be a valid MIME type format (e.g., image/jpeg)',
      'any.required': 'Content type is required'
    }),
  userId: Joi.string().trim().allow('', null).optional(), // Optional, can be string, empty, or null
  conversationId: Joi.string().trim().allow('', null).optional() // Optional
});

module.exports = {
  generateSignedUrlBodySchema,
}; 