const Joi = require("joi");

// 🔥 LOGIN VALIDATION
exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// 🔥 CREATE USER VALIDATION
exports.createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("admin", "engineer", "client").required(),
  phone: Joi.string().allow("")
});
