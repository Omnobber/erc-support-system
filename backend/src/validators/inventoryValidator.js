const Joi = require("joi");

const createInventoryItemSchema = Joi.object({
  name: Joi.string().trim().required(),
  sku: Joi.string().trim().required(),
  quantity: Joi.number().integer().min(0).required(),
  threshold: Joi.number().integer().min(0).default(5),
  unit: Joi.string().trim().default("pcs")
});

const updateInventoryItemSchema = Joi.object({
  name: Joi.string().trim().optional(),
  quantity: Joi.number().integer().min(0).optional(),
  threshold: Joi.number().integer().min(0).optional(),
  unit: Joi.string().trim().optional()
});

module.exports = { createInventoryItemSchema, updateInventoryItemSchema };
