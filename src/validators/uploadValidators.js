const Joi = require('joi');

const generateSignedUrlBodySchema = Joi.object({
  filename: Joi.string().trim().min(1).required()
    .messages({
      'string.base': '檔案名稱必須是字串',
      'string.empty': '檔案名稱不可為空',
      'string.min': '檔案名稱不可為空',
      'any.required': '檔案名稱為必填欄位'
    }),
  contentType: Joi.string().trim().regex(/^\w+\/[-.\w]+$/).required()
    .messages({
      'string.base': '內容類型必須是字串',
      'string.empty': '內容類型不可為空',
      'string.pattern.base': '內容類型必須是有效的 MIME 類型格式 (例如：image/jpeg)',
      'any.required': '內容類型為必填欄位'
    }),
  uploadType: Joi.string().valid('avatar', 'message_image').required()
    .messages({
        'string.base': '上傳類型必須是字串',
        'any.only': '上傳類型必須是 {{#valids}} 中的一個',
        'any.required': '上傳類型為必填欄位'
    }),
  // userId is not strictly required by this schema as s3Service might handle paths that don't need it,
  // but s3Service will enforce it if uploadType is 'avatar' or 'message_image'.
  // Client should ensure sending it when appropriate.
  userId: Joi.string().trim().allow('', null).optional().messages({
    'string.base': '使用者 ID 必須是字串' 
  }), 
  // conversationId is optional and currently not used to form S3 path in s3Service for general uploads.
  // It could be used in the future if message images are stored under conversation-specific paths.
  conversationId: Joi.string().trim().allow('', null).optional().messages({
    'string.base': '對話 ID 必須是字串'
  })
});

module.exports = {
  generateSignedUrlBodySchema,
}; 