const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const asyncHandler = require("../utils/asyncHandler");

// ================= TOKEN =================
const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      tenant: user.tenant?._id || user.tenant,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );

// ================= SAFE USER =================
const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  tenant: user.tenant?._id || user.tenant,
  tenantName: user.tenant?.name
});

// ================= LOGIN =================
const login = asyncHandler(async (req, res) => {
  let { email, password } = req.body;

  // 🔥 FIX 1: validate input
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password required");
  }

  // 🔥 FIX 2: normalize email
  email = email.toLowerCase().trim();

  // 🔥 FIX 3: include password explicitly
  const user = await User.findOne({
    email,
    isActive: true
  })
    .populate("tenant", "name code")
    .select("+password");

  // 🔥 FIX 4: proper check
  if (!user) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  res.json({
    token: createToken(user),
    user: safeUser(user)
  });
});

// ================= CURRENT USER =================
const me = asyncHandler(async (req, res) => {
  await req.user.populate("tenant", "name code");

  res.json({
    user: safeUser(req.user)
  });
});

// ================= REGISTER USER =================
const registerUser = asyncHandler(async (req, res) => {
  let { name, email, password, role, phone } = req.body;

  email = email.toLowerCase().trim();

  const exists = await User.findOne({ email });

  if (exists) {
    res.status(409);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    phone: phone || "",
    tenant: req.user.tenant._id || req.user.tenant
  });

  res.status(201).json({
    message: "User created",
    user: safeUser(user)
  });
});

// ================= CREATE TENANT + ADMIN =================
const createTenantAndAdmin = asyncHandler(async (req, res) => {
  let { tenantName, tenantCode, name, email, password, phone } = req.body;

  email = email.toLowerCase().trim();

  const exists = await Tenant.findOne({
    code: tenantCode.toUpperCase()
  });

  if (exists) {
    res.status(409);
    throw new Error("Tenant code already exists");
  }

  const tenant = await Tenant.create({
    name: tenantName,
    code: tenantCode.toUpperCase()
  });

  const user = await User.create({
    name,
    email,
    password,
    role: "admin",
    phone: phone || "",
    tenant: tenant._id
  });

  res.status(201).json({
    message: "Tenant and admin created",
    user: safeUser({ ...user.toObject(), tenant })
  });
});

// ================= LIST ENGINEERS =================
const listEngineers = asyncHandler(async (req, res) => {
  const engineers = await User.find({
    role: "engineer",
    isActive: true,
    tenant: req.user.tenant
  }).select("_id name email phone");

  res.json({ engineers });
});

module.exports = {
  login,
  me,
  registerUser,
  listEngineers,
  createTenantAndAdmin
};
