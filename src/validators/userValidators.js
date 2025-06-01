const Joi = require('joi');

const createUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required()
    .messages({
      'string.base': 'username should be a type of text',
      'string.empty': 'username cannot be an empty field',
      'string.alphanum': 'username should only contain alpha-numeric characters',
      'string.min': 'username should have a minimum length of {#limit} characters',
      'string.max': 'username should have a maximum length of {#limit} characters',
      'any.required': 'username is a required field'
    }),
  avatar: Joi.string().uri({
    scheme: ['http', 'https']
  }).allow('', null).optional() // Allow empty string or null, and make it optional
    .messages({
      'string.uri': 'avatar must be a valid URI (http or https)'
    })
});

// Schema for validating userId in URL parameters
const userIdParamsSchema = Joi.object({
  userId: Joi.string().alphanum().length(24).required() // Basic MongoDB ObjectId check
    .messages({
      'string.base': 'User ID must be a string',
      'string.alphanum': 'User ID must be an alphanumeric string',
      'string.length': 'User ID must be 24 characters long',
      'any.required': 'User ID is required in URL parameters'
    })
});

// Schema for validating the request body of updating user avatar
const updateUserAvatarBodySchema = Joi.object({
  avatarUrl: Joi.string().uri({ scheme: ['http', 'https'] }).required()
    .messages({
      'string.base': 'Avatar URL must be a string',
      'string.uri': 'Avatar URL must be a valid URI (http or https)',
      'any.required': 'Avatar URL is required'
    }),
  s3Key: Joi.string().trim().min(1).required()
    .messages({
      'string.base': 'S3 key must be a string',
      'string.empty': 'S3 key cannot be empty',
      'string.min': 'S3 key cannot be empty',
      'any.required': 'S3 key is required'
    })
});

module.exports = {
  createUserSchema,
  userIdParamsSchema, // Export the new schema
  updateUserAvatarBodySchema // Export the new schema
}; 