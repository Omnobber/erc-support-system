import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../api";
import StatusBadge from "../components/StatusBadge";
import KpiCard from "../components/KpiCard";

const statuses = ["pending", "assigned", "in_progress", "completed", "rejected_on_hold"];

const uploadFile = async (file, folder = "erc-support") => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);
  const { data } = await api.post("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data.url;
};

const EngineerDashboard = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [approvalLoadingId, setApprovalLoadingId] = useState("");
  const [uploadingId, setUploadingId] = useState("");
  const [formState, setFormState] = useState({});

  const load = async () => {
    try {
      const { data } = await api.get("/calls");
      setCalls(data.calls);
      const next = {};
      data.calls.forEach((row) => {
        next[row._id] = {
          status: row.status,
          feedback: row.feedback || "",
          beforeImageUrl: row.images?.before || "",
          afterImageUrl: row.images?.after || "",
          lat: row.gps?.lat ?? "",
          lng: row.gps?.lng ?? "",
          approvalNote: row.approval?.requestNote || ""
        };
      });
      setFormState(next);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load assigned calls");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = calls.length;
    const completed = calls.filter((row) => row.status === "completed").length;
    const pending = calls.filter((row) => row.status !== "completed").length;
    return { total, completed, pending };
  }, [calls]);

  const updateField = (id, key, value) => {
    setFormState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value }
    }));
  };

  const uploadAndSet = async (callId, side, file) => {
    setUploadingId(callId);
    try {
      const url = await uploadFile(file, "erc-support/calls");
      updateField(callId, side === "before" ? "beforeImageUrl" : "afterImageUrl", url);
      toast.success(`${side} image uploaded`);
    } catch (err) {
      setError(err.response?.data?.message || "Image upload failed");
    } finally {
      setUploadingId("");
    }
  };

  const save = async (id) => {
    const payload = formState[id];
    if (payload?.status === "awaiting_customer_approval") return;
    setSavingId(id);
    try {
      await api.patch(`/calls/${id}/status`, {
        status: payload.status,
        feedback: payload.feedback,
        beforeImageUrl: payload.beforeImageUrl,
        afterImageUrl: payload.afterImageUrl,
        gps: {
          lat: payload.lat === "" ? null : Number(payload.lat),
          lng: payload.lng === "" ? null : Number(payload.lng)
        }
      });
      toast.success("Call updated");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update call");
    } finally {
      setSavingId("");
    }
  };

  const requestApproval = async (id) => {
    const payload = formState[id] || {};
    setApprovalLoadingId(id);
    try {
      await api.patch(`/calls/${id}/request-approval`, {
        requestNote: payload.approvalNote || ""
      });
      toast.success("Approval request sent to customer");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to request approval");
    } finally {
      setApprovalLoadingId("");
    }
  };

  if (loading) return <p className="text-slate-600">Loading calls...</p>;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total Assigned" value={stats.total} />
        <KpiCard label="Completed Calls" value={stats.completed} tone="green" />
        <KpiCard label="Pending Calls" value={stats.pending} tone="yellow" />
      </section>

      <h2 className="font-heading text-2xl font-semibold">Engineer Dashboard</h2>
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {calls.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900">
          No calls assigned.
        </p>
      )}
      {calls.map((call) => (
        <article
          key={call._id}
          className={`rounded-2xl border bg-white p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900 ${
            call.status === "awaiting_customer_approval" ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">
              {call.camera?.cameraId} - {call.camera?.name}
            </h3>
            <StatusBadge status={call.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{call.issueDescription}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Status
              <select
                value={formState[call._id]?.status || "assigned"}
                onChange={(e) => updateField(call._id, "status", e.target.value)}
                disabled={call.status === "awaiting_customer_approval"}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Feedback
              <input
                value={formState[call._id]?.feedback || ""}
                onChange={(e) => updateField(call._id, "feedback", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Approval Request Note
              <textarea
                value={formState[call._id]?.approvalNote || ""}
                onChange={(e) => updateField(call._id, "approvalNote", e.target.value)}
                placeholder="Why customer approval is needed (parts/cost/replacement)"
                className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
              />
            </label>
            <label className="text-sm font-semibold">
              Before Photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && uploadAndSet(call._id, "before", e.target.files[0])
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
              />
            </label>
            <label className="text-sm font-semibold">
              After Photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && uploadAndSet(call._id, "after", e.target.files[0])
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
              />
            </label>
            <label className="text-sm font-semibold">
              GPS Lat
              <input
                value={formState[call._id]?.lat ?? ""}
                onChange={(e) => updateField(call._id, "lat", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
              />
            </label>
            <label className="text-sm font-semibold">
              GPS Lng
              <input
                value={formState[call._id]?.lng ?? ""}
                onChange={(e) => updateField(call._id, "lng", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:bg-slate-800"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {formState[call._id]?.beforeImageUrl && (
              <img
                src={formState[call._id].beforeImageUrl}
                alt="Before"
                className="h-32 w-full rounded-lg object-cover"
              />
            )}
            {formState[call._id]?.afterImageUrl && (
              <img
                src={formState[call._id].afterImageUrl}
                alt="After"
                className="h-32 w-full rounded-lg object-cover"
              />
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={
                savingId === call._id || uploadingId === call._id || call.status === "awaiting_customer_approval"
              }
              onClick={() => save(call._id)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {savingId === call._id ? "Saving..." : uploadingId === call._id ? "Uploading..." : "Update Call"}
            </button>
            <button
              disabled={
                approvalLoadingId === call._id ||
                savingId === call._id ||
                call.status === "awaiting_customer_approval" ||
                call.status === "completed"
              }
              onClick={() => requestApproval(call._id)}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {approvalLoadingId === call._id ? "Requesting..." : "Request Customer Approval"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
};

export default EngineerDashboard;
