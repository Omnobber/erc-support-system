const PDFDocument = require("pdfkit");
const Camera = require("../models/Camera");
const Call = require("../models/Call");
const asyncHandler = require("../utils/asyncHandler");

const RANGE_TO_DAYS = {
  weekly: 7,
  monthly: 30,
  half_yearly: 182,
  yearly: 365
};

const FAULT_LABEL_BY_KEY = {
  camera_not_working: "Camera Not Working",
  wiring_issue: "Wiring Issue",
  power_failure: "Power Failure",
  network_issue: "Network Issue"
};

const toStartOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toEndOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseDateInput = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getRangeMetaFromQuery = (query) => {
  const now = new Date();
  const selectedRange = RANGE_TO_DAYS[query.range] ? query.range : "monthly";
  const requestedStart = parseDateInput(query.startDate);
  const requestedEnd = parseDateInput(query.endDate);

  if (requestedStart && requestedEnd && requestedStart <= requestedEnd) {
    return {
      selectedRange: "custom",
      startDate: toStartOfDay(requestedStart),
      endDate: toEndOfDay(requestedEnd)
    };
  }

  const daySpan = RANGE_TO_DAYS[selectedRange];
  const endDate = now;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daySpan + 1);
  return {
    selectedRange,
    startDate: toStartOfDay(startDate),
    endDate: toEndOfDay(endDate)
  };
};

const getPreviousRange = ({ startDate, endDate }) => {
  const durationMs = endDate.getTime() - startDate.getTime() + 1;
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - durationMs + 1);
  return {
    startDate: previousStartDate,
    endDate: previousEndDate
  };
};

const formatRangeDate = (date) => date.toISOString().slice(0, 10);

const formatDayLabel = (date) =>
  date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric"
  });

const formatMonthLabel = (date) =>
  date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric"
  });

const getTrendGranularity = (startDate, endDate) => {
  const dayCount = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime() + 1) / (24 * 60 * 60 * 1000)));
  return dayCount > 120 ? "month" : "day";
};

const buildTrendBuckets = (startDate, endDate, granularity) => {
  const buckets = [];
  if (granularity === "month") {
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (cursor <= endCursor) {
      buckets.push({
        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
        label: formatMonthLabel(cursor),
        value: 0
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const cursor = toStartOfDay(startDate);
  const endCursor = toStartOfDay(endDate);
  while (cursor <= endCursor) {
    buckets.push({
      key: formatRangeDate(cursor),
      label: formatDayLabel(cursor),
      value: 0
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
};

const buildDowncallsTrend = ({ calls, startDate, endDate, granularity, labelsTemplate }) => {
  const buckets = labelsTemplate ? labelsTemplate.map((bucket) => ({ ...bucket, value: 0 })) : buildTrendBuckets(startDate, endDate, granularity);
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  calls.forEach((call) => {
    const createdAt = new Date(call.createdAt);
    const key =
      granularity === "month"
        ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`
        : formatRangeDate(createdAt);
    const target = bucketByKey.get(key);
    if (target) target.value += 1;
  });

  return buckets;
};

const countIssueCategories = (calls) => {
  const counts = {
    camera_not_working: 0,
    wiring_issue: 0,
    power_failure: 0,
    network_issue: 0,
    other: 0
  };

  calls.forEach((call) => {
    if (counts[call.faultCategory] !== undefined) counts[call.faultCategory] += 1;
    else counts.other += 1;
  });

  return [
    { key: "camera_not_working", name: "Camera Not Working", value: counts.camera_not_working },
    { key: "network_issue", name: "Network Issue", value: counts.network_issue },
    { key: "power_failure", name: "Power Failure", value: counts.power_failure },
    { key: "wiring_issue", name: "Wiring Issue", value: counts.wiring_issue },
    { key: "other", name: "Other", value: counts.other }
  ];
};

const getPercentageChange = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(2));
};

const buildKpis = ({ cameras, calls }) => {
  const totalCameras = cameras.length;
  const downCameraIds = new Set(calls.map((call) => String(call.camera)));
  const notWorkingCameras = downCameraIds.size;
  const workingCameras = Math.max(totalCameras - notWorkingCameras, 0);
  const totalDowncalls = calls.length;
  const uptimePercent = totalCameras ? Number(((workingCameras / totalCameras) * 100).toFixed(2)) : 0;

  const completedCalls = calls.filter((call) => call.status === "completed");
  const slaOnTime = completedCalls.filter((call) => call.completedAt && call.slaDueAt && new Date(call.completedAt) <= new Date(call.slaDueAt));
  const slaPercent = completedCalls.length ? Number(((slaOnTime.length / completedCalls.length) * 100).toFixed(2)) : 100;

  return {
    totalCameras,
    workingCameras,
    notWorkingCameras,
    totalDowncalls,
    uptimePercent,
    slaPercent
  };
};

const buildAlerts = ({ currentKpis, previousKpis, comparisonEnabled }) => {
  const alerts = [];
  const notWorkingPercent = currentKpis.totalCameras
    ? (currentKpis.notWorkingCameras / currentKpis.totalCameras) * 100
    : 0;

  if (notWorkingPercent > 20) {
    alerts.push({
      severity: notWorkingPercent > 35 ? "critical" : "warning",
      title: "Not Working Cameras Threshold Breached",
      message: `${notWorkingPercent.toFixed(1)}% cameras are currently not working.`
    });
  }

  if (currentKpis.slaPercent < 90) {
    alerts.push({
      severity: currentKpis.slaPercent < 75 ? "critical" : "warning",
      title: "SLA Performance Drop",
      message: `SLA is at ${currentKpis.slaPercent.toFixed(1)}%, below configured threshold.`
    });
  }

  if (comparisonEnabled && previousKpis.totalDowncalls > 0) {
    const spike = getPercentageChange(currentKpis.totalDowncalls, previousKpis.totalDowncalls);
    if (spike > 30 && currentKpis.totalDowncalls >= 5) {
      alerts.push({
        severity: spike > 60 ? "critical" : "warning",
        title: "Downcalls Spike Detected",
        message: `Downcalls increased by ${spike.toFixed(1)}% compared to previous period.`
      });
    }
  }

  return alerts;
};

const fetchReportPayload = async ({ tenantId, rangeMeta, comparisonEnabled }) => {
  const previousRange = getPreviousRange(rangeMeta);
  const trendGranularity = getTrendGranularity(rangeMeta.startDate, rangeMeta.endDate);

  const [cameras, callsCurrent, callsPrevious] = await Promise.all([
    Camera.find({ tenant: tenantId }).sort({ cameraId: 1 }).lean(),
    Call.find({
      tenant: tenantId,
      createdAt: { $gte: rangeMeta.startDate, $lte: rangeMeta.endDate }
    }).sort({ createdAt: 1 }).lean(),
    Call.find({
      tenant: tenantId,
      createdAt: { $gte: previousRange.startDate, $lte: previousRange.endDate }
    }).sort({ createdAt: 1 }).lean()
  ]);

  const currentKpis = buildKpis({ cameras, calls: callsCurrent });
  const previousKpis = buildKpis({ cameras, calls: callsPrevious });
  const issueCategory = countIssueCategories(callsCurrent);
  const currentTrendBuckets = buildDowncallsTrend({
    calls: callsCurrent,
    startDate: rangeMeta.startDate,
    endDate: rangeMeta.endDate,
    granularity: trendGranularity
  });
  const previousTrendBuckets = buildDowncallsTrend({
    calls: callsPrevious,
    startDate: previousRange.startDate,
    endDate: previousRange.endDate,
    granularity: trendGranularity,
    labelsTemplate: currentTrendBuckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label
    }))
  });
  const downcallsTrend = currentTrendBuckets.map((bucket, index) => ({
    label: bucket.label,
    downcalls: bucket.value,
    previousDowncalls: previousTrendBuckets[index]?.value || 0
  }));

  const kpis = {
    ...currentKpis,
    deltas: {
      totalCameras: getPercentageChange(currentKpis.totalCameras, previousKpis.totalCameras),
      workingCameras: getPercentageChange(currentKpis.workingCameras, previousKpis.workingCameras),
      notWorkingCameras: getPercentageChange(currentKpis.notWorkingCameras, previousKpis.notWorkingCameras),
      totalDowncalls: getPercentageChange(currentKpis.totalDowncalls, previousKpis.totalDowncalls),
      uptimePercent: getPercentageChange(currentKpis.uptimePercent, previousKpis.uptimePercent),
      slaPercent: getPercentageChange(currentKpis.slaPercent, previousKpis.slaPercent)
    }
  };

  return {
    selectedTimeRange: rangeMeta.selectedRange,
    dateRange: {
      startDate: formatRangeDate(rangeMeta.startDate),
      endDate: formatRangeDate(rangeMeta.endDate)
    },
    comparisonEnabled,
    comparisonRange: {
      startDate: formatRangeDate(previousRange.startDate),
      endDate: formatRangeDate(previousRange.endDate)
    },
    kpis,
    charts: {
      cameraStatus: [
        { name: "Working", value: currentKpis.workingCameras },
        { name: "Not Working", value: currentKpis.notWorkingCameras }
      ],
      issueCategory,
      downcallsTrend
    },
    alerts: buildAlerts({ currentKpis, previousKpis, comparisonEnabled }),
    rawTables: {
      cameraData: cameras.map((camera) => ({
        cameraId: camera.cameraId,
        name: camera.name,
        location: camera.location,
        status: camera.status,
        lastIssue: camera.lastIssue || ""
      })),
      faultData: issueCategory,
      downcallsData: downcallsTrend
    }
  };
};

const reportAnalytics = asyncHandler(async (req, res) => {
  const rangeMeta = getRangeMetaFromQuery(req.query);
  const comparisonEnabled = String(req.query.compare || "false").toLowerCase() === "true";
  const report = await fetchReportPayload({
    tenantId: req.tenantId,
    rangeMeta,
    comparisonEnabled
  });
  res.json({ report });
});

const reportCompare = asyncHandler(async (req, res) => {
  const rangeMeta = getRangeMetaFromQuery(req.query);
  const report = await fetchReportPayload({
    tenantId: req.tenantId,
    rangeMeta,
    comparisonEnabled: true
  });
  res.json({
    comparison: {
      currentRange: report.dateRange,
      previousRange: report.comparisonRange,
      kpis: report.kpis
    }
  });
});

const exportPdf = asyncHandler(async (req, res) => {
  const rangeMeta = getRangeMetaFromQuery(req.query);
  const comparisonEnabled = String(req.query.compare || "false").toLowerCase() === "true";
  const report = await fetchReportPayload({
    tenantId: req.tenantId,
    rangeMeta,
    comparisonEnabled
  });

  const doc = new PDFDocument({ margin: 40 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => {
    const pdfBuffer = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=erc-reports.pdf");
    res.send(pdfBuffer);
  });

  doc.fontSize(18).text("ERC Advanced Reports", { underline: true });
  doc.moveDown(0.6);
  doc.fontSize(11).text(`Range: ${report.dateRange.startDate} to ${report.dateRange.endDate}`);
  doc.text(`Compare Enabled: ${report.comparisonEnabled ? "Yes" : "No"}`);
  doc.moveDown();

  doc.fontSize(13).text("KPI Summary");
  doc.fontSize(11).text(`Total Cameras: ${report.kpis.totalCameras}`);
  doc.text(`Working Cameras: ${report.kpis.workingCameras}`);
  doc.text(`Not Working Cameras: ${report.kpis.notWorkingCameras}`);
  doc.text(`Total Downcalls: ${report.kpis.totalDowncalls}`);
  doc.text(`Uptime: ${report.kpis.uptimePercent}%`);
  doc.text(`SLA: ${report.kpis.slaPercent}%`);

  doc.moveDown();
  doc.fontSize(13).text("Issue Category");
  report.charts.issueCategory.forEach((row) => {
    doc.fontSize(11).text(`- ${row.name}: ${row.value}`);
  });

  doc.moveDown();
  doc.fontSize(13).text("Downcalls Trend");
  report.charts.downcallsTrend.forEach((row) => {
    doc.fontSize(10).text(`${row.label}: ${row.downcalls}`);
  });

  if (report.alerts.length) {
    doc.moveDown();
    doc.fontSize(13).text("Alerts");
    report.alerts.forEach((alert) => {
      doc.fontSize(10).text(`[${alert.severity.toUpperCase()}] ${alert.title} - ${alert.message}`);
    });
  }

  doc.end();
});

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const toHtmlRows = (rows, columns) =>
  rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${escapeHtml(row[column.key])}</td>`)
          .join("")}</tr>`
    )
    .join("");

const exportExcel = asyncHandler(async (req, res) => {
  const rangeMeta = getRangeMetaFromQuery(req.query);
  const comparisonEnabled = String(req.query.compare || "false").toLowerCase() === "true";
  const report = await fetchReportPayload({
    tenantId: req.tenantId,
    rangeMeta,
    comparisonEnabled
  });

  const cameraColumns = [
    { key: "cameraId", label: "Camera ID" },
    { key: "name", label: "Camera Name" },
    { key: "location", label: "Location" },
    { key: "status", label: "Status" },
    { key: "lastIssue", label: "Last Issue" }
  ];
  const faultColumns = [
    { key: "name", label: "Issue Category" },
    { key: "value", label: "Count" }
  ];
  const trendColumns = [
    { key: "label", label: "Period" },
    { key: "downcalls", label: "Downcalls" },
    { key: "previousDowncalls", label: "Previous Period Downcalls" }
  ];

  const html = `
  <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        table { border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; }
        th { background: #e2e8f0; }
      </style>
    </head>
    <body>
      <h2>ERC Advanced Report</h2>
      <p>Range: ${report.dateRange.startDate} to ${report.dateRange.endDate}</p>
      <h3>KPI Summary</h3>
      <table>
        <tr><th>Total Cameras</th><th>Working Cameras</th><th>Not Working Cameras</th><th>Total Downcalls</th><th>Uptime %</th><th>SLA %</th></tr>
        <tr><td>${report.kpis.totalCameras}</td><td>${report.kpis.workingCameras}</td><td>${report.kpis.notWorkingCameras}</td><td>${report.kpis.totalDowncalls}</td><td>${report.kpis.uptimePercent}</td><td>${report.kpis.slaPercent}</td></tr>
      </table>
      <h3>Camera Data</h3>
      <table>
        <tr>${cameraColumns.map((column) => `<th>${column.label}</th>`).join("")}</tr>
        ${toHtmlRows(report.rawTables.cameraData, cameraColumns)}
      </table>
      <h3>Fault Data</h3>
      <table>
        <tr>${faultColumns.map((column) => `<th>${column.label}</th>`).join("")}</tr>
        ${toHtmlRows(report.rawTables.faultData, faultColumns)}
      </table>
      <h3>Downcalls Data</h3>
      <table>
        <tr>${trendColumns.map((column) => `<th>${column.label}</th>`).join("")}</tr>
        ${toHtmlRows(report.rawTables.downcallsData, trendColumns)}
      </table>
    </body>
  </html>`;

  res.setHeader("Content-Type", "application/vnd.ms-excel");
  res.setHeader("Content-Disposition", "attachment; filename=erc-reports.xls");
  res.send(html);
});

module.exports = {
  reportAnalytics,
  reportCompare,
  exportPdf,
  exportExcel
};
