const ChartCard = ({ title, children, action }) => {
  return (
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white p-6 text-[#1E293B] shadow-panel dark:border-slate-200 dark:bg-white">
      <div className="mb-4 flex min-h-[42px] items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold leading-tight text-[#1E293B]">{title}</h3>
        {action || null}
      </div>
      {children}
    </section>
  );
};

export default ChartCard;
