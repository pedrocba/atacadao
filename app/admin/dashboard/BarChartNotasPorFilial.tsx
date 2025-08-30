"use client";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  CartesianGrid,
  Legend,
} from "recharts";

interface BarChartNotasPorFilialProps {
  data: {
    cod_filial: number;
    total_notas: number;
    notas_usadas_cupom: number;
    cupons_gerados: number;
  }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const formatNumber = (num: number) => {
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}k`;
      }
      return num.toString();
    };

    const totalNotas =
      payload.find((p: any) => p.dataKey === "total_notas")?.value || 0;
    const notasUsadas =
      payload.find((p: any) => p.dataKey === "notas_usadas_cupom")?.value || 0;
    const cuponsGerados =
      payload.find((p: any) => p.dataKey === "cupons_gerados")?.value || 0;

    const taxaUso =
      totalNotas > 0 ? Math.round((notasUsadas / totalNotas) * 100) : 0;
    const taxaConversao =
      notasUsadas > 0 ? Math.round((cuponsGerados / notasUsadas) * 100) : 0;

    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 text-sm min-w-[200px]">
        <div className="font-medium text-gray-900 mb-3 text-center border-b pb-2">
          {label}
        </div>

        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-700 text-xs">{entry.name}:</span>
              </div>
              <span className="font-medium text-gray-900">
                {formatNumber(entry.value)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Taxa de uso:</span>
            <span className="font-medium">{taxaUso}%</span>
          </div>
          {cuponsGerados > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Taxa conversão:</span>
              <span className="font-medium">{taxaConversao}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex justify-center gap-6 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              entry.dataKey === "total_notas"
                ? "bg-red-600"
                : entry.dataKey === "notas_usadas_cupom"
                  ? "bg-blue-800"
                  : "bg-green-600"
            }`}
          />
          <span className="text-sm text-gray-600 font-medium">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function BarChartNotasPorFilial({
  data,
}: BarChartNotasPorFilialProps) {
  // Garantir que os valores são números e formatar filial
  const chartData = (data || []).map((item) => ({
    cod_filial: `Filial ${String(item.cod_filial || 0).padStart(2, "0")}`,
    cod_filial_original: item.cod_filial || 0,
    total_notas:
      typeof item.total_notas === "string"
        ? parseInt(item.total_notas)
        : item.total_notas || 0,
    notas_usadas_cupom:
      typeof item.notas_usadas_cupom === "string"
        ? parseInt(item.notas_usadas_cupom)
        : item.notas_usadas_cupom || 0,
    cupons_gerados:
      typeof item.cupons_gerados === "string"
        ? parseInt(item.cupons_gerados)
        : item.cupons_gerados || 0,
  }));

  return (
    <div className="w-full bg-gradient-to-br from-red-50 to-blue-50 rounded-xl p-6 shadow-sm border border-red-100">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-red-600 to-blue-800 bg-clip-text text-transparent">
          Análise de Notas Fiscais por Filial
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Comparativo entre total de notas e notas utilizadas para cupom
        </p>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart
          data={chartData}
          barCategoryGap="25%"
          barGap={3}
          margin={{ top: 30, right: 30, left: 60, bottom: 80 }}
        >
          <defs>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="cupomGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#1e40af" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient
              id="cuponsGeradosGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#059669" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />

          <XAxis
            dataKey="cod_filial"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }}
            label={{
              value: "Código da Filial",
              position: "insideBottom",
              offset: -5,
              style: {
                textAnchor: "middle",
                fontSize: 14,
                fill: "#475569",
                fontWeight: 600,
              },
            }}
          />

          <YAxis
            yAxisId="left"
            orientation="left"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#dc2626", fontWeight: 500 }}
            tickFormatter={(value) => {
              if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}k`;
              }
              return value.toString();
            }}
            label={{
              value: "Total de Notas",
              angle: -90,
              position: "insideLeft",
              style: {
                textAnchor: "middle",
                fontSize: 12,
                fill: "#dc2626",
                fontWeight: 600,
              },
            }}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#1e3a8a", fontWeight: 500 }}
            tickFormatter={(value) => {
              if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}k`;
              }
              return value.toString();
            }}
            label={{
              value: "Cupons e Notas Usadas",
              angle: 90,
              position: "insideRight",
              style: {
                textAnchor: "middle",
                fontSize: 12,
                fill: "#1e3a8a",
                fontWeight: 600,
              },
            }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
          />

          <Legend content={<CustomLegend />} />

          <Bar
            yAxisId="left"
            dataKey="total_notas"
            name="Total de Notas"
            fill="url(#totalGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={35}
          >
            <LabelList
              dataKey="total_notas"
              position="top"
              style={{
                fontWeight: 600,
                fill: "#dc2626",
                fontSize: 10,
              }}
              formatter={(value: number) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                return value.toString();
              }}
            />
          </Bar>

          <Bar
            yAxisId="right"
            dataKey="notas_usadas_cupom"
            name="Usadas para Cupom"
            fill="url(#cupomGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={35}
          >
            <LabelList
              dataKey="notas_usadas_cupom"
              position="top"
              style={{
                fontWeight: 600,
                fill: "#1e3a8a",
                fontSize: 10,
              }}
              formatter={(value: number) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                return value.toString();
              }}
            />
          </Bar>

          <Bar
            yAxisId="right"
            dataKey="cupons_gerados"
            name="Cupons Gerados"
            fill="url(#cuponsGeradosGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={35}
          >
            <LabelList
              dataKey="cupons_gerados"
              position="top"
              style={{
                fontWeight: 600,
                fill: "#059669",
                fontSize: 10,
              }}
              formatter={(value: number) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                return value.toString();
              }}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
