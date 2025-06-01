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

module.exports = {
  createUserSchema,
}; 