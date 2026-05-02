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

const {
  loginSchema,
  createUserSchema
} = require("../validators/authValidator");

const router = express.Router();

/* ================= AUTH ================= */

// 🔥 LOGIN (public)
router.post("/login", validate(loginSchema), login);

// 🔥 CREATE TENANT + ADMIN (public - first setup)
router.post("/tenant-bootstrap", createTenantAndAdmin);

/* ================= USER ================= */

// 🔒 GET CURRENT USER
router.get("/me", protect, me);

// 🔒 GET ALL ENGINEERS (admin only)
router.get("/engineers", protect, authorize("admin"), listEngineers);

// 🔒 CREATE USER (admin only)
router.post(
  "/users",
  protect,
  authorize("admin"),
  validate(createUserSchema),
  registerUser
);

module.exports = router;
