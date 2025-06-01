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

// Schema for validating MongoDB ObjectId in URL params (e.g., /:userId)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const userIdParamsSchema = Joi.object({
  userId: Joi.string().pattern(objectIdRegex).required().messages({
    'string.base': '使用者 ID 必須是字串',
    'string.pattern.base': '使用者 ID 必須是有效的 MongoDB ObjectId',
    'any.required': '使用者 ID 為必填參數'
  })
});

// Schema for PUT /users/:userId/avatar request body
const updateUserAvatarBodySchema = Joi.object({
  avatarUrl: Joi.string().uri().required().messages({
    'string.base': '頭像 URL 必須是字串',
    'string.uri': '頭像 URL 必須是有效的 URI',
    'any.required': '頭像 URL 為必填欄位'
  }),
  s3Key: Joi.string().required().messages({
    'string.base': 'S3 金鑰必須是字串',
    'any.required': 'S3 金鑰為必填欄位'
  })
});

module.exports = {
  createUserSchema,
  userIdParamsSchema,
  updateUserAvatarBodySchema
}; 