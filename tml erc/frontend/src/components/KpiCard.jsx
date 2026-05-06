const KpiCard = ({ label, value, tone = "slate" }) => {
  const toneMap = {
    slate:
      "text-[#1E293B] bg-white border-slate-200 dark:text-[#1E293B] dark:bg-white dark:border-slate-200",
    green: "text-[#1E293B] bg-brand-50 border-brand-100",
    red: "text-[#1E293B] bg-orange-50 border-orange-100",
    yellow: "text-[#1E293B] bg-yellow-50 border-yellow-100"
  };

  return (
    <article className={`rounded-2xl border p-4 shadow-panel ${toneMap[tone] || toneMap.slate}`}>
      <p className="text-xs font-bold uppercase tracking-widest text-[#1E293B] opacity-80">{label}</p>
      <p className="mt-2 font-heading text-3xl font-semibold text-[#1E293B]">{value}</p>
    </article>
  );
};

export default KpiCard;
