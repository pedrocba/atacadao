"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const CHART_COLORS = [
  "#2563eb",
  "#f97316",
  "#9333ea",
  "#16a34a",
  "#ec4899",
  "#0ea5e9",
  "#facc15",
];

export interface ClientShareDatum {
  cnpj: string;
  label: string;
  value: number;
}

interface ClientSharePieChartProps {
  data: ClientShareDatum[];
  emptyMessage?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0];
  const { name, value, payload: datum } = entry;
  const percentage = datum?.percentage ?? 0;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{name}</p>
      <p className="mt-1 text-slate-600">
        {value} registros — {percentage.toFixed(1)}%
      </p>
    </div>
  );
};

export default function ClientSharePieChart({
  data,
  emptyMessage = "Nenhum dado disponível.",
}: ClientSharePieChartProps) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const total = data.reduce((acc, item) => acc + item.value, 0);
  const chartData = data.map((item) => ({
    ...item,
    name: item.label,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`${entry.cnpj}-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                stroke="#ffffff"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span className="text-xs text-slate-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
