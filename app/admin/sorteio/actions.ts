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
  }[];
}

// Função auxiliar para embaralhar um array (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;
  // Enquanto ainda houver elementos para embaralhar.
  while (currentIndex !== 0) {
    // Escolha um elemento restante.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // E troque-o pelo elemento atual.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

/**
 * Busca uma amostra de IDs ou números de cupons elegíveis para a animação.
 * Retorna apenas os IDs para não sobrecarregar.
 */
export async function getElegibleCuponsForAnimation(): Promise<{
  cupom_ids: number[];
}> {
  const supabase = await createClient();

  // 1. Obter IDs já sorteados da tabela 'sorteios'
  const { data: sorteadosData, error: sorteadosError } = await supabase
    .from("sorteios")
    .select("cupom_id");

  if (sorteadosError) {
    console.error("Erro ao buscar cupons já sorteados:", sorteadosError);
    // Retorna vazio em caso de erro, a animação pode não ocorrer ou ser mais simples
    return { cupom_ids: [] };
  }

  const idsJaSorteados = sorteadosData?.map((s) => s.cupom_id) || [];

  // 2. Buscar IDs de cupons elegíveis (não sorteados)
  // Limitamos a um número razoável para a animação (ex: 200)
  const query = supabase
    .from("cupons")
    .select("id")
    .limit(200) // Limite para a animação
    .order("created_at", { ascending: true }); // Alguma ordem para consistência

  if (idsJaSorteados.length > 0) {
    query.not("id", "in", `(${idsJaSorteados.join(",")})`);
  }

  const { data: elegiveis, error: elegiveisError } = await query;

  if (elegiveisError) {
    console.error(
      "Erro ao buscar cupons elegíveis para animação:",
      elegiveisError
    );
    return { cupom_ids: [] };
  }

  return { cupom_ids: elegiveis?.map((c) => c.id) || [] };
}

/**
 * Realiza o sorteio de um número específico de cupons.
 * Lógica implementada diretamente em TypeScript.
 */
export async function realizarSorteioAction(
  quantidade: number
): Promise<SorteioResult> {
  if (quantidade <= 0) {
    return { success: false, message: "A quantidade deve ser maior que zero." };
  }

  const supabase = await createClient();

  try {
    // --- Obter Admin Logado (Necessário para registrar quem fez o sorteio) ---
    const {
      data: { user: adminUser },
      error: adminUserError,
    } = await supabase.auth.getUser();

    if (adminUserError || !adminUser) {
      console.error("Erro ao obter admin logado:", adminUserError);
      // Você pode querer verificar se adminUser.role === 'admin' aqui também
      return {
        success: false,
        message: "Erro: Administrador não autenticado ou não encontrado.",
      };
    }
    // ---------------------------------------------------------------------

    // 1. Obter IDs já sorteados
    const { data: sorteadosData, error: sorteadosError } = await supabase
      .from("sorteios")
      .select("cupom_id");

    if (sorteadosError) {
      console.error("Erro ao buscar cupons já sorteados:", sorteadosError);
      return {
        success: false,
        message: "Erro ao verificar cupons já sorteados.",
      };
    }
    const idsJaSorteados = sorteadosData?.map((s) => s.cupom_id) || [];

    // 2. Buscar IDs de cupons elegíveis (não sorteados)
    const queryElegiveis = supabase.from("cupons").select("id");
    if (idsJaSorteados.length > 0) {
      queryElegiveis.not("id", "in", `(${idsJaSorteados.join(",")})`);
    }
    const { data: cuponsElegiveis, error: elegiveisError } =
      await queryElegiveis;

    if (elegiveisError) {
      console.error("Erro ao buscar cupons elegíveis:", elegiveisError);
      return { success: false, message: "Erro ao buscar cupons elegíveis." };
    }

    if (!cuponsElegiveis || cuponsElegiveis.length === 0) {
      return { success: false, message: "Nenhum cupom elegível encontrado." };
    }

    const idsElegiveis = cuponsElegiveis.map((c) => c.id);
    const totalElegiveis = idsElegiveis.length;

    // 3. Verificar se há cupons suficientes
    if (quantidade > totalElegiveis) {
      return {
        success: false,
        message: `Quantidade solicitada (${quantidade}) é maior que o número de cupons elegíveis (${totalElegiveis}).`,
      };
    }

    // 4. Embaralhar e selecionar os ganhadores
    const idsGanhadores = shuffleArray(idsElegiveis).slice(0, quantidade);

    // 5. Registrar os ganhadores na tabela 'sorteios'
    const agora = new Date().toISOString();
    const registrosSorteio = idsGanhadores.map((cupomId) => ({
      cupom_id: cupomId,
      data_sorteio: agora,
      admin_user_id: adminUser.id,
    }));

    const { error: insertError } = await supabase
      .from("sorteios")
      .insert(registrosSorteio);

    if (insertError) {
      console.error("Erro ao registrar sorteio:", insertError);
      // Aqui está o risco: selecionamos mas não conseguimos registrar.
      return {
        success: false,
        message: "Erro ao registrar os cupons sorteados no banco de dados.",
      };
    }

    // 6. Buscar detalhes dos ganhadores (incluindo nome do cliente)
    // ETAPA 6.1: Buscar cupons sorteados com seus CNPJs
    const { data: cuponsComCnpj, error: detalhesError1 } = await supabase
      .from("cupons")
      .select(
        `
        id,
        num_nota,
        cnpj
      `
      )
      .in("id", idsGanhadores);

    if (detalhesError1 || !cuponsComCnpj) {
      console.error(
        "Erro ao buscar CNPJs dos cupons ganhadores:",
        detalhesError1
      );
      return {
        success: false,
        message:
          "Sorteio registrado, mas houve erro ao buscar detalhes iniciais dos ganhadores.",
      };
    }

    // ETAPA 6.2: Buscar nomes dos usuários baseados nos CNPJs
    // Pega CNPJs únicos (garantindo compatibilidade)
    const cnpjsGanhadores = Array.from(
      new Set(cuponsComCnpj.map((c) => c.cnpj))
    );
    let cnpjNomeMap: Map<string, string | null> = new Map();

    if (cnpjsGanhadores.length > 0) {
      const { data: usuariosData, error: detalhesError2 } = await supabase
        .from("usuarios")
        .select("cnpj, nome")
        .in("cnpj", cnpjsGanhadores);

      if (detalhesError2) {
        console.error(
          "Erro ao buscar nomes dos usuários ganhadores:",
          detalhesError2
        );
        // Continuar mesmo assim, mas nomes ficarão como null
      } else if (usuariosData) {
        // Criar um mapa para busca rápida: CNPJ -> Nome
        usuariosData.forEach((u) => cnpjNomeMap.set(u.cnpj, u.nome || null));
      }
    }

    // ETAPA 6.3: Combinar os resultados
    const cuponsSorteadosFormatados = cuponsComCnpj.map((cupom) => ({
      id: cupom.id,
      num_nota: cupom.num_nota,
      nome_cliente: cnpjNomeMap.get(cupom.cnpj) || null, // Busca o nome no mapa usando o CNPJ
    }));

    // Revalidar o path para que a contagem na página seja atualizada
    revalidatePath("/admin/sorteio");
    // Poderia revalidar a página de histórico também, se existir
    // revalidatePath("/admin/historico");

    return {
      success: true,
      message: `${cuponsSorteadosFormatados.length} cupom(ns) sorteado(s) com sucesso!`,
      cuponsSorteados: cuponsSorteadosFormatados,
    };
  } catch (err: any) {
    console.error("Erro inesperado ao realizar sorteio:", err);
    return {
      success: false,
      message: err.message || "Ocorreu um erro inesperado no servidor.",
    };
  }
}
