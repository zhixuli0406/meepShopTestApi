const Joi = require('joi');

// Custom validator for MongoDB ObjectId
const objectIdValidator = (value, helpers) => {
  if (!Joi.string().regex(/^[0-9a-fA-F]{24}$/).validate(value).error) {
    return value; // Valid ObjectId
  }
  return helpers.error('any.invalid'); // Invalid ObjectId
};

const createConversationSchema = Joi.object({
  participantIds: Joi.array().items(
    Joi.custom(objectIdValidator, 'MongoDB ObjectId')
  ).min(2).required()
  .messages({
    'array.base': 'participantIds must be an array',
    'array.min': 'participantIds must contain at least {#limit} participants',
    'any.required': 'participantIds is a required field',
    'any.invalid': 'participantIds must contain valid MongoDB ObjectIds' // Custom message for objectIdValidator
  })
});

module.exports = {
  createConversationSchema,
}; 