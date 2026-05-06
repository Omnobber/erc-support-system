import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PRIMARY_DARK = "#1E293B";
const PIE_CX = "50%";
const PIE_CY = "50%";
const PIE_OUTER_RADIUS = 100;
const CHART_MARGIN = { top: 22, right: 24, bottom: 22, left: 24 };
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

const CameraPieChart = ({ active, faulty, maintenance }) => {
  const data = [
    { name: "Active", value: active, color: "#1a8f5d" },
    { name: "Faulty", value: faulty, color: "#d9471a" },
    { name: "Maintenance", value: maintenance, color: "#d6a300" }
  ];

  return (
    <div className="h-[430px] w-full overflow-visible rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
      <h3 className="font-heading text-lg font-semibold text-[#1E293B]">Camera Status Overview</h3>
      <div className="flex h-[360px] flex-col">
        <div className="mx-auto mt-2 h-[300px] w-full max-w-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={CHART_MARGIN}>
              <Pie
                data={data}
                cx={PIE_CX}
                cy={PIE_CY}
                innerRadius={70}
                outerRadius={PIE_OUTER_RADIUS}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderPieLabel}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderColor: "#CBD5E1", borderRadius: "0.75rem", backgroundColor: "#FFFFFF" }}
                labelStyle={{ color: PRIMARY_DARK, fontWeight: 700 }}
                itemStyle={{ color: PRIMARY_DARK, fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-end pr-4 pb-1">
          <div className="space-y-2 text-sm font-medium text-[#1E293B]">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraPieChart;
