const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: "Not authorized: token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate("tenant", "name code isActive");

    if (!user || !user.isActive || !user.tenant || !user.tenant.isActive) {
      return res.status(401).json({ message: "Not authorized: invalid user" });
    }

    req.user = user;
    req.tenantId = user.tenant._id.toString();
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized: invalid token" });
  }
});

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden for this role" });
  }
  return next();
};

module.exports = { protect, authorize };
