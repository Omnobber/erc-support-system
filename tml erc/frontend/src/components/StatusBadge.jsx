const map = {
  active: "bg-brand-100 text-brand-700",
  faulty: "bg-orange-100 text-ember-500",
  maintenance: "bg-yellow-100 text-ambertone-500",
  pending: "bg-slate-200 text-slate-700",
  assigned: "bg-cyan-100 text-cyan-700",
  in_progress: "bg-blue-100 text-blue-700",
  awaiting_customer_approval: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-emerald-100 text-emerald-700",
  completed: "bg-brand-100 text-brand-700",
  rejected: "bg-rose-100 text-rose-700",
  rejected_on_hold: "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
};

const StatusBadge = ({ status }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] || map.pending}`}>
    {status?.replaceAll("_", " ")}
  </span>
);

export default StatusBadge;
