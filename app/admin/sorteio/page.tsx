import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { SorteioForm } from "./SorteioForm"; // Importar o novo componente

// TODO: Implementar a Server Action para realizar o sorteio
// import { realizarSorteioAction } from './actions';

export default async function AdminSorteioPage() {
  const supabase = await createClient();

  // --- Buscar contagem de cupons ELEGÍVEIS ---
  // 1. Obter IDs já sorteados
  const { data: sorteadosData, error: sorteadosError } = await supabase
    .from("sorteios")
    .select("cupom_id");

  let totalCuponsElegiveis: number | null = null;
  let countError: any = sorteadosError; // Inicia com erro de busca de sorteados

  if (!countError) {
    const idsJaSorteados = sorteadosData?.map((s) => s.cupom_id) || [];

    // 2. Contar cupons não sorteados
    const queryCount = supabase
      .from("cupons")
      .select("*", { count: "exact", head: true });

    if (idsJaSorteados.length > 0) {
      queryCount.not("id", "in", `(${idsJaSorteados.join(",")})`);
    }

    const { count, error } = await queryCount;
    totalCuponsElegiveis = count;
    countError = error; // Atualiza o erro com o resultado da contagem
  }

  if (countError) {
    console.error("Erro ao buscar contagem de cupons elegíveis:", countError);
    // A UI já mostrará 'Erro ao carregar' se totalCuponsElegiveis for null
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Realizar Sorteio</h1>

      <div className="p-4 border rounded-lg bg-muted">
        <p className="text-lg">
          Total de Cupons Elegíveis (Não Sorteados):{" "}
          <span className="font-semibold">
            {totalCuponsElegiveis ?? "Erro ao carregar"}
          </span>
        </p>
      </div>

      <SorteioForm totalCuponsElegiveis={totalCuponsElegiveis} />
    </div>
  );
}
