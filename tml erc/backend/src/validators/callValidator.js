const Joi = require("joi");

const faultCategories = [
  "camera_not_working",
  "wiring_issue",
  "power_failure",
  "network_issue"
];

const createCallSchema = Joi.object({
  cameraId: Joi.string().required(),
  issueDescription: Joi.string().min(5).required(),
  priority: Joi.string().valid("low", "medium", "high").default("medium"),
  faultCategory: Joi.string()
    .valid(...faultCategories)
    .required()
});

const assignCallSchema = Joi.object({
  engineerId: Joi.string().required()
});

const updateCallSchema = Joi.object({
  status: Joi.string()
    .valid(
      "pending",
      "assigned",
      "in_progress",
      "awaiting_customer_approval",
      "approved",
      "completed",
      "rejected",
      "rejected_on_hold"
    )
    .optional(),
  feedback: Joi.string().allow("").optional(),
  beforeImageUrl: Joi.string().uri().allow("").optional(),
  afterImageUrl: Joi.string().uri().allow("").optional(),
  gps: Joi.object({
    lat: Joi.number().allow(null),
    lng: Joi.number().allow(null)
  }).optional(),
  partsUsed: Joi.array()
    .items(
      Joi.object({
        item: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required()
      })
    )
    .optional()
});

const requestApprovalSchema = Joi.object({
  requestNote: Joi.string().allow("").optional()
});

const customerDecisionSchema = Joi.object({
  decision: Joi.string().valid("approve", "reject").required(),
  decisionNote: Joi.string().allow("").optional()
});

module.exports = {
  createCallSchema,
  assignCallSchema,
  updateCallSchema,
  requestApprovalSchema,
  customerDecisionSchema,
  faultCategories
};
