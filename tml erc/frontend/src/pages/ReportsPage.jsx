import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import api from "../api";

const RANGE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "half_yearly", label: "Half-Yearly" },
  { value: "yearly", label: "Yearly" }
];

const CAMERA_STATUS_COLORS = {
  Working: "#32CD32",
  "Not Working": "#FF0000"
};

const ISSUE_COLORS = {
  "Camera Not Working": "#FF0000",
  "Network Issue": "#0EA5E9",
  "Power Failure": "#D6A300",
  "Wiring Issue": "#F97316",
  Other: "#64748B"
};

const formatDelta = (value) => {
  const safe = Number(value) || 0;
  return `${safe > 0 ? "+" : ""}${safe.toFixed(1)}%`;
};

const trendToneClass = (value) => {
  const safe = Number(value) || 0;
  if (safe > 0) return "text-emerald-600";
  if (safe < 0) return "text-rose-600";
  return "text-slate-500";
};

const trendArrow = (value) => {
  const safe = Number(value) || 0;
  if (safe > 0) return "↑";
  if (safe < 0) return "↓";
  return "→";
};

const ReportsPage = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async ({ forceCustom } = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = {
        range: selectedTimeRange,
        compare: comparisonEnabled
      };
      const hasCustomRange = Boolean(startDate && endDate);
      if (forceCustom || hasCustomRange) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const { data } = await api.get("/reports", { params });
      setReport(data.report);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedTimeRange, comparisonEnabled]);

  const applyCustomRange = () => {
    if (!startDate || !endDate) {
      setError("Please select both From Date and To Date.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("From Date must be before or equal to To Date.");
      return;
    }
    load({ forceCustom: true });
  };

  const clearCustomRange = () => {
    setStartDate("");
    setEndDate("");
    load();
  };

  const exportReport = async (type) => {
    try {
      const params = {
        range: selectedTimeRange,
        compare: comparisonEnabled
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const endpoint = type === "pdf" ? "/reports/export/pdf" : "/reports/export/excel";
      const response = await api.get(endpoint, {
        params,
        responseType: "blob"
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const extension = type === "pdf" ? "pdf" : "xls";
      link.href = url;
      link.setAttribute("download", `erc-reports.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to export ${type.toUpperCase()}`);
    }
  };

  const kpiCards = useMemo(() => {
    const kpis = report?.kpis;
    if (!kpis) return [];
    return [
      {
        key: "totalCameras",
        label: "Total Cameras",
        value: kpis.totalCameras,
        delta: kpis.deltas?.totalCameras || 0
      },
      {
        key: "workingCameras",
        label: "Working Cameras",
        value: kpis.workingCameras,
        delta: kpis.deltas?.workingCameras || 0
      },
      {
        key: "notWorkingCameras",
        label: "Not Working Cameras",
        value: kpis.notWorkingCameras,
        delta: kpis.deltas?.notWorkingCameras || 0
      },
      {
        key: "totalDowncalls",
        label: "Total Downcalls",
        value: kpis.totalDowncalls,
        delta: kpis.deltas?.totalDowncalls || 0
      },
      {
        key: "uptimePercent",
        label: "Uptime %",
        value: `${kpis.uptimePercent}%`,
        delta: kpis.deltas?.uptimePercent || 0
      },
      {
        key: "slaPercent",
        label: "SLA %",
        value: `${kpis.slaPercent}%`,
        delta: kpis.deltas?.slaPercent || 0
      }
    ];
  }, [report]);

  const issueCategoryData = useMemo(
    () => (Array.isArray(report?.charts?.issueCategory) ? report.charts.issueCategory.filter((row) => row.value > 0) : []),
    [report]
  );

  const noData =
    !loading &&
    !!report &&
    (report.kpis?.totalDowncalls || 0) === 0 &&
    issueCategoryData.length === 0 &&
    Array.isArray(report?.charts?.downcallsTrend) &&
    report.charts.downcallsTrend.every((row) => (row.downcalls || 0) === 0);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold text-slate-900">Reports Dashboard</h2>
            <p className="mt-1 text-sm text-slate-500">
              {report?.dateRange?.startDate && report?.dateRange?.endDate
                ? `Range: ${report.dateRange.startDate} to ${report.dateRange.endDate}`
                : "Analytics overview"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={selectedTimeRange}
              onChange={(event) => setSelectedTimeRange(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={applyCustomRange}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Apply Range
            </button>
            <button
              onClick={clearCustomRange}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={comparisonEnabled}
                onChange={(event) => setComparisonEnabled(event.target.checked)}
              />
              Compare with previous period
            </label>
            <button
              onClick={() => exportReport("pdf")}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Export PDF
            </button>
            <button
              onClick={() => exportReport("excel")}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Export Excel
            </button>
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      </section>

      {loading && <p className="text-sm text-slate-600">Loading reports...</p>}

      {!loading && report && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {kpiCards.map((card) => (
              <article key={card.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-panel">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
                <p className={`mt-1 text-sm font-semibold ${trendToneClass(card.delta)}`}>
                  {trendArrow(card.delta)} {formatDelta(card.delta)}
                </p>
              </article>
            ))}
          </section>

          {Array.isArray(report.alerts) && report.alerts.length > 0 && (
            <section className="grid gap-3 md:grid-cols-2">
              {report.alerts.map((alert, index) => (
                <article
                  key={`${alert.title}-${index}`}
                  className={`rounded-xl border p-3 ${
                    alert.severity === "critical"
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-amber-300 bg-amber-50 text-amber-800"
                  }`}
                >
                  <p className="text-sm font-bold uppercase">{alert.severity}</p>
                  <p className="mt-1 font-semibold">{alert.title}</p>
                  <p className="mt-1 text-sm">{alert.message}</p>
                </article>
              ))}
            </section>
          )}

          {noData ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-panel">
              <p className="text-slate-500">No data available for selected period</p>
            </section>
          ) : (
            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
                <h3 className="font-heading text-lg font-semibold text-slate-900">Camera Status</h3>
                <div className="mt-3 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={report.charts.cameraStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                        {report.charts.cameraStatus.map((row) => (
                          <Cell key={row.name} fill={CAMERA_STATUS_COLORS[row.name] || "#64748B"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
                <h3 className="font-heading text-lg font-semibold text-slate-900">Issue Category</h3>
                <div className="mt-3 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={issueCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                        {issueCategoryData.map((row) => (
                          <Cell key={row.name} fill={ISSUE_COLORS[row.name] || "#64748B"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel lg:col-span-2">
                <h3 className="font-heading text-lg font-semibold text-slate-900">Downcalls Trend</h3>
                <div className="mt-3 h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={report.charts.downcallsTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="downcalls" name="Current Period Downcalls" fill="#1E293B" radius={[6, 6, 0, 0]} />
                      {comparisonEnabled && (
                        <Line
                          type="monotone"
                          dataKey="previousDowncalls"
                          name="Previous Period Downcalls"
                          stroke="#32CD32"
                          strokeWidth={2}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
