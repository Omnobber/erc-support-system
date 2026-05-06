const Camera = require("../models/Camera");
const Call = require("../models/Call");
const asyncHandler = require("../utils/asyncHandler");

const timeRangeKeys = ["daily", "weekly", "monthly", "yearly"];

const getTimeRangeStart = (timeRange) => {
  const now = new Date();
  const start = new Date(now);
  switch (timeRange) {
    case "daily":
      start.setHours(start.getHours() - 24);
      break;
    case "weekly":
      start.setDate(start.getDate() - 7);
      break;
    case "yearly":
      start.setMonth(start.getMonth() - 12);
      break;
    case "monthly":
    default:
      start.setDate(start.getDate() - 30);
      break;
  }
  return { start, end: now };
};

const summary = asyncHandler(async (req, res) => {
  const tenantFilter = { tenant: req.tenantId };
  const requestedTimeRange = String(req.query.timeRange || "monthly").toLowerCase();
  const selectedTimeRange = timeRangeKeys.includes(requestedTimeRange) ? requestedTimeRange : "monthly";
  const { start: rangeStart, end: rangeEnd } = getTimeRangeStart(selectedTimeRange);
  const callTimeFilter = {
    ...tenantFilter,
    createdAt: { $gte: rangeStart, $lte: rangeEnd }
  };

  const [totalCameras, cameras, calls] = await Promise.all([
    Camera.countDocuments(tenantFilter),
    Camera.find(tenantFilter).sort({ cameraId: 1 }).lean(),
    Call.find(callTimeFilter).populate("assignedEngineer", "name").lean()
  ]);

  const [active, faulty, maintenance] = await Promise.all([
    Camera.countDocuments({ ...tenantFilter, status: "active" }),
    Camera.countDocuments({ ...tenantFilter, status: "faulty" }),
    Camera.countDocuments({ ...tenantFilter, status: "maintenance" })
  ]);

  const camerasWithIssuesInRange = new Set(
    calls.map((call) => (call?.camera ? String(call.camera) : null)).filter(Boolean)
  );
  const notWorkingInRange = camerasWithIssuesInRange.size;
  const workingInRange = Math.max(totalCameras - notWorkingInRange, 0);
  const uptime = totalCameras ? Number(((workingInRange / totalCameras) * 100).toFixed(2)) : 0;

  const pending = calls.filter((c) => c.status === "pending").length;
  const completed = calls.filter((c) => c.status === "completed").length;
  const inProgress = calls.filter((c) => c.status === "in_progress").length;
  const avgSlaMinutes =
    calls.filter((c) => c.resolutionMinutes).reduce((sum, row) => sum + row.resolutionMinutes, 0) /
      (calls.filter((c) => c.resolutionMinutes).length || 1) || 0;

  const faultCounts = {
    camera_not_working: 0,
    wiring_issue: 0,
    power_failure: 0,
    network_issue: 0,
    other: 0
  };

  calls.forEach((call) => {
    if (faultCounts[call.faultCategory] !== undefined) {
      faultCounts[call.faultCategory] += 1;
    } else {
      faultCounts.other += 1;
    }
  });

  const faultAnalysis = [
    { key: "camera_not_working", name: "Camera Not Working", value: faultCounts.camera_not_working },
    { key: "network_issue", name: "Network Issue", value: faultCounts.network_issue },
    { key: "power_failure", name: "Power Failure", value: faultCounts.power_failure },
    { key: "wiring_issue", name: "Wiring Issue", value: faultCounts.wiring_issue },
    { key: "other", name: "Other", value: faultCounts.other }
  ];

  const monthlyDowncalls = [
    { key: "camera_not_working", name: "Camera Not Working", value: faultCounts.camera_not_working },
    { key: "network_issue", name: "Network Issue", value: faultCounts.network_issue },
    { key: "power_failure", name: "Power Failure", value: faultCounts.power_failure },
    { key: "wiring_issue", name: "Wiring Issue", value: faultCounts.wiring_issue },
    { key: "other", name: "Other", value: faultCounts.other }
  ];

  res.json({
    selectedTimeRange,
    rangeStart,
    rangeEnd,
    cameraStatus: {
      total: totalCameras,
      active: workingInRange,
      faulty: notWorkingInRange,
      maintenance: 0,
      currentActive: active,
      currentFaulty: faulty,
      currentMaintenance: maintenance,
      uptimePercent: uptime
    },
    callStatus: {
      total: calls.length,
      pending,
      inProgress,
      completed
    },
    sla: {
      avgResolutionMinutes: Math.round(avgSlaMinutes)
    },
    faultAnalysis,
    monthlyDowncalls,
    cameraGrid: cameras
  });
});

const engineerPerformance = asyncHandler(async (req, res) => {
  const rows = await Call.aggregate([
    { $match: { tenant: req.user.tenant._id, assignedEngineer: { $ne: null } } },
    {
      $group: {
        _id: "$assignedEngineer",
        totalAssigned: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "engineer"
      }
    },
    { $unwind: "$engineer" },
    {
      $project: {
        _id: 0,
        engineerName: "$engineer.name",
        totalAssigned: 1,
        completed: 1
      }
    }
  ]);

  res.json({ performance: rows });
});

module.exports = { summary, engineerPerformance };
