"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DailyNotesCouponsChartProps {
  data: {
    dateISO: string;
    dateLabel: string;
    notas: number;
    cupons: number;
    notasConvertidas: number;
    conversionRate: number;
  }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) {
    return null;
  }

  const notas = payload.find((item: any) => item.dataKey === "notas")?.value || 0;
  const cupons = payload.find((item: any) => item.dataKey === "cupons")?.value || 0;
  const conversion = notas > 0 ? (cupons / notas) * 100 : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
      <p className="font-medium text-slate-900">{label}</p>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs uppercase tracking-wide text-orange-600">
            Notas emitidas
          </span>
          <span className="font-semibold text-slate-900">{notas}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs uppercase tracking-wide text-blue-600">
            Cupons gerados
          </span>
          <span className="font-semibold text-slate-900">{cupons}</span>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600">
        Taxa de conversão: <span className="font-semibold">{conversion.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default function DailyNotesCouponsChart({
  data,
}: DailyNotesCouponsChartProps) {
  const hasData = data.some((item) => item.notas > 0 || item.cupons > 0);

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground">
        Ainda não há volume suficiente para gerar o gráfico.
      </p>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorNotas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCupons" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Legend
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(value: string) => (
              <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
                {value}
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="notas"
            name="Notas emitidas"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#colorNotas)"
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="cupons"
            name="Cupons gerados"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#colorCupons)"
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
