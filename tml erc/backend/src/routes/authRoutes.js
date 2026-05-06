const express = require("express");
const {
  login,
  me,
  registerUser,
  listEngineers,
  createTenantAndAdmin
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { loginSchema, createUserSchema } = require("../validators/authValidator");

const router = express.Router();

router.post("/login", validate(loginSchema), login);
router.post("/tenant-bootstrap", createTenantAndAdmin);
router.get("/me", protect, me);
router.get("/engineers", protect, authorize("admin"), listEngineers);
router.post("/users", protect, authorize("admin"), validate(createUserSchema), registerUser);

module.exports = router;
