"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CuponsPorDiaChartProps {
  data: {
    dia: string;
    quantidade: number;
  }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    try {
      const dataDoDia = parseISO(label);
      const dataFormatada = format(dataDoDia, "dd/MM/yyyy", { locale: ptBR });
      return (
        <div className="bg-background border rounded-md shadow-lg px-3 py-2 text-sm">
          <p className="font-semibold">{`Data: ${dataFormatada}`}</p>
          <p className="text-primary">{`Cupons: ${payload[0].value}`}</p>
        </div>
      );
    } catch (e) {
      return (
        <div className="bg-background border rounded-md shadow-lg px-3 py-2 text-sm">
          <p className="font-semibold">{`Data: ${label}`}</p>
          <p className="text-primary">{`Cupons: ${payload[0].value}`}</p>
        </div>
      );
    }
  }
  return null;
};

export default function CuponsPorDiaChart({ data }: CuponsPorDiaChartProps) {
  const formatXAxis = (tickItem: string) => {
    try {
      const date = parseISO(tickItem);
      return format(date, "dd/MM", { locale: ptBR });
    } catch (e) {
      return tickItem;
    }
  };

  const hasData = data && data.length > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Cupons Gerados por Dia</CardTitle>
        <CardDescription>Evolução diária da geração de cupons.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 0,
                bottom: 25,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
              <XAxis
                dataKey="dia"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "14px", paddingTop: "20px" }} />
              <Line
                type="monotone"
                dataKey="quantidade"
                name="Cupons Gerados"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                activeDot={{ r: 6 }}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhum dado de cupom por dia para exibir.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
