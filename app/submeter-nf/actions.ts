"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Tipos para o estado do formulário
type SubmeterState = {
  message: string | null;
  error?: boolean;
  success?: boolean;
};

export async function submeterNotaFiscalAction(
  prevState: SubmeterState,
  formData: FormData
): Promise<SubmeterState> {
  const supabase = await createClient();

  // 1. Obter usuário logado e seu CNPJ
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: "Usuário não autenticado.", error: true };
  }

  const { data: userData, error: userError } = await supabase
    .from("usuarios")
    .select("cnpj")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.cnpj) {
    console.error("Erro ao buscar CNPJ do usuário:", userError);
    return { message: "Não foi possível identificar seu CNPJ.", error: true };
  }
  const userCnpj = userData.cnpj;

  // 2. Obter número da nota do formulário
  const numNota = formData.get("num_nota") as string;
  if (!numNota || numNota.trim() === "") {
    return { message: "Número da Nota Fiscal é obrigatório.", error: true };
  }
  const numNotaLimpo = numNota.trim();

  try {
    // 3. Buscar a NF completa na tabela `notas_fiscais` para este CNPJ
    const { data: notaFiscal, error: nfError } = await supabase
      .from("notas_fiscais")
      .select("num_nota, valor, utilizada_para_cupom, qtd_fornecedores")
      .eq("num_nota", numNotaLimpo)
      .eq("cnpj", userCnpj)
      .maybeSingle();

    if (nfError) {
      console.error("Erro ao buscar Nota Fiscal:", nfError);
      return {
        message: "Erro ao buscar a Nota Fiscal. Tente novamente.",
        error: true,
      };
    }

    if (!notaFiscal) {
      return {
        message: "Nota Fiscal não encontrada ou não pertence a este CNPJ.",
        error: true,
      };
    }

    // 4. Verificar se a nota fiscal JÁ FOI UTILIZADA para gerar cupom
    if (notaFiscal.utilizada_para_cupom === true) {
      return {
        message: "Esta Nota Fiscal já foi utilizada para gerar cupons.",
        error: true,
      };
    }

    // 5. Calcular quantos cupons gerar
    if (typeof notaFiscal.valor !== "number" || notaFiscal.valor === null) {
      return {
        message: "Valor da nota fiscal inválido.",
        error: true,
      };
    }
    if (
      typeof notaFiscal.qtd_fornecedores !== "number" ||
      notaFiscal.qtd_fornecedores === null
    ) {
      return {
        message: "Quantidade de fornecedores inválida na nota fiscal.",
        error: true,
      };
    }
    let quantidadeCupons = 0;
    const valorBase = Math.floor(notaFiscal.valor / 500);
    if (notaFiscal.qtd_fornecedores < 4) {
      quantidadeCupons = Math.min(valorBase, notaFiscal.qtd_fornecedores);
    } else {
      quantidadeCupons = valorBase;
    }

    if (quantidadeCupons < 1) {
      return {
        message: `Valor da nota (R$ ${notaFiscal.valor.toFixed(2)}) e quantidade de fornecedores insuficientes para gerar cupom.`,
        error: true,
      };
    }

    // 6. Preparar os dados dos novos cupons
    const novosCupons = Array.from({ length: quantidadeCupons }, (_, i) => ({
      num_nota: numNotaLimpo,
      cnpj: userCnpj,
    }));

    // 7. Inserir os novos cupons
    const { error: insertError } = await supabase
      .from("cupons")
      .insert(novosCupons);

    if (insertError) {
      console.error("Erro ao inserir cupons:", insertError);
      // Não precisamos mais tratar o erro 23505 especificamente aqui
      return {
        message: "Erro ao gerar os cupons. Tente novamente.",
        error: true,
      };
    }

    // 8. Marcar a nota fiscal como utilizada
    const { error: updateNotaError } = await supabase
      .from("notas_fiscais")
      .update({ utilizada_para_cupom: true })
      .eq("num_nota", numNotaLimpo)
      .eq("cnpj", userCnpj);

    if (updateNotaError) {
      // Logar o erro, mas talvez não retornar ao usuário, pois os cupons já foram gerados.
      // Considerar uma estratégia de retry ou notificação interna.
      console.error(
        "Erro ao marcar nota fiscal como utilizada:",
        updateNotaError
      );
      // Poderia retornar uma mensagem de sucesso parcial? Ex:
      // return { message: `${quantidadeCupons} cupom(s) gerado(s), mas erro ao atualizar status da nota.`, success: true };
    }

    // Revalidar paths
    revalidatePath("/dashboard");
    revalidatePath("/admin/cupons");
    revalidatePath("/admin/sorteio");

    const plural = quantidadeCupons > 1 ? "s" : "";
    return {
      message: `${quantidadeCupons} cupom${plural} gerado${plural} com sucesso para a nota ${numNotaLimpo}!`, // Mensagem detalhada
      success: true,
    };
  } catch (err) {
    console.error("Erro inesperado ao submeter nota fiscal:", err);
    return { message: "Ocorreu um erro inesperado.", error: true };
  }
}
