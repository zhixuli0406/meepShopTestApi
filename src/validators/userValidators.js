const Joi = require('joi');

const createUserSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.base': '使用者名稱必須是字串',
      'string.alphanum': '使用者名稱只能包含英數字元',
      'string.min': '使用者名稱長度至少需要 {#limit} 個字元',
      'string.max': '使用者名稱長度不能超過 {#limit} 個字元',
      'any.required': '使用者名稱為必填欄位'
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .allow('') // Allow empty string for avatar if user doesn't provide one
    .messages({
      'string.base': '頭像必須是字串',
      'string.uri': '頭像必須是有效的 URI'
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