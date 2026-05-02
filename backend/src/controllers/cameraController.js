const Camera = require("../models/Camera");
const Call = require("../models/Call");
const asyncHandler = require("../utils/asyncHandler");

const listCameras = asyncHandler(async (req, res) => {
  const cameras = await Camera.find({ tenant: req.tenantId })
    .populate("assignedEngineer", "name email")
    .sort({ cameraId: 1 });
  res.json({ cameras, total: cameras.length });
});

const createCamera = asyncHandler(async (req, res) => {
  const { cameraId, name, location, status, notes } = req.body;

  const existing = await Camera.findOne({ tenant: req.tenantId, cameraId });
  if (existing) {
    res.status(409);
    throw new Error("cameraId already exists for this client");
  }

  const camera = await Camera.create({
    tenant: req.tenantId,
    cameraId,
    name,
    location,
    status: status || "active",
    notes: notes || ""
  });

  res.status(201).json({ message: "Camera created", camera });
});

const updateCamera = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const camera = await Camera.findOne({ _id: id, tenant: req.tenantId });
  if (!camera) {
    res.status(404);
    throw new Error("Camera not found");
  }

  ["name", "location", "status", "notes", "lastServiceDate", "lastFaultCategory", "lastIssue"].forEach((key) => {
    if (req.body[key] !== undefined) camera[key] = req.body[key];
  });

  camera.lastCheckedAt = new Date();
  await camera.save();
  res.json({ message: "Camera updated", camera });
});

const deleteCamera = asyncHandler(async (req, res) => {
  const camera = await Camera.findOne({ _id: req.params.id, tenant: req.tenantId });
  if (!camera) {
    res.status(404);
    throw new Error("Camera not found");
  }

  await camera.deleteOne();
  res.json({ message: "Camera deleted" });
});

const cameraDetails = asyncHandler(async (req, res) => {
  const camera = await Camera.findOne({ _id: req.params.id, tenant: req.tenantId }).populate(
    "assignedEngineer",
    "name email"
  );
  if (!camera) {
    res.status(404);
    throw new Error("Camera not found");
  }

  const calls = await Call.find({ tenant: req.tenantId, camera: camera._id })
    .populate("assignedEngineer", "name")
    .sort({ createdAt: -1 })
    .limit(20);

  const lastIssue = calls[0]?.issueDescription || camera.lastIssue || "";
  const lastServiceDate = calls.find((row) => row.status === "completed")?.completedAt || null;

  res.json({
    camera,
    details: {
      lastIssue,
      lastServiceDate,
      assignedEngineer: camera.assignedEngineer,
      callHistory: calls
    }
  });
});

module.exports = { listCameras, createCamera, updateCamera, deleteCamera, cameraDetails };
