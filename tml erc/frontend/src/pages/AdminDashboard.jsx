import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import api from "../api";
import ChartCard from "../components/ChartCard";
import CameraWaffle from "../components/CameraWaffle";

const PRIMARY_DARK = "#1E293B";
const GREEN_OK = "#32CD32";
const RED_DOWN = "#FF0000";
const statusColors = {
  Working: GREEN_OK,
  "Not Working": RED_DOWN
};
const faultCategoryColors = {
  "Camera Not Working": RED_DOWN,
  "Network Issue": "#0EA5E9",
  "Power Failure": "#D6A300",
  "Wiring Issue": "#F97316",
  Other: "#64748B"
};
const monthlyDowncallColors = {
  "Camera Not Working": RED_DOWN,
  "Network Issue": "#0ea5e9",
  "Power Failure": "#d6a300",
  "Wiring Issue": "#f97316",
  Other: "#64748b"
};
const monthlyDowncallCategoryOrder = [
  "Camera Not Working",
  "Network Issue",
  "Power Failure",
  "Wiring Issue",
  "Other"
];
const TIME_RANGE_OPTIONS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" }
];
const PIE_CX = "50%";
const PIE_CY = "50%";
const PIE_OUTER_RADIUS = 100;
const PIE_CHART_MARGIN = { top: 22, right: 24, bottom: 22, left: 24 };
const CHART_CARD_HEIGHT_CLASS = "h-[430px]";
const CHART_CANVAS_CLASS = "h-[300px] w-full max-w-[400px]";
const LEGEND_ZONE_CLASS = "mt-2 flex h-[120px] items-start justify-center";
const LEGEND_STACK_CLASS = "w-full max-w-[230px] space-y-2 text-sm font-medium text-[#1E293B]";
const FAULT_LABEL_BY_KEY = {
  camera_not_working: "Camera Not Working",
  network_issue: "Network Issue",
  power_failure: "Power Failure",
  wiring_issue: "Wiring Issue"
};
const FAULT_KEY_BY_LABEL = Object.entries(FAULT_LABEL_BY_KEY).reduce(
  (acc, [key, label]) => ({ ...acc, [label]: key }),
  {}
);
const ISSUE_OPTIONS = ["Camera Not Working", "Network Issue", "Power Failure", "Wiring Issue"];
const FAULT_CHART_ORDER = ["Camera Not Working", "Network Issue", "Power Failure", "Wiring Issue", "Other"];
const WAFFLE_STATUS_WORKING = "working";
const WAFFLE_STATUS_NOT_WORKING = "not-working";
const WAFFLE_STATUS_LABEL = {
  [WAFFLE_STATUS_WORKING]: "Working",
  [WAFFLE_STATUS_NOT_WORKING]: "Not Working"
};

const RADIAN = Math.PI / 180;
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
  if (!value) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill={PRIMARY_DARK}
      fontSize={12}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
};
const tooltipContentStyle = {
  borderColor: "#CBD5E1",
  borderRadius: "0.75rem",
  backgroundColor: "#FFFFFF"
};
const tooltipLabelStyle = {
  color: PRIMARY_DARK,
  fontWeight: 700
};
const tooltipItemStyle = {
  color: PRIMARY_DARK,
  fontWeight: 600
};

const normalizeMonthlyDowncalls = (rows) => {
  const counts = monthlyDowncallCategoryOrder.reduce((acc, name) => ({ ...acc, [name]: 0 }), {});
  const safeRows = Array.isArray(rows) ? rows : [];

  safeRows.forEach((row) => {
    const categoryName = typeof row?.name === "string" ? row.name : "Other";
    const value = Number(row?.value);
    const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
    const normalizedCategory = monthlyDowncallCategoryOrder.includes(categoryName) ? categoryName : "Other";
    counts[normalizedCategory] += safeValue;
  });

  return [
    { key: "camera_not_working", name: "Camera Not Working", value: counts["Camera Not Working"] },
    { key: "network_issue", name: "Network Issue", value: counts["Network Issue"] },
    { key: "power_failure", name: "Power Failure", value: counts["Power Failure"] },
    { key: "wiring_issue", name: "Wiring Issue", value: counts["Wiring Issue"] },
    { key: "other", name: "Other", value: counts.Other }
  ];
};
const normalizeCameraForWaffle = (camera, index) => {
  const id = camera?._id || camera?.id || `camera-${index + 1}`;
  const rawStatus = camera?.status;
  const isWorking = rawStatus === "active" || rawStatus === WAFFLE_STATUS_WORKING;
  const normalizedIssue = FAULT_LABEL_BY_KEY[camera?.lastFaultCategory] || null;
  return {
    ...camera,
    id,
    status: isWorking ? WAFFLE_STATUS_WORKING : WAFFLE_STATUS_NOT_WORKING,
    issue: isWorking ? null : normalizedIssue || "Camera Not Working"
  };
};

const buildLegendRows = (rows, colorByName) =>
  rows.map((row) => ({
    key: row.key || row.name,
    label: row.name,
    color: colorByName[row.name] || colorByName.Other || "#64748b"
  }));

const getDisplayValue = (value) => {
  if (value === null || value === undefined) return "N/A";
  const stringValue = String(value).trim();
  return stringValue.length ? stringValue : "N/A";
};

const TimeRangeToggle = ({ value, onChange, disabled }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    disabled={disabled}
    className={`rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 ${
      disabled ? "cursor-not-allowed opacity-70" : ""
    }`}
    aria-label="Select time range"
  >
    {TIME_RANGE_OPTIONS.map((option) => (
      <option key={option.key} value={option.key}>
        {option.label}
      </option>
    ))}
  </select>
);

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [timeRangeByChart, setTimeRangeByChart] = useState({
    cameraStatus: "monthly",
    faultAnalysis: "monthly",
    monthlyDowncalls: "monthly"
  });
  const [chartSummaries, setChartSummaries] = useState({
    cameraStatus: null,
    faultAnalysis: null,
    monthlyDowncalls: null
  });
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [isChartUpdating, setIsChartUpdating] = useState({
    cameraStatus: false,
    faultAnalysis: false,
    monthlyDowncalls: false
  });
  const [interactiveCameras, setInteractiveCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [selectedCameraDetails, setSelectedCameraDetails] = useState(null);
  const [loadingSelectedCameraDetails, setLoadingSelectedCameraDetails] = useState(false);
  const [selectedCameraDetailsError, setSelectedCameraDetailsError] = useState("");
  const [statusEditor, setStatusEditor] = useState({
    open: false,
    cameraId: null,
    status: WAFFLE_STATUS_WORKING,
    issue: "Camera Not Working"
  });
  const [savingStatusUpdate, setSavingStatusUpdate] = useState(false);
  const [error, setError] = useState("");

  const loadChartSummary = async (chartKey, timeRange) => {
    if (chartKey === "cameraStatus" && !chartSummaries.cameraStatus) setLoadingSummary(true);
    setIsChartUpdating((previous) => ({ ...previous, [chartKey]: true }));
    setError("");
    try {
      const { data } = await api.get("/dashboard/summary", { params: { timeRange } });
      const safeData = data && typeof data === "object" ? data : {};
      const nextTimeRange = String(safeData.selectedTimeRange || timeRange || "monthly").toLowerCase();
      setChartSummaries((previous) => ({ ...previous, [chartKey]: safeData }));
      if (chartKey === "cameraStatus") setSummary(safeData);
      setTimeRangeByChart((previous) =>
        previous[chartKey] === nextTimeRange ? previous : { ...previous, [chartKey]: nextTimeRange }
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load dashboard");
    } finally {
      if (chartKey === "cameraStatus") setLoadingSummary(false);
      setIsChartUpdating((previous) => ({ ...previous, [chartKey]: false }));
    }
  };

  useEffect(() => {
    loadChartSummary("cameraStatus", timeRangeByChart.cameraStatus);
  }, [timeRangeByChart.cameraStatus]);

  useEffect(() => {
    loadChartSummary("faultAnalysis", timeRangeByChart.faultAnalysis);
  }, [timeRangeByChart.faultAnalysis]);

  useEffect(() => {
    loadChartSummary("monthlyDowncalls", timeRangeByChart.monthlyDowncalls);
  }, [timeRangeByChart.monthlyDowncalls]);

  const safeSummary = summary || {};
  const cameraGridData = Array.isArray(safeSummary.cameraGrid) ? safeSummary.cameraGrid : [];

  useEffect(() => {
    if (cameraGridData.length === 0) return;
    setInteractiveCameras((previous) => {
      const previousById = new Map(previous.map((camera) => [camera.id, camera]));
      return cameraGridData.map((camera, index) => {
        const normalized = normalizeCameraForWaffle(camera, index);
        const preserved = previousById.get(normalized.id);
        if (!preserved) return normalized;
        return {
          ...normalized,
          status: preserved.status,
          issue: preserved.issue
        };
      });
    });
  }, [cameraGridData]);

  const onCameraClick = async (camera) => {
    setSelectedCameraId(camera.id);
    setSelectedCameraDetailsError("");
    setSelectedCameraDetails(null);

    if (!camera?._id) return;
    setLoadingSelectedCameraDetails(true);
    try {
      const { data } = await api.get(`/cameras/${camera._id}/details`);
      setSelectedCameraDetails(data);
    } catch (err) {
      setSelectedCameraDetailsError(err.response?.data?.message || "Unable to load camera details");
    } finally {
      setLoadingSelectedCameraDetails(false);
    }
  };

  const openStatusEditorForSelectedCamera = () => {
    const selectedCamera = interactiveCameras.find((camera) => camera.id === selectedCameraId);
    if (!selectedCamera) return;
    setStatusEditor({
      open: true,
      cameraId: selectedCamera.id,
      status: selectedCamera.status || WAFFLE_STATUS_WORKING,
      issue: selectedCamera.issue || "Camera Not Working"
    });
  };

  const closeStatusEditor = () => {
    setStatusEditor({
      open: false,
      cameraId: null,
      status: WAFFLE_STATUS_WORKING,
      issue: "Camera Not Working"
    });
  };

  const saveStatusEditor = async () => {
    const requiresIssue = statusEditor.status === WAFFLE_STATUS_NOT_WORKING;
    if (requiresIssue && !statusEditor.issue) return;
    const targetCamera = interactiveCameras.find((camera) => camera.id === statusEditor.cameraId);
    if (!targetCamera) return;

    const nextStatus = statusEditor.status;
    const nextIssue = nextStatus === WAFFLE_STATUS_NOT_WORKING ? statusEditor.issue : null;
    const nextFaultCategory = nextIssue ? FAULT_KEY_BY_LABEL[nextIssue] || "camera_not_working" : "";
    const patchPayload = {
      status: nextStatus === WAFFLE_STATUS_WORKING ? "active" : "faulty",
      lastFaultCategory: nextFaultCategory,
      lastIssue: nextIssue || ""
    };

    setSavingStatusUpdate(true);
    setError("");
    try {
      if (targetCamera._id) {
        await api.patch(`/cameras/${targetCamera._id}`, patchPayload);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save camera status");
      setSavingStatusUpdate(false);
      return;
    }

    setInteractiveCameras((previous) =>
      previous.map((camera) => {
        if (camera.id !== statusEditor.cameraId) return camera;
        return {
          ...camera,
          status: nextStatus,
          issue: nextIssue,
          lastFaultCategory: nextFaultCategory
        };
      })
    );
    setSavingStatusUpdate(false);
    closeStatusEditor();
  };

  const selectedCamera = useMemo(
    () => interactiveCameras.find((camera) => camera.id === selectedCameraId) || null,
    [interactiveCameras, selectedCameraId]
  );

  const liveChartSnapshot = useMemo(() => {
    if (!interactiveCameras.length) return null;
    const issueCounts = FAULT_CHART_ORDER.reduce((acc, name) => ({ ...acc, [name]: 0 }), {});
    let nonWorking = 0;

    interactiveCameras.forEach((camera) => {
      if (camera.status !== WAFFLE_STATUS_NOT_WORKING) return;
      nonWorking += 1;
      const rawIssue = typeof camera.issue === "string" ? camera.issue.trim() : "";
      const normalizedIssue = rawIssue.length ? rawIssue : "Camera Not Working";
      const issueKey = issueCounts[normalizedIssue] !== undefined ? normalizedIssue : "Other";
      issueCounts[issueKey] += 1;
    });

    const total = interactiveCameras.length;
    const working = Math.max(total - nonWorking, 0);
    const liveFaultAnalysis = FAULT_CHART_ORDER.map((name) => ({ name, value: issueCounts[name] })).filter(
      (row) => row.value > 0
    );

    return {
      cameraStatus: {
        total,
        active: working,
        faulty: nonWorking
      },
      faultAnalysis: liveFaultAnalysis
    };
  }, [interactiveCameras]);

  const chartData = useMemo(() => {
    if (liveChartSnapshot) return liveChartSnapshot.faultAnalysis;
    const rows = Array.isArray(chartSummaries?.faultAnalysis?.faultAnalysis)
      ? chartSummaries.faultAnalysis.faultAnalysis
      : [];
    return rows.filter((row) => Number(row.value) > 0);
  }, [chartSummaries, liveChartSnapshot]);

  if (loadingSummary && !summary) return <p className="text-slate-500">Loading dashboard...</p>;
  if (error && !summary) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;

  const cameraStatus = liveChartSnapshot?.cameraStatus || summary.cameraStatus || {};
  const hasRenderableSummary =
    Object.keys(cameraStatus).length > 0 || chartData.length > 0 || interactiveCameras.length > 0 || cameraGridData.length > 0;

  if (!hasRenderableSummary) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 shadow-panel dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Dashboard data is currently unavailable. Please refresh in a moment.
      </div>
    );
  }

  const nonWorkingCount = Number(cameraStatus.faulty) || 0;
  const totalCameras = Number(cameraStatus.total) || interactiveCameras.length || 0;
  const workingCount = Number(cameraStatus.active) || Math.max(totalCameras - nonWorkingCount, 0);
  const statusPie = [
    { name: "Working", value: workingCount },
    { name: "Not Working", value: nonWorkingCount }
  ];
  const monthlyChartSummary = chartSummaries.monthlyDowncalls || {};
  const monthlyDowncallSource = Array.isArray(monthlyChartSummary.monthlyDowncalls) ? monthlyChartSummary.monthlyDowncalls : [];
  const faultAnalysisFallbackSource = Array.isArray(monthlyChartSummary.faultAnalysis)
    ? monthlyChartSummary.faultAnalysis
    : Array.isArray(chartSummaries?.faultAnalysis?.faultAnalysis)
      ? chartSummaries.faultAnalysis.faultAnalysis
      : [];
  const normalizedMonthlyFromSource = monthlyDowncallSource.length ? normalizeMonthlyDowncalls(monthlyDowncallSource) : [];
  const normalizedMonthlyFromFallback = faultAnalysisFallbackSource.length
    ? normalizeMonthlyDowncalls(faultAnalysisFallbackSource)
    : [];
  const sourceTotal = normalizedMonthlyFromSource.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  const fallbackTotal = normalizedMonthlyFromFallback.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  const resolvedMonthlyData =
    sourceTotal > 0
      ? normalizedMonthlyFromSource
      : fallbackTotal > 0
        ? normalizedMonthlyFromFallback
        : normalizedMonthlyFromSource;
  const filteredMonthlyData = resolvedMonthlyData
    .filter((row) => Number.isFinite(Number(row.value)))
    .filter((row) => Number(row.value) > 0);
  console.log("Monthly Data:", filteredMonthlyData);
  const monthlyDowncalls = filteredMonthlyData.slice(0, 5);
  const isMonthlyDataTrulyEmpty = monthlyDowncalls.length === 0;
  const totalMonthlyDowncalls = monthlyDowncalls.reduce((sum, row) => sum + row.value, 0);
  const cameraStatusKpi = (
    <div className="mt-0 text-left font-heading text-2xl font-semibold leading-none">
      <span className="text-[#1E293B]">{totalCameras}</span>
      <span className="px-1 text-[#1E293B]">/</span>
      <span className="text-[#32CD32]">{workingCount}</span>
    </div>
  );
  const formatMonthlyTooltip = (value, name) => {
    const percent = totalMonthlyDowncalls ? ((value / totalMonthlyDowncalls) * 100).toFixed(1) : "0.0";
    return [`${value} (${percent}%)`, name];
  };
  const statusLegendRows = buildLegendRows(statusPie, statusColors);
  const faultLegendRows = buildLegendRows(chartData, faultCategoryColors);
  const monthlyLegendRows = buildLegendRows(monthlyDowncalls, monthlyDowncallColors);
  const renderTimeRangeToggle = (chartKey) => (
    <TimeRangeToggle
      value={timeRangeByChart[chartKey]}
      onChange={(value) => setTimeRangeByChart((previous) => ({ ...previous, [chartKey]: value }))}
      disabled={isChartUpdating[chartKey]}
    />
  );

  return (
    <div className="space-y-5">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Camera Status" action={renderTimeRangeToggle("cameraStatus")}>
          <div className={`flex ${CHART_CARD_HEIGHT_CLASS} flex-col transition-opacity duration-300 ${isChartUpdating.cameraStatus ? "opacity-70" : "opacity-100"}`}>
            <div className="mb-1 h-8">{cameraStatusKpi}</div>
            <div className="grid min-h-0 flex-1 place-items-center">
              <div className={CHART_CANVAS_CLASS}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={PIE_CHART_MARGIN}>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      cx={PIE_CX}
                      cy={PIE_CY}
                      outerRadius={PIE_OUTER_RADIUS}
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {statusPie.map((entry) => (
                        <Cell key={entry.name} fill={statusColors[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={LEGEND_ZONE_CLASS}>
              <div className={LEGEND_STACK_CLASS}>
                {statusLegendRows.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Issue Category" action={renderTimeRangeToggle("faultAnalysis")}>
          <div className={`flex ${CHART_CARD_HEIGHT_CLASS} flex-col transition-opacity duration-300 ${isChartUpdating.faultAnalysis ? "opacity-70" : "opacity-100"}`}>
            {chartData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-slate-500 dark:text-slate-400">No data</div>
            ) : (
              <>
                <div className="mb-1 h-8" />
                <div className="grid min-h-0 flex-1 place-items-center">
                  <div className={CHART_CANVAS_CLASS}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={PIE_CHART_MARGIN}>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx={PIE_CX}
                          cy={PIE_CY}
                          outerRadius={PIE_OUTER_RADIUS}
                          labelLine={false}
                          label={renderPieLabel}
                        >
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={faultCategoryColors[entry.name] || faultCategoryColors.Other} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className={LEGEND_ZONE_CLASS}>
                  <div className={LEGEND_STACK_CLASS}>
                    {faultLegendRows.map((item) => (
                      <div key={item.key} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Monthly Downcalls" action={renderTimeRangeToggle("monthlyDowncalls")}>
          <div className={`flex ${CHART_CARD_HEIGHT_CLASS} flex-col transition-opacity duration-300 ${isChartUpdating.monthlyDowncalls ? "opacity-70" : "opacity-100"}`}>
            {isMonthlyDataTrulyEmpty ? (
              <div className="grid h-full place-items-center text-sm text-slate-500 dark:text-slate-400">No data</div>
            ) : (
              <>
                <div className="mb-1 h-8" />
                <div className="grid min-h-0 flex-1 place-items-center">
                  <div className={CHART_CANVAS_CLASS}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={PIE_CHART_MARGIN}>
                        <Pie
                          data={monthlyDowncalls}
                          dataKey="value"
                          nameKey="name"
                          cx={PIE_CX}
                          cy={PIE_CY}
                          outerRadius={PIE_OUTER_RADIUS}
                          labelLine={false}
                          label={renderPieLabel}
                        >
                          {monthlyDowncalls.map((entry) => (
                            <Cell
                              key={entry.key || entry.name}
                              fill={monthlyDowncallColors[entry.name] || monthlyDowncallColors.Other}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={formatMonthlyTooltip}
                          contentStyle={tooltipContentStyle}
                          labelStyle={tooltipLabelStyle}
                          itemStyle={tooltipItemStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className={LEGEND_ZONE_CLASS}>
                  <div className={LEGEND_STACK_CLASS}>
                    {monthlyLegendRows.map((item) => (
                      <div key={item.key} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ChartCard>
      </section>

      <ChartCard title={`Camera Waffle Grid (${totalCameras} Cameras)`}>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Click any camera to view full details. Use Edit to update working status and issue.
        </p>
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div>
            <CameraWaffle cameras={interactiveCameras} onSelect={onCameraClick} selectedCameraId={selectedCameraId} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 dark:border-slate-700 dark:bg-slate-900/60">
            {!selectedCamera ? (
              <div className="grid h-full min-h-52 place-items-center text-center text-sm text-slate-500 dark:text-slate-400">
                Select a camera from the waffle grid to view full details.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {getDisplayValue(selectedCamera.name)}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Camera ID: {getDisplayValue(selectedCamera.cameraId || selectedCamera.id)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCameraId(null)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>

                {loadingSelectedCameraDetails && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading camera details...</p>
                )}
                {selectedCameraDetailsError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{selectedCameraDetailsError}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Camera ID</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {getDisplayValue(selectedCamera.cameraId || selectedCamera.id)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Camera Name</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {getDisplayValue(selectedCamera.name)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Model Number</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {getDisplayValue(selectedCameraDetails?.camera?.modelNumber || selectedCamera.modelNumber)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Serial Number</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {getDisplayValue(selectedCameraDetails?.camera?.serialNumber || selectedCamera.serialNumber)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Location</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {getDisplayValue(selectedCamera.location)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Status</span>
                    <span
                      className={`text-right font-semibold ${
                        selectedCamera.status === WAFFLE_STATUS_WORKING ? "text-[#32CD32]" : "text-[#FF0000]"
                      }`}
                    >
                      {WAFFLE_STATUS_LABEL[selectedCamera.status] || "Not Working"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Issue</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {selectedCamera.status === WAFFLE_STATUS_NOT_WORKING
                        ? getDisplayValue(selectedCamera.issue)
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={openStatusEditorForSelectedCamera}
                    className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ChartCard>

      {statusEditor.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">Update Camera Status</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose the current health state for this camera.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatusEditor((previous) => ({ ...previous, status: WAFFLE_STATUS_WORKING }))}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  statusEditor.status === WAFFLE_STATUS_WORKING
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Working
              </button>
              <button
                type="button"
                onClick={() => setStatusEditor((previous) => ({ ...previous, status: WAFFLE_STATUS_NOT_WORKING }))}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  statusEditor.status === WAFFLE_STATUS_NOT_WORKING
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Not Working
              </button>
            </div>

            {statusEditor.status === WAFFLE_STATUS_NOT_WORKING && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Issue</label>
                <select
                  value={statusEditor.issue}
                  onChange={(event) => setStatusEditor((previous) => ({ ...previous, issue: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {ISSUE_OPTIONS.map((issue) => (
                    <option key={issue} value={issue}>
                      {issue}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeStatusEditor}
                disabled={savingStatusUpdate}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStatusEditor}
                disabled={savingStatusUpdate}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingStatusUpdate ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
