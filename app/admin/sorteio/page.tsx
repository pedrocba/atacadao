import { createClient } from "@/utils/supabase/server";
import { RaffleScreen } from "./RaffleScreen";

export default async function AdminSorteioPage() {
  const supabase = await createClient();

  // --- Buscar contagem de cupons ELEGÍVEIS (REAL DATA) ---
  // 1. Obter IDs já sorteados
  const { data: sorteadosData, error: sorteadosError } = await supabase
    .from("sorteios")
    .select("cupom_id");

  let totalCuponsElegiveis: number | null = 500; // Fallback default

  if (!sorteadosError) {
    const idsJaSorteados = sorteadosData?.map((s) => s.cupom_id) || [];

    // 2. Contar cupons não sorteados
    let queryCount = supabase
      .from("cupons")
      .select("*", { count: "exact", head: true });

    if (idsJaSorteados.length > 0) {
      // Nota: Para grandes volumes, 'not.in' pode ser lento. 
      // Idealmente teríamos uma coluna 'sorteado' bool no cupom ou similar.
      // Mas seguindo a lógica existente:
      queryCount = queryCount.not("id", "in", `(${idsJaSorteados.join(",")})`);
    }

    const { count, error } = await queryCount;
    if (!error && count !== null) {
      totalCuponsElegiveis = count;
    }
  }

  return (
    <RaffleScreen totalCuponsElegiveis={totalCuponsElegiveis} />
  );
}
