import { useEffect, useMemo, useState } from "react";
import api from "../api";
import StatusBadge from "../components/StatusBadge";

const faultOptions = [
  { label: "Camera Not Working", value: "camera_not_working" },
  { label: "Wiring Issue", value: "wiring_issue" },
  { label: "Power Failure", value: "power_failure" },
  { label: "Network Issue", value: "network_issue" }
];

const ClientDashboard = () => {
  const [cameras, setCameras] = useState([]);
  const [calls, setCalls] = useState([]);
  const [decisionLoadingId, setDecisionLoadingId] = useState("");
  const [decisionNotes, setDecisionNotes] = useState({});
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    cameraId: "",
    issueDescription: "",
    priority: "medium",
    faultCategory: "camera_not_working"
  });

  const stats = useMemo(() => {
    const total = cameras.length;
    const active = cameras.filter((c) => c.status === "active").length;
    const faulty = cameras.filter((c) => c.status === "faulty").length;
    const maintenance = cameras.filter((c) => c.status === "maintenance").length;
    return { total, active, faulty, maintenance };
  }, [cameras]);

  const load = async () => {
    try {
      const [camRes, callRes] = await Promise.all([api.get("/cameras"), api.get("/calls")]);
      setCameras(camRes.data.cameras);
      setCalls(callRes.data.calls);
      setForm((prev) => ({
        ...prev,
        cameraId: camRes.data.cameras[0]?.cameraId || ""
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load client data");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const raiseIssue = async (event) => {
    event.preventDefault();
    try {
      await api.post("/calls", form);
      setForm((prev) => ({ ...prev, issueDescription: "" }));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to raise issue");
    }
  };

  const submitDecision = async (callId, decision) => {
    setDecisionLoadingId(callId);
    try {
      await api.patch(`/calls/${callId}/customer-decision`, {
        decision,
        decisionNote: decisionNotes[callId] || ""
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit approval decision");
    } finally {
      setDecisionLoadingId("");
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="font-heading text-2xl font-semibold">Client Dashboard</h2>
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-brand-700">Active</p>
          <p className="mt-1 text-2xl font-semibold text-brand-700">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-ember-500">Faulty</p>
          <p className="mt-1 text-2xl font-semibold text-ember-500">{stats.faulty}</p>
        </div>
        <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-ambertone-500">Maintenance</p>
          <p className="mt-1 text-2xl font-semibold text-ambertone-500">{stats.maintenance}</p>
        </div>
      </div>

      <form
        onSubmit={raiseIssue}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900"
      >
        <h3 className="font-heading text-lg font-semibold">Raise Complaint</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Camera
            <select
              value={form.cameraId}
              onChange={(e) => setForm((prev) => ({ ...prev, cameraId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
              required
            >
              {cameras.map((camera) => (
                <option key={camera._id} value={camera.cameraId}>
                  {camera.cameraId} - {camera.location}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Priority
            <select
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Fault Category
            <select
              value={form.faultCategory}
              onChange={(e) => setForm((prev) => ({ ...prev, faultCategory: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
            >
              {faultOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            Issue Description
            <textarea
              value={form.issueDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, issueDescription: e.target.value }))}
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
              required
            />
          </label>
        </div>
        <button className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Submit Complaint
        </button>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-heading text-lg font-semibold">Approval Requests & Complaint History</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-2">Camera</th>
                <th className="p-2">Issue</th>
                <th className="p-2">Engineer</th>
                <th className="p-2">Status</th>
                <th className="p-2">Approval Note</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr
                  key={call._id}
                  className={`border-t border-slate-100 dark:border-slate-800 ${
                    call.status === "awaiting_customer_approval" ? "bg-amber-50/70 dark:bg-amber-900/20" : ""
                  }`}
                >
                  <td className="p-2 font-semibold">{call.camera?.cameraId}</td>
                  <td className="p-2">{call.issueDescription}</td>
                  <td className="p-2">{call.assignedEngineer?.name || "Pending"}</td>
                  <td className="p-2">
                    <StatusBadge status={call.status} />
                  </td>
                  <td className="p-2">{call.approval?.requestNote || "-"}</td>
                  <td className="p-2">
                    {call.status === "awaiting_customer_approval" ? (
                      <div className="space-y-2">
                        <textarea
                          value={decisionNotes[call._id] || ""}
                          onChange={(e) =>
                            setDecisionNotes((previous) => ({ ...previous, [call._id]: e.target.value }))
                          }
                          placeholder="Add optional note"
                          className="min-h-16 w-56 rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={decisionLoadingId === call._id}
                            onClick={() => submitDecision(call._id, "approve")}
                            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={decisionLoadingId === call._id}
                            onClick={() => submitDecision(call._id, "reject")}
                            className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
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

export default ClientDashboard;
