"use client";
import BarChartNotasPorFilial from "./BarChartNotasPorFilial";

export default function DashboardGraficoFilial({
  data,
}: {
  data: {
    cod_filial: number;
    total_notas: number;
    notas_usadas_cupom: number;
    cupons_gerados: number;
  }[];
}) {
  return (
    <div className="mt-8">
      <BarChartNotasPorFilial data={data} />
    </div>
  );
}
