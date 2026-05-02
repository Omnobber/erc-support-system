import dayjs from "dayjs";
import StatusBadge from "./StatusBadge";

const CameraDetailModal = ({ open, onClose, details }) => {
  if (!open || !details) return null;

  const { camera, details: meta } = details;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-semibold">
              {camera.name} ({camera.cameraId})
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{camera.location}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border px-3 py-1 text-sm">
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Status</p>
            <div className="mt-1">
              <StatusBadge status={camera.status} />
            </div>
          </div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Assigned Engineer</p>
            <p className="mt-1 text-sm font-semibold">{meta.assignedEngineer?.name || "Unassigned"}</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Last Issue</p>
            <p className="mt-1 text-sm font-semibold">{meta.lastIssue || "No issue found"}</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Last Service Date</p>
            <p className="mt-1 text-sm font-semibold">
              {meta.lastServiceDate ? dayjs(meta.lastServiceDate).format("DD MMM YYYY, hh:mm A") : "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-semibold">Call History</h4>
          <div className="mt-2 space-y-2">
            {meta.callHistory.length === 0 && (
              <p className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">No call history.</p>
            )}
            {meta.callHistory.map((call) => (
              <article key={call._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{call.issueDescription}</p>
                  <StatusBadge status={call.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {dayjs(call.createdAt).format("DD MMM YYYY, hh:mm A")} • Engineer:{" "}
                  {call.assignedEngineer?.name || "Unassigned"}
                </p>
                {(call.images?.before || call.images?.after) && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {call.images?.before && (
                      <img
                        src={call.images.before}
                        alt="Before"
                        className="h-32 w-full rounded-lg object-cover"
                      />
                    )}
                    {call.images?.after && (
                      <img src={call.images.after} alt="After" className="h-32 w-full rounded-lg object-cover" />
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraDetailModal;
