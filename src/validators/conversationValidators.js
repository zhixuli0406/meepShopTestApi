const Joi = require('joi');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createConversationSchema = Joi.object({
    participants: Joi.array()
        .items(Joi.string().pattern(objectIdRegex).required().messages({
            'string.base': '參與者 ID 必須是字串',
            'string.pattern.base': '每個參與者 ID 必須是有效的 MongoDB ObjectId',
            'any.required': '參與者 ID 陣列中的 ID 不可為空'
        }))
        .min(2) // A conversation needs at least two participants
        .unique() // Ensure participant IDs are unique
        .required()
        .messages({
            'array.base': '參與者列表必須是一個陣列',
            'array.min': '一場對話至少需要 {#limit} 位參與者',
            'array.unique': '參與者 ID 不可重複',
            'any.required': '參與者列表為必填欄位'
        })
});

// Schema for validating conversationId in URL params
const conversationIdParamsSchema = Joi.object({
    conversationId: Joi.string().pattern(objectIdRegex).required().messages({
        'string.base': '對話 ID 必須是字串',
        'string.pattern.base': '對話 ID 必須是有效的 MongoDB ObjectId',
        'any.required': '對話 ID 為必填參數'
    })
});

module.exports = {
    createConversationSchema,
    conversationIdParamsSchema
}; 