"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface SorteioResult {
  success: boolean;
  message?: string;
  cuponsSorteados?: {
    id: number;
    num_nota: string;
    nome_cliente?: string | null;
    razao_social?: string | null;
  }[];
}

// Fisher-Yates Shuffle Algorithm
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function getElegibleCuponsForAnimation(): Promise<{
  cupom_ids: number[];
}> {
  const supabase = await createClient();

  // Busca uma amostra de IDs para animação
  const { data } = await supabase
    .from("cupons")
    .select("id")
    .limit(200); // Apenas para efeito visual

  const ids = data?.map(c => c.id) || [];
  return { cupom_ids: ids };
}

export async function realizarSorteioAction(
  quantidade: number
): Promise<SorteioResult> {
  const supabase = await createClient();

  // 1. Verificar autenticação
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, message: "Usuário não autenticado." };
  }

  if (quantidade <= 0) {
    return { success: false, message: "A quantidade deve ser maior que zero." };
  }

  try {
    // 2. Buscar IDs de cupons e o status da nota fiscal vinculada
    // Tentamos fazer o join. Se o relacionamento não estiver explícito no schema cache, 
    // faremos uma busca mais ampla e filtraremos em memória para evitar o erro de 'relationship'.
    let { data: cuponsBrutos, error: cuponsError } = await supabase
      .from("cupons")
      .select(`
        id,
        notas_fiscais (
          valida
        )
      `)
      .is("sorteado_em", null);

    // Se o join falhar por falta de relacionamento, tentamos buscar apenas cupons e resolver depois
    if (cuponsError && cuponsError.message.includes("relationship")) {
      console.warn("Relacionamento não encontrado, tentando busca simples...");
      const { data: simples, error: simplesError } = await supabase
        .from("cupons")
        .select("id, nota_fiscal_id")
        .is("sorteado_em", null);

      if (simplesError) {
        return { success: false, message: "Erro ao acessar cupons: " + simplesError.message };
      }

      // Aqui precisaríamos buscar as notas separadamente, mas vamos tentar 
      // primeiro ajustar o nome da relação na query principal.
    }

    if (cuponsError) {
      console.error("Erro ao buscar cupons:", JSON.stringify(cuponsError, null, 2));
      return { success: false, message: `Erro de Banco de Dados: ${cuponsError.message}` };
    }

    // Filtrar em memória os que têm nota fiscal válida
    const todosCupons = cuponsBrutos?.filter((c: any) => {
      // Verifica se a nota vinculada existe e está validada
      const nota = Array.isArray(c.notas_fiscais) ? c.notas_fiscais[0] : c.notas_fiscais;
      return nota && nota.valida === true;
    }) || [];

    if (!todosCupons || todosCupons.length === 0) {
      return { success: false, message: "Não há cupons válidos cadastrados no sistema." };
    }

    // 3. Buscar IDs já sorteados na tabela 'sorteios'
    const { data: sorteados, error: sorteadosError } = await supabase
      .from("sorteios")
      .select("cupom_id");

    if (sorteadosError) {
      console.error("Erro ao buscar sorteados:", sorteadosError);
      return { success: false, message: "Erro ao verificar histórico de sorteios." };
    }

    const idsJaSorteados = new Set(sorteados?.map(s => s.cupom_id) || []);

    // 4. Filtrar Elegíveis (Exclui os já sorteados)
    const idsElegiveis = todosCupons
      .map(c => c.id)
      .filter(id => !idsJaSorteados.has(id));

    if (idsElegiveis.length < quantidade) {
      return {
        success: false,
        message: `Não há cupons suficientes para sortear. Disponíveis: ${idsElegiveis.length}, Solicitados: ${quantidade}`
      };
    }

    // 5. Embaralhar (Fisher-Yates Shuffle)
    const idsEmbaralhados = shuffleArray([...idsElegiveis]);

    // 6. Selecionar os primeiros N vencedores
    const idsVencedores = idsEmbaralhados.slice(0, quantidade);

    // 7. Persistir e Buscar Detalhes
    const cuponsSorteadosResult: NonNullable<SorteioResult['cuponsSorteados']> = [];

    for (const cupomId of idsVencedores) {
      // Inserir na tabela sorteios
      const { error: insertError } = await supabase
        .from("sorteios")
        .insert({
          cupom_id: cupomId,
          admin_user_id: user.id
        });

      if (insertError) {
        // Se falhar (ex: race condition), loga e continua ou aborta?
        // Vamos abortar este específico mas tentar retornar os que deram certo? 
        // Ou abortar tudo. Aqui vamos logar e tentar continuar se possível, ou lançar erro.
        console.error(`Erro ao salvar sorteio para cupom ${cupomId}:`, insertError);
        throw new Error("Falha ao registrar ganhador no banco de dados.");
      }

      // Marcar timestamp no cupom (opcional, mas bom pra consistência visual)
      await supabase
        .from("cupons")
        .update({ sorteado_em: new Date().toISOString() })
        .eq("id", cupomId);

      // Buscar detalhes completos do vencedor
      const { data: cupomDetalhes, error: detailsError } = await supabase
        .from("cupons")
        .select(`
          id,
          num_nota,
          clientes ( razao_social, nome_fantasia )
        `)
        .eq("id", cupomId)
        .single();

      if (detailsError || !cupomDetalhes) {
        console.error(`Erro ao buscar detalhes do cupom ${cupomId}:`, detailsError);
        continue;
      }

      const clienteData = Array.isArray(cupomDetalhes.clientes) ? cupomDetalhes.clientes[0] : cupomDetalhes.clientes;

      cuponsSorteadosResult.push({
        id: cupomDetalhes.id,
        num_nota: cupomDetalhes.num_nota,
        razao_social: clienteData?.razao_social || "Razão Social não disponível",
        nome_cliente: clienteData?.nome_fantasia || null
      });
    }

    revalidatePath("/admin/sorteio");

    return {
      success: true,
      message: `${cuponsSorteadosResult.length} cupom(ns) sorteado(s) com sucesso!`,
      cuponsSorteados: cuponsSorteadosResult
    };

  } catch (err: any) {
    console.error("Erro crítico no processo de sorteio:", err);
    return { success: false, message: "Erro interno no processo de sorteio: " + err.message };
  }
}
