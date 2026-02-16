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
    cod_filial?: number | string | null;
    whatsapp?: string | null;
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
  const { data } = await supabase.from("cupons").select("id").limit(100);
  return { cupom_ids: data?.map(c => c.id) || [] };
}

export async function realizarSorteioAction(
  quantidade: number
): Promise<SorteioResult> {
  const supabase = await createClient();

  // 1. Verificar autenticação
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, message: "Acesso negado. Administrador não autenticado." };
  }

  try {
    // 2. Buscar notas fiscais validadas (Regra: valida = true)
    const { data: notasValidas, error: nfsError } = await supabase
      .from("notas_fiscais")
      .select("num_nota, cnpj, cod_filial")
      .eq("valida", true);

    if (nfsError) throw nfsError;
    if (!notasValidas || notasValidas.length === 0) {
      return { success: false, message: "Não existem notas fiscais validadas para o sorteio." };
    }

    // Criar um mapa para acesso rápido ao cod_filial via num_nota+cnpj
    const mapaNotas = new Map();
    notasValidas.forEach(n => {
      mapaNotas.set(`${n.num_nota}_${n.cnpj}`, n.cod_filial);
    });

    const setNotasValidas = new Set(notasValidas.map(n => n.num_nota));

    // 3. Buscar cupons que ainda não foram sorteados
    const { data: cuponsDisponiveis, error: cuponsError } = await supabase
      .from("cupons")
      .select("id, num_nota, cnpj")
      .is("sorteado_em", null);

    if (cuponsError) throw cuponsError;

    // 4. Cruzar dados em memória
    const elegiveis = cuponsDisponiveis.filter(cupom => setNotasValidas.has(cupom.num_nota));

    if (elegiveis.length < quantidade) {
      return {
        success: false,
        message: `Saldo insuficiente de cupons aptos. Disponíveis: ${elegiveis.length}`
      };
    }

    // 5. Embaralhamento Fisher-Yates
    const idsEmbaralhados = shuffleArray([...elegiveis]);
    const selecionados = idsEmbaralhados.slice(0, quantidade);

    const cuponsSorteadosResult: NonNullable<SorteioResult['cuponsSorteados']> = [];

    // 6. Persistir Sorteio e buscar dados detalhados
    for (const vencedor of selecionados) {
      // Registrar na tabela sorteios
      const { error: insertError } = await supabase
        .from("sorteios")
        .insert({
          cupom_id: vencedor.id,
          admin_user_id: user.id,
          data_sorteio: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Marcar cupom como sorteado
      await supabase
        .from("cupons")
        .update({ sorteado_em: new Date().toISOString() })
        .eq("id", vencedor.id);

      // Buscar Razão Social do Cliente
      const { data: cliente } = await supabase
        .from("clientes")
        .select("razao_social, nome_fantasia")
        .eq("cnpj", vencedor.cnpj)
        .maybeSingle();

      // Buscar WhatsApp do usuário vinculado ao CNPJ
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("whatsapp")
        .eq("cnpj", vencedor.cnpj)
        .limit(1)
        .maybeSingle();

      // Obter cod_filial do mapa ou do banco
      const cod_filial = mapaNotas.get(`${vencedor.num_nota}_${vencedor.cnpj}`);

      cuponsSorteadosResult.push({
        id: vencedor.id,
        num_nota: vencedor.num_nota,
        razao_social: cliente?.razao_social,
        nome_cliente: cliente?.nome_fantasia,
        cod_filial: cod_filial,
        whatsapp: usuario?.whatsapp
      });
    }

    revalidatePath("/admin/sorteio");
    return {
      success: true,
      message: "Sorteio processado com sucesso!",
      cuponsSorteados: cuponsSorteadosResult
    };

  } catch (err: any) {
    console.error("Critical Drawing Error:", err);
    return { success: false, message: "Erro durante o sorteio: " + (err.message || "Falha na comunicação com o banco") };
  }
}
