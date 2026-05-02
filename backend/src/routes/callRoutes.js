const express = require("express");
const {
  createCall,
  listCalls,
  assignCall,
  updateCallStatus,
  requestCustomerApproval,
  customerApprovalDecision
} = require("../controllers/callController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createCallSchema,
  assignCallSchema,
  updateCallSchema,
  requestApprovalSchema,
  customerDecisionSchema
} = require("../validators/callValidator");

const router = express.Router();

router.use(protect);
router.get("/", listCalls);
router.post("/", authorize("admin", "client", "engineer"), validate(createCallSchema), createCall);
router.patch("/:id/assign", authorize("admin"), validate(assignCallSchema), assignCall);
router.patch("/:id/status", authorize("admin", "engineer"), validate(updateCallSchema), updateCallStatus);
router.patch(
  "/:id/request-approval",
  authorize("admin", "engineer"),
  validate(requestApprovalSchema),
  requestCustomerApproval
);
router.patch(
  "/:id/customer-decision",
  authorize("admin", "client"),
  validate(customerDecisionSchema),
  customerApprovalDecision
);

module.exports = router;
