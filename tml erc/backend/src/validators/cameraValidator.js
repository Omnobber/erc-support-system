const Joi = require("joi");

const cameraStatus = ["active", "faulty", "maintenance"];
const faultCategories = ["camera_not_working", "wiring_issue", "power_failure", "network_issue", ""];

const createCameraSchema = Joi.object({
  cameraId: Joi.string().trim().required(),
  name: Joi.string().trim().required(),
  location: Joi.string().trim().required(),
  status: Joi.string()
    .valid(...cameraStatus)
    .default("active"),
  notes: Joi.string().allow("").optional()
});

const updateCameraSchema = Joi.object({
  name: Joi.string().trim().optional(),
  location: Joi.string().trim().optional(),
  status: Joi.string()
    .valid(...cameraStatus)
    .optional(),
  notes: Joi.string().allow("").optional(),
  lastServiceDate: Joi.date().optional(),
  lastFaultCategory: Joi.string()
    .valid(...faultCategories)
    .optional(),
  lastIssue: Joi.string().allow("").optional()
});

module.exports = { createCameraSchema, updateCameraSchema };
