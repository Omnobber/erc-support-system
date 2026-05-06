const Call = require("../models/Call");
const Camera = require("../models/Camera");
const User = require("../models/User");
const InventoryItem = require("../models/InventoryItem");
const asyncHandler = require("../utils/asyncHandler");
const { emitToTenant } = require("../utils/socket");

const callPopulation = [
  { path: "camera", select: "cameraId name location status" },
  { path: "raisedBy", select: "name email role" },
  { path: "assignedEngineer", select: "name email" },
  { path: "partsUsed.item", select: "name sku unit" },
  { path: "approval.requestedBy", select: "name email role" },
  { path: "approval.decisionBy", select: "name email role" }
];

const createCall = asyncHandler(async (req, res) => {
  const { cameraId, issueDescription, priority, faultCategory } = req.body;

  const camera = await Camera.findOne({ cameraId, tenant: req.tenantId });
  if (!camera) {
    res.status(404);
    throw new Error("Camera not found");
  }

  const call = await Call.create({
    tenant: req.tenantId,
    camera: camera._id,
    issueDescription,
    raisedBy: req.user._id,
    priority,
    faultCategory
  });

  camera.status = "faulty";
  camera.lastIssue = issueDescription;
  camera.lastFaultCategory = faultCategory;
  await camera.save();

  const populated = await Call.findById(call._id).populate(callPopulation);
  res.status(201).json({ message: "Issue raised", call: populated });
});

const listCalls = asyncHandler(async (req, res) => {
  const { status, engineerId, date, search } = req.query;
  const filter = { tenant: req.tenantId };

  if (status) filter.status = status;
  if (engineerId && req.user.role === "admin") filter.assignedEngineer = engineerId;

  if (req.user.role === "client") {
    filter.$or = [
      { "approval.status": { $in: ["awaiting", "approved", "rejected"] } },
      { status: { $in: ["awaiting_customer_approval", "approved", "rejected_on_hold"] } }
    ];
  }

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    filter.createdAt = { $gte: start, $lt: end };
  }

  let query = Call.find(filter).populate(callPopulation).sort({ createdAt: -1 });

  if (search) {
    const cameras = await Camera.find({
      tenant: req.tenantId,
      $or: [{ cameraId: new RegExp(search, "i") }, { name: new RegExp(search, "i") }]
    }).select("_id");
    const cameraIds = cameras.map((cam) => cam._id);
    query = Call.find({
      ...filter,
      $or: [{ camera: { $in: cameraIds } }, { issueDescription: new RegExp(search, "i") }]
    })
      .populate(callPopulation)
      .sort({ createdAt: -1 });
  }

  const calls = await query;
  res.json({ calls, total: calls.length });
});

const assignCall = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { engineerId } = req.body;

  const call = await Call.findOne({ _id: id, tenant: req.tenantId });
  if (!call) {
    res.status(404);
    throw new Error("Call not found");
  }

  const engineer = await User.findOne({
    _id: engineerId,
    role: "engineer",
    tenant: req.tenantId,
    isActive: true
  });
  if (!engineer) {
    res.status(404);
    throw new Error("Engineer not found");
  }

  call.assignedEngineer = engineer._id;
  call.status = "assigned";
  call.assignedAt = new Date();
  call.updates.push({
    by: req.user._id,
    status: "assigned",
    note: `Assigned to ${engineer.name}`
  });
  await call.save();

  await Camera.updateOne(
    { _id: call.camera, tenant: req.tenantId },
    { assignedEngineer: engineer._id }
  );

  const populated = await Call.findById(call._id).populate(callPopulation);
  emitToTenant(req.tenantId, "call_assigned", {
    callId: call._id,
    engineer: engineer.name,
    cameraId: populated.camera?.cameraId
  });

  res.json({
    message: `Assigned to ${engineer.name}`,
    call: populated
  });
});

const consumeInventory = async (tenantId, partsUsed) => {
  if (!Array.isArray(partsUsed) || partsUsed.length === 0) return;
  for (const part of partsUsed) {
    const item = await InventoryItem.findOne({ _id: part.item, tenant: tenantId });
    if (!item) continue;
    item.quantity = Math.max(0, item.quantity - part.quantity);
    await item.save();
  }
};

const updateCallStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, feedback, beforeImageUrl, afterImageUrl, gps, partsUsed } = req.body;

  const call = await Call.findOne({ _id: id, tenant: req.tenantId }).populate("camera");
  if (!call) {
    res.status(404);
    throw new Error("Call not found");
  }

  const isEngineer = req.user.role === "engineer";
  const isAdmin = req.user.role === "admin";

  if (!isEngineer && !isAdmin) {
    res.status(403);
    throw new Error("Only engineer or admin can update");
  }

  if (call.status === "awaiting_customer_approval" && status && status !== "awaiting_customer_approval") {
    res.status(400);
    throw new Error("Awaiting customer approval. Customer decision required first.");
  }

  if (status) {
    call.status = status;
    if (!call.assignedEngineer && isEngineer) {
      call.assignedEngineer = req.user._id;
      call.assignedAt = call.assignedAt || new Date();
    }
    if (status === "in_progress" && !call.startedAt) {
      call.startedAt = new Date();
    }

    if (status === "completed") {
      call.completedAt = new Date();
      call.resolutionMinutes = call.slaMinutes;
      await consumeInventory(req.tenantId, partsUsed);
      if (call.camera) {
        call.camera.status = "active";
        call.camera.lastServiceDate = new Date();
        await call.camera.save();
      }
      emitToTenant(req.tenantId, "call_completed", {
        callId: call._id,
        cameraId: call.camera?.cameraId
      });
    }

    if ((status === "rejected" || status === "rejected_on_hold") && call.camera) {
      call.camera.status = "maintenance";
      await call.camera.save();
    }
  }

  if (feedback !== undefined) call.feedback = feedback;
  if (beforeImageUrl !== undefined) call.images.before = beforeImageUrl;
  if (afterImageUrl !== undefined) call.images.after = afterImageUrl;
  if (Array.isArray(partsUsed)) call.partsUsed = partsUsed;

  if (gps && typeof gps === "object") {
    call.gps = {
      lat: gps.lat ?? null,
      lng: gps.lng ?? null,
      visitedAt: new Date()
    };
  }

  call.updates.push({
    by: req.user._id,
    status: status || call.status,
    note: feedback || ""
  });

  await call.save();

  const populated = await Call.findById(call._id).populate(callPopulation);
  res.json({ message: "Call updated", call: populated });
});

const requestCustomerApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { requestNote } = req.body;

  const call = await Call.findOne({ _id: id, tenant: req.tenantId }).populate(callPopulation);
  if (!call) {
    res.status(404);
    throw new Error("Call not found");
  }

  if (!["pending", "assigned", "in_progress"].includes(call.status)) {
    res.status(400);
    throw new Error("Approval can only be requested for active pending work.");
  }

  if (req.user.role !== "admin" && req.user.role !== "engineer") {
    res.status(403);
    throw new Error("Only engineer or admin can request approval");
  }

  if (!call.assignedEngineer && req.user.role === "engineer") {
    call.assignedEngineer = req.user._id;
    call.assignedAt = call.assignedAt || new Date();
  }

  call.status = "awaiting_customer_approval";
  call.approval = {
    ...(call.approval || {}),
    required: true,
    status: "awaiting",
    requestNote: requestNote || "",
    requestedBy: req.user._id,
    requestedAt: new Date(),
    decisionBy: null,
    decisionAt: null,
    decisionNote: ""
  };
  call.updates.push({
    by: req.user._id,
    status: "awaiting_customer_approval",
    note: requestNote || "Customer approval requested"
  });
  await call.save();

  const populated = await Call.findById(call._id).populate(callPopulation);
  emitToTenant(req.tenantId, "approval_requested", {
    callId: populated._id,
    cameraId: populated.camera?.cameraId,
    requestNote: populated.approval?.requestNote || ""
  });

  res.json({ message: "Approval request sent to customer", call: populated });
});

const customerApprovalDecision = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, decisionNote } = req.body;

  const call = await Call.findOne({ _id: id, tenant: req.tenantId }).populate(callPopulation);
  if (!call) {
    res.status(404);
    throw new Error("Call not found");
  }

  if (req.user.role !== "client" && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only customer or admin can approve/reject");
  }

  if (call.status !== "awaiting_customer_approval" || call.approval?.status !== "awaiting") {
    res.status(400);
    throw new Error("No pending customer approval for this call");
  }

  const approved = decision === "approve";
  call.approval = {
    ...(call.approval || {}),
    required: true,
    status: approved ? "approved" : "rejected",
    decisionBy: req.user._id,
    decisionAt: new Date(),
    decisionNote: decisionNote || ""
  };
  call.status = approved ? "in_progress" : "rejected_on_hold";
  call.updates.push({
    by: req.user._id,
    status: approved ? "approved" : "rejected_on_hold",
    note: decisionNote || (approved ? "Customer approved request" : "Customer rejected request")
  });
  await call.save();

  const populated = await Call.findById(call._id).populate(callPopulation);
  emitToTenant(req.tenantId, "approval_decision", {
    callId: populated._id,
    cameraId: populated.camera?.cameraId,
    decision: approved ? "approved" : "rejected",
    decisionNote: populated.approval?.decisionNote || ""
  });

  res.json({
    message: approved ? "Request approved. Call moved to In Progress." : "Request rejected. Call moved to On Hold.",
    call: populated
  });
});

module.exports = {
  createCall,
  listCalls,
  assignCall,
  updateCallStatus,
  requestCustomerApproval,
  customerApprovalDecision
};
