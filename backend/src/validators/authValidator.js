const Joi = require("joi");

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required()
});

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("admin", "engineer", "client").required(),
  phone: Joi.string().allow("").optional()
});

module.exports = { loginSchema, createUserSchema };
