import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Ticket, FileText } from "lucide-react"; // Ícones
import DashboardGraficoFilial from "./DashboardGraficoFilial";
import DailyNotesCouponsChart from "./DailyNotesCouponsChart";
import { eachDayOfInterval, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Buscar contagens essenciais em paralelo
  const [
    { count: totalUsuarios, error: errorUsuarios },
    { count: totalNotas, error: errorNotas },
    { count: totalCupons, error: errorCupons },
  ] = await Promise.all([
    supabase.from("usuarios").select("*", { count: "exact", head: true }),
    supabase.from("notas_fiscais").select("*", { count: "exact", head: true }),
    supabase.from("cupons").select("*", { count: "exact", head: true }),
    // Removidas buscas por clientes, elegiveis, sorteios
  ]);

  // Buscar quantidade de notas por filial (agrupamento manual)
  const { data: notasFiliaisRaw, error: errorNotasPorFilial } = await supabase
    .from("notas_fiscais")
    .select("cod_filial, utilizada_para_cupom");

  // Buscar quantidade de cupons por filial (fazendo join manual)
  const { data: cuponsRaw, error: errorCuponsRaw } = await supabase
    .from("cupons")
    .select("num_nota");

  const { data: notasParaCupons, error: errorNotasParaCupons } = await supabase
    .from("notas_fiscais")
    .select("num_nota, cod_filial");

  let errorCuponsPorFilial = errorCuponsRaw || errorNotasParaCupons;

  let notasPorFilial: {
    cod_filial: number;
    total_notas: number;
    notas_usadas_cupom: number;
    cupons_gerados: number;
  }[] = [];

  if (notasFiliaisRaw) {
    const agrupadoNotas = notasFiliaisRaw.reduce(
      (
        acc: Record<number, { total: number; usadas: number }>,
        curr: { cod_filial: number; utilizada_para_cupom: boolean }
      ) => {
        if (curr.cod_filial) {
          if (!acc[curr.cod_filial]) {
            acc[curr.cod_filial] = { total: 0, usadas: 0 };
          }
          acc[curr.cod_filial].total += 1;
          if (curr.utilizada_para_cupom) {
            acc[curr.cod_filial].usadas += 1;
          }
        }
        return acc;
      },
      {}
    );

    // Criar mapa de num_nota para cod_filial
    const notaFilialMap = (notasParaCupons || []).reduce(
      (
        acc: Record<string, number>,
        curr: { num_nota: string; cod_filial: number }
      ) => {
        acc[curr.num_nota] = curr.cod_filial;
        return acc;
      },
      {}
    );

    // Agrupar cupons por filial usando o mapa
    const agrupadoCupons = (cuponsRaw || []).reduce(
      (acc: Record<number, number>, curr: { num_nota: string }) => {
        if (curr.num_nota && notaFilialMap[curr.num_nota]) {
          const cod_filial = notaFilialMap[curr.num_nota];
          acc[cod_filial] = (acc[cod_filial] || 0) + 1;
        }
        return acc;
      },
      {}
    );

    // Combinar dados de notas e cupons
    const todasFiliais = new Set([
      ...Object.keys(agrupadoNotas).map(Number),
      ...Object.keys(agrupadoCupons).map(Number),
    ]);

    notasPorFilial = Array.from(todasFiliais).map((cod_filial) => ({
      cod_filial,
      total_notas: agrupadoNotas[cod_filial]?.total || 0,
      notas_usadas_cupom: agrupadoNotas[cod_filial]?.usadas || 0,
      cupons_gerados: agrupadoCupons[cod_filial] || 0,
    }));
  }

  const startDate = subDays(new Date(), 29);
  const startDateISO = startDate.toISOString();

  const [
    { data: notasDiariasRaw, error: errorNotasDiarias },
    { data: cuponsDiariosRaw, error: errorCuponsDiarias },
  ] = await Promise.all([
    supabase
      .from("notas_fiscais")
      .select("created_at, utilizada_para_cupom")
      .gte("created_at", startDateISO),
    supabase
      .from("cupons")
      .select("created_at")
      .gte("created_at", startDateISO),
  ]);

  const notasDiarias = (notasDiariasRaw ?? []) as {
    created_at: string | null;
    utilizada_para_cupom: boolean | null;
  }[];
  const cuponsDiarios = (cuponsDiariosRaw ?? []) as {
    created_at: string | null;
  }[];

  const notasPorDia = new Map<string, number>();
  const notasConvertidasPorDia = new Map<string, number>();
  const cuponsPorDia = new Map<string, number>();

  notasDiarias.forEach((nota) => {
    if (!nota.created_at) return;
    const key = format(new Date(nota.created_at), "yyyy-MM-dd");
    notasPorDia.set(key, (notasPorDia.get(key) || 0) + 1);
    if (nota.utilizada_para_cupom) {
      notasConvertidasPorDia.set(
        key,
        (notasConvertidasPorDia.get(key) || 0) + 1
      );
    }
  });

  cuponsDiarios.forEach((cupom) => {
    if (!cupom.created_at) return;
    const key = format(new Date(cupom.created_at), "yyyy-MM-dd");
    cuponsPorDia.set(key, (cuponsPorDia.get(key) || 0) + 1);
  });

  const intervaloDias = eachDayOfInterval({ start: startDate, end: new Date() });
  const dailySeries = intervaloDias.map((dia) => {
    const key = format(dia, "yyyy-MM-dd");
    const notas = notasPorDia.get(key) || 0;
    const notasConvertidas = notasConvertidasPorDia.get(key) || 0;
    const cupons = cuponsPorDia.get(key) || notasConvertidas;
    const conversionRate = notas > 0 ? (cupons / notas) * 100 : 0;
    return {
      dateISO: key,
      dateLabel: format(dia, "dd/MM", { locale: ptBR }),
      notas,
      cupons,
      notasConvertidas,
      conversionRate,
    };
  });

  const errors = [
    errorUsuarios,
    errorNotas,
    errorCupons,
    errorNotasPorFilial,
    errorCuponsPorFilial,
    errorNotasDiarias,
    errorCuponsDiarias,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das principais métricas da campanha.
        </p>
      </div>
      <Separator />

      {errors.length > 0 && (
        <Alert variant="destructive">
          <Users className="h-4 w-4" /> {/* Ícone genérico para erro */}
          <AlertTitle>Erro ao Carregar Métricas</AlertTitle>
          <AlertDescription>
            Não foi possível carregar algumas métricas:{" "}
            {errors.map((e) => e?.message).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Grid ajustado para 3 colunas em telas médias */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card Usuários */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorUsuarios ? "-" : (totalUsuarios ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Usuários cadastrados na plataforma
            </p>
          </CardContent>
        </Card>

        {/* Card Notas Fiscais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Notas Fiscais
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorNotas ? "-" : (totalNotas ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de NFs recebidas
            </p>
          </CardContent>
        </Card>

        {/* Card Cupons */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Cupons Gerados
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorCupons ? "-" : (totalCupons ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de cupons emitidos
            </p>
          </CardContent>
        </Card>

        {/* Cards removidos: Clientes PJ, Cupons Elegíveis, Sorteios Realizados */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução diária de notas e cupons</CardTitle>
          <CardDescription>
            Comparativo dos últimos 30 dias entre notas emitidas e cupons
            gerados. Use este panorama para acompanhar o ritmo da campanha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailySeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Não há dados registrados no período analisado.
            </p>
          ) : (
            <DailyNotesCouponsChart data={dailySeries} />
          )}
        </CardContent>
      </Card>

      {/* Gráfico de barras por filial */}
      {errorNotasPorFilial ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar gráfico</AlertTitle>
          <AlertDescription>{errorNotasPorFilial.message}</AlertDescription>
        </Alert>
      ) : (
        <DashboardGraficoFilial data={notasPorFilial || []} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Próximos gráficos recomendados</CardTitle>
          <CardDescription>
            Ideias para expandir os insights da dashboard conforme novos dados
            forem coletados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Conversão por canal de envio (SMS x WhatsApp) para entender onde
              os participantes têm mais aderência.
            </li>
            <li>
              Funil por filial, comparando notas recebidas, validadas e cupons
              sorteados para priorizar treinamentos.
            </li>
            <li>
              Horário do dia com maior volume de submissões para alinhar
              campanhas de mídia e suporte.
            </li>
            <li>
              Distribuição de participantes por faixa de valor da nota fiscal,
              identificando oportunidades de ticket médio.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
