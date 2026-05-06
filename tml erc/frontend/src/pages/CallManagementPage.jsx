import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import api from "../api";
import StatusBadge from "../components/StatusBadge";

const faultOptions = [
  { label: "Camera Not Working", value: "camera_not_working" },
  { label: "Wiring Issue", value: "wiring_issue" },
  { label: "Power Failure", value: "power_failure" },
  { label: "Network Issue", value: "network_issue" }
];

const CallManagementPage = () => {
  const [calls, setCalls] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    engineerId: "",
    date: "",
    search: ""
  });
  const [newCall, setNewCall] = useState({
    cameraId: "",
    issueDescription: "",
    priority: "medium",
    faultCategory: "camera_not_working"
  });

  const load = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });

      const [callsRes, engRes, camRes] = await Promise.all([
        api.get(`/calls?${params.toString()}`),
        api.get("/auth/engineers"),
        api.get("/cameras")
      ]);
      setCalls(callsRes.data.calls);
      setEngineers(engRes.data.engineers);
      setCameras(camRes.data.cameras);
      if (!newCall.cameraId && camRes.data.cameras[0]) {
        setNewCall((prev) => ({ ...prev, cameraId: camRes.data.cameras[0].cameraId }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load calls");
    }
  };

  useEffect(() => {
    load();
  }, [filters.status, filters.engineerId, filters.date, filters.search]);

  const assign = async (callId, engineerId) => {
    if (!engineerId) return;
    setWorkingId(callId);
    try {
      await api.patch(`/calls/${callId}/assign`, { engineerId });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to assign call");
    } finally {
      setWorkingId("");
    }
  };

  const createCall = async (event) => {
    event.preventDefault();
    try {
      await api.post("/calls", newCall);
      setNewCall((prev) => ({ ...prev, issueDescription: "" }));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create call");
    }
  };

  const processedCalls = useMemo(
    () =>
      calls.map((call) => {
        const elapsed = dayjs().diff(dayjs(call.createdAt), "minute");
        const overdue = call.isOverdue || (call.status !== "completed" && elapsed > 240);
        return { ...call, elapsed, overdue };
      }),
    [calls]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-heading text-xl font-semibold">Create Call</h2>
        <form onSubmit={createCall} className="mt-3 grid gap-3 md:grid-cols-4">
          <select
            value={newCall.cameraId}
            onChange={(e) => setNewCall((prev) => ({ ...prev, cameraId: e.target.value }))}
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
          >
            {cameras.map((camera) => (
              <option key={camera._id} value={camera.cameraId}>
                {camera.cameraId} - {camera.name}
              </option>
            ))}
          </select>
          <select
            value={newCall.priority}
            onChange={(e) => setNewCall((prev) => ({ ...prev, priority: e.target.value }))}
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select
            value={newCall.faultCategory}
            onChange={(e) => setNewCall((prev) => ({ ...prev, faultCategory: e.target.value }))}
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
          >
            {faultOptions.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            value={newCall.issueDescription}
            onChange={(e) => setNewCall((prev) => ({ ...prev, issueDescription: e.target.value }))}
            placeholder="Issue description"
            className="rounded-lg border border-slate-300 px-3 py-2 dark:bg-slate-800"
          />
          <button className="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white">Raise Call</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-heading text-xl font-semibold">Advanced Call Management</h2>
        {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="awaiting_customer_approval">Awaiting Approval</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="rejected_on_hold">Rejected / On Hold</option>
          </select>
          <select
            value={filters.engineerId}
            onChange={(e) => setFilters((prev) => ({ ...prev, engineerId: e.target.value }))}
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
          >
            <option value="">All Engineers</option>
            {engineers.map((eng) => (
              <option key={eng._id} value={eng._id}>
                {eng.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
            className="rounded-lg border border-slate-300 px-2 py-2 dark:bg-slate-800"
          />
          <input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search camera/issue"
            className="rounded-lg border border-slate-300 px-3 py-2 dark:bg-slate-800"
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-2">Camera</th>
                <th className="p-2">Issue</th>
                <th className="p-2">Priority</th>
                <th className="p-2">SLA Timer</th>
                <th className="p-2">Engineer</th>
                <th className="p-2">Assign</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {processedCalls.map((call) => (
                <tr
                  key={call._id}
                  className={`border-t border-slate-100 dark:border-slate-800 ${
                    call.status === "awaiting_customer_approval"
                      ? "bg-amber-50/60 dark:bg-amber-900/20"
                      : call.overdue
                        ? "bg-red-50/60 dark:bg-red-900/20"
                        : ""
                  }`}
                >
                  <td className="p-2 font-semibold">
                    {call.camera?.cameraId} ({call.camera?.name})
                  </td>
                  <td className="p-2">{call.issueDescription}</td>
                  <td className="p-2 capitalize">{call.priority}</td>
                  <td className={`p-2 font-semibold ${call.overdue ? "text-red-600" : ""}`}>
                    {call.elapsed} min
                  </td>
                  <td className="p-2">{call.assignedEngineer?.name || "Unassigned"}</td>
                  <td className="p-2">
                    <select
                      disabled={workingId === call._id}
                      onChange={(e) => assign(call._id, e.target.value)}
                      defaultValue=""
                      className="rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
                    >
                      <option value="">Assign</option>
                      {engineers.map((eng) => (
                        <option key={eng._id} value={eng._id}>
                          {eng.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <StatusBadge status={call.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CallManagementPage;
