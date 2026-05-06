const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const asyncHandler = require("../utils/asyncHandler");

const createToken = (user) =>
  jwt.sign({ id: user._id, tenantId: user.tenant?._id || user.tenant }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  tenant: user.tenant?._id || user.tenant,
  tenantName: user.tenant?.name
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
    .populate("tenant", "name code")
    .select("+password");

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  res.json({
    token: createToken(user),
    user: safeUser(user)
  });
});

const me = asyncHandler(async (req, res) => {
  await req.user.populate("tenant", "name code");
  res.json({ user: safeUser(req.user) });
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(409);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
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

const createTenantAndAdmin = asyncHandler(async (req, res) => {
  const { tenantName, tenantCode, name, email, password, phone } = req.body;

  const exists = await Tenant.findOne({ code: tenantCode.toUpperCase() });
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
    email: email.toLowerCase(),
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

const listEngineers = asyncHandler(async (req, res) => {
  const engineers = await User.find({
    role: "engineer",
    isActive: true,
    tenant: req.user.tenant
  }).select("_id name email phone");

  res.json({ engineers });
});

module.exports = { login, me, registerUser, listEngineers, createTenantAndAdmin };
