"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface NotasAptasPorFilialChartProps {
  data: {
    cod_filial: number;
    aptas: number;
    aptasValidas: number;
  }[];
}

const formatFilial = (codigo: number) =>
  `Filial ${String(codigo ?? 0).padStart(2, "0")}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const aptas = payload.find((p: any) => p.dataKey === "aptas")?.value ?? 0;
    const aptasValidas =
      payload.find((p: any) => p.dataKey === "aptasValidas")?.value ?? 0;

    return (
      <div className="rounded-md border bg-background px-3 py-2 shadow-sm text-sm">
        <p className="font-semibold">{label}</p>
        <p className="text-muted-foreground">Notas aptas: {aptas}</p>
        <p className="text-muted-foreground">Aptas validadas: {aptasValidas}</p>
      </div>
    );
  }
  return null;
};

export default function NotasAptasPorFilialChart({
  data,
}: NotasAptasPorFilialChartProps) {
  const chartData = (data || []).map((item) => ({
    ...item,
    filialLabel: formatFilial(item.cod_filial),
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 24, left: 0, bottom: 50 }}
        barGap={8}
      >
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis
          dataKey="filialLabel"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#475569" }}
          angle={-40}
          textAnchor="end"
          height={70}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#475569" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Bar
          dataKey="aptas"
          name="Notas aptas"
          fill="hsl(var(--primary))"
          radius={[6, 6, 0, 0]}
        />
        <Bar
          dataKey="aptasValidas"
          name="Aptas validadas"
          fill="hsl(var(--secondary))"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
