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

export async function getElegibleCuponsForAnimation(): Promise<{
  cupom_ids: number[];
}> {
  const supabase = await createClient();

  // Busca até 200 IDs aleatórios de cupons não sorteados para a animação
  // Útil para o efeito visual de "embaralhar"
  const { data } = await supabase
    .from("cupons")
    .select("id")
    .is("sorteado_em", null)
    .limit(200);

  const ids = data?.map(c => c.id) || [];
  return { cupom_ids: ids };
}

/**
 * Realiza o sorteio de cupons utilizando a lógica real do sistema.
 * Critérios:
 * 1. O cupom não pode ter sido sorteado anteriormente (sorteado_em IS NULL).
 * 2. A nota fiscal associada deve ser válida (notas_fiscais.valida = true).
 * 
 * O resultado é salvo na tabela 'sorteios' e o cupom é marcado com timestamp em 'sorteado_em'.
 */
export async function realizarSorteioAction(
  quantidade: number
): Promise<SorteioResult> {
  const supabase = await createClient();

  // 1. Verificar autenticação do Admin
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, message: "Usuário não autenticado." };
  }

  if (quantidade <= 0) {
    return { success: false, message: "A quantidade deve ser maior que zero." };
  }

  const cuponsSorteados: NonNullable<SorteioResult['cuponsSorteados']> = [];

  try {
    for (let i = 0; i < quantidade; i++) {
      // 2. Contar número de cupons elegíveis
      const { count, error: countError } = await supabase
        .from("cupons")
        .select("id, notas_fiscais!inner(valida)", { count: "exact", head: true })
        .is("sorteado_em", null)
        .eq("notas_fiscais.valida", true);

      if (countError) {
        console.error("Erro ao contar cupons:", countError);
        return { success: false, message: "Erro ao acessar banco de dados: " + countError.message };
      }

      if (count === null || count === 0) {
        return { success: false, message: "Não há cupons aptos para sorteio no momento." };
      }

      // 3. Selecionar um índice aleatório
      const randomIndex = Math.floor(Math.random() * count);

      // 4. Buscar o cupom nesse índice (aleatório)
      const { data: cupom, error: fetchError } = await supabase
        .from("cupons")
        .select(`
          id,
          num_nota,
          notas_fiscais!inner ( valida ),
          clientes ( razao_social, nome_fantasia )
        `)
        .is("sorteado_em", null)
        .eq("notas_fiscais.valida", true)
        .range(randomIndex, randomIndex)
        .maybeSingle();

      if (fetchError) {
        console.error("Erro ao buscar cupom sorteado:", fetchError);
        return { success: false, message: "Erro ao selecionar o cupom vencedor." };
      }

      if (!cupom) {
        return { success: false, message: "Erro de concorrência: cupom selecionado não disponível." };
      }

      // 5. Registrar o sorteio na tabela 'sorteios'
      const { error: insertError } = await supabase
        .from("sorteios")
        .insert({
          cupom_id: cupom.id,
          admin_user_id: user.id
        });

      if (insertError) {
        console.error("Erro ao inserir sorteio:", insertError);
        return { success: false, message: "Erro ao registrar o vencedor no banco de dados." };
      }

      // 6. Atualizar o cupom como sorteado
      await supabase
        .from("cupons")
        .update({ sorteado_em: new Date().toISOString() })
        .eq("id", cupom.id);

      // Tratamento dos dados do cliente
      const clienteData = Array.isArray(cupom.clientes) ? cupom.clientes[0] : cupom.clientes;

      cuponsSorteados.push({
        id: cupom.id,
        num_nota: cupom.num_nota,
        razao_social: clienteData?.razao_social || "Razão Social não encontrada",
        nome_cliente: clienteData?.nome_fantasia
      });
    }

    revalidatePath("/admin/sorteio");

    return {
      success: true,
      message: "Sorteio realizado com sucesso!",
      cuponsSorteados
    };

  } catch (err: any) {
    console.error("Erro inesperado no sorteio:", err);
    return { success: false, message: "Ocorreu um erro interno: " + err.message };
  }
}
