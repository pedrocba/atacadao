"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

interface CadastroState {
  message: string | null;
  error?: boolean;
  validationErrors?: Record<string, string>; // Para erros específicos de campo
}

interface VerifyClientResult {
  success: boolean;
  message?: string;
  clienteData?: {
    // Dados para exibir no card de confirmação
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string; // Incluir CNPJ para usar na próxima etapa
  } | null;
}

interface CompleteCadastroResult {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

// Função simples para formatar/validar WhatsApp (reutilizar/refinar a de login)
function formatPhoneNumber(phone: string): string | null {
  // Remove caracteres não numéricos
  const digits = phone.replace(/\D/g, "");
  // Validação básica de tamanho (considerando DDD + 8 ou 9 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`; // Adiciona código do Brasil
  }
  // Adicionar validação para outros formatos se necessário
  return null; // Inválido
}

// Validação simples de CPF (apenas dígitos e tamanho)
function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11;
}

// Validação simples de CNPJ (apenas dígitos e tamanho)
function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  return digits.length === 14;
}

export async function cadastroAction(
  prevState: CadastroState,
  formData: FormData
): Promise<CadastroState> {
  const supabase = await createClient();

  const cnpj = formData.get("cnpj") as string;
  const nome = formData.get("nome") as string;
  const cpf = formData.get("cpf") as string;
  const whatsapp = formData.get("whatsapp") as string;

  const validationErrors: Record<string, string> = {};

  // --- Validações de Formato e Preenchimento ---
  if (!cnpj || !validateCNPJ(cnpj)) {
    validationErrors.cnpj = "CNPJ inválido.";
  }
  if (!nome || nome.trim() === "") {
    validationErrors.nome = "Nome completo é obrigatório.";
  }
  if (!cpf || !validateCPF(cpf)) {
    validationErrors.cpf = "CPF inválido.";
  }
  const formattedWhatsApp = formatPhoneNumber(whatsapp);
  if (!formattedWhatsApp) {
    validationErrors.whatsapp = "Número de WhatsApp inválido.";
  }

  if (Object.keys(validationErrors).length > 0) {
    return {
      message: "Por favor, corrija os erros no formulário.",
      validationErrors,
      error: true,
    };
  }

  // Limpar dados para usar nas queries
  const cleanCnpj = cnpj.replace(/\D/g, "");
  const cleanCpf = cpf.replace(/\D/g, "");

  try {
    // --- Validações de Negócio ---

    // 1. CNPJ existe em `clientes`?
    const { data: clienteData, error: clienteError } = await supabase
      .from("clientes")
      .select("cnpj")
      .eq("cnpj", cleanCnpj)
      .maybeSingle();

    if (clienteError) throw clienteError; // Re-throw para o catch geral
    if (!clienteData) {
      return {
        message: "CNPJ não encontrado ou não participante da campanha.",
        error: true,
      };
    }

    // 2. CPF já existe em `usuarios`?
    const { data: cpfData, error: cpfError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("cpf", cleanCpf)
      .maybeSingle();

    if (cpfError) throw cpfError;
    if (cpfData) {
      return { message: "CPF já cadastrado.", error: true };
    }

    // 3. WhatsApp já existe em `usuarios`?
    const { data: whatsappData, error: whatsappError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("whatsapp", formattedWhatsApp) // Usa o número formatado
      .maybeSingle();

    if (whatsappError) throw whatsappError;
    if (whatsappData) {
      return { message: "Número de WhatsApp já cadastrado.", error: true };
    }

    // --- Sucesso nas Validações Iniciais ---
    // Prepara os dados para passar para a página de verificação de OTP
    const queryParams = new URLSearchParams({
      phone: formattedWhatsApp!, // Sabemos que é válido aqui
      source: "cadastro",
      nome: nome.trim(),
      cpf: cleanCpf,
      cnpj: cleanCnpj,
    });

    // Redireciona para a verificação de OTP, passando os dados
    // A action de login JÁ envia o OTP, então só precisamos redirecionar.
    // A action `verifyOtpAction` será modificada para lidar com `source=cadastro`
    // e criar o usuário na tabela `usuarios` APÓS a validação do OTP.
    redirect(`/verificar-otp?${queryParams.toString()}`);
  } catch (err: any) {
    console.error("Erro durante o cadastro:", err);
    return {
      message: `Ocorreu um erro: ${err.message || "Tente novamente."}`,
      error: true,
    };
  }
}

/**
 * Verifica se um CNPJ existe na tabela 'clientes' e se já não está vinculado a um usuário.
 */
export async function verificarClienteAction(
  cnpjInput: string // Renomeado para clareza
): Promise<VerifyClientResult> {
  // Limpa o CNPJ logo no início
  const cleanCnpj = cnpjInput.replace(/\\D/g, "");

  if (!cleanCnpj || cleanCnpj.length !== 14) {
    // Validação básica de CNPJ (apenas tamanho dos dígitos)
    return {
      success: false,
      message: "CNPJ inválido. Deve conter 14 dígitos.",
    };
  }

  const supabase = await createClient();

  try {
    // 1. Verifica se CNPJ existe em 'clientes' (usando o CNPJ limpo)
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("razao_social, nome_fantasia")
      .eq("cnpj", cleanCnpj) // <<< CORRIGIDO: Usa cleanCnpj
      .single(); // Espera encontrar no máximo 1

    if (clienteError || !cliente) {
      console.warn(
        `Verificação CNPJ: ${cleanCnpj} não encontrado em clientes.`, // Log com CNPJ limpo
        clienteError
      );
      return {
        success: false,
        message: "CNPJ não encontrado na base de dados de clientes.",
      };
    }

    // 2. Verifica se CNPJ já está em uso em 'usuarios' (usando o CNPJ limpo)
    const { data: usuarioExistente, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("cnpj", cleanCnpj) // <<< CORRIGIDO: Usa cleanCnpj
      .maybeSingle(); // Pode existir ou não

    if (usuarioError) {
      console.error("Erro ao verificar CNPJ em usuários:", usuarioError);
      return {
        success: false,
        message: "Erro ao verificar disponibilidade do CNPJ.",
      };
    }

    if (usuarioExistente) {
      return {
        success: false,
        message: "Este CNPJ já está vinculado a outra conta de usuário.",
      };
    }

    // Tudo certo, retorna os dados do cliente para confirmação
    return {
      success: true,
      clienteData: {
        cnpj: cleanCnpj, // <<< CORRIGIDO: Retorna o CNPJ limpo
        razao_social: cliente.razao_social,
        nome_fantasia: cliente.nome_fantasia,
      },
    };
  } catch (err: any) {
    console.error("Erro inesperado em verificarClienteAction:", err);
    return {
      success: false,
      message: err.message || "Erro inesperado no servidor.",
    };
  }
}

/**
 * Completa o cadastro do usuário autenticado, vinculando-o a um CNPJ validado.
 * Usa a razão social do cliente como nome do usuário.
 * @param prevState Estado anterior
 * @param formData Dados do formulário (apenas cnpj)
 */
export async function completarCadastroAction(
  prevState: CompleteCadastroResult,
  formData: FormData
): Promise<CompleteCadastroResult> {
  const documento = formData.get("cnpj") as string; // Recebe o documento (CPF ou CNPJ)
  const validationErrors: Record<string, string> = {};

  // 1. Validação do formato do documento (11 ou 14 dígitos)
  const cleanDocumento = documento ? documento.replace(/\D/g, "") : "";
  if (
    !cleanDocumento ||
    (cleanDocumento.length !== 11 && cleanDocumento.length !== 14)
  ) {
    console.error(
      "Documento (CPF/CNPJ) inválido recebido em completarCadastroAction:",
      documento
    );
    return {
      success: false,
      message: "Documento inválido fornecido (11 ou 14 dígitos).",
    };
  }
  // Mantemos o nome cleanCnpj por consistência com o resto da action e a tabela usuarios
  const cleanCnpj = cleanDocumento;

  const supabase = await createClient();

  try {
    // 2. Obter o usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(
        "Erro ao obter usuário autenticado em completarCadastroAction:",
        authError
      );
      return {
        success: false,
        message: "Sessão inválida. Faça login novamente.",
        redirectTo: "/login",
      };
    }

    // 3. Buscar dados do cliente (APENAS razão social)
    const { data: clienteData, error: clienteError } = await supabase
      .from("clientes")
      .select("razao_social")
      .eq("cnpj", cleanCnpj) // << Busca usando o documento fornecido (CPF ou CNPJ)
      .single();

    if (clienteError || !clienteData) {
      console.error(
        "Erro ao buscar cliente (razão social) para completar cadastro:",
        clienteError
      );
      return {
        success: false,
        message: "CNPJ não encontrado ou inválido ao finalizar cadastro.",
      };
    }

    // 4. Verificar se CPF ou WhatsApp JÁ existem em OUTRO usuário
    //    (Mantém a verificação de segurança, mesmo sem coletar CPF aqui)
    //    Verifica apenas pelo WhatsApp do usuário atual contra outros CPFs/WhatsApps
    //    Se um dia coletar CPF aqui, a query original seria mais útil.
    const { data: existingUserData, error: existingUserError } = await supabase
      .from("usuarios")
      .select("id, whatsapp") // Seleciona só o necessário para a checagem atual
      .eq("whatsapp", user.phone) // Só podemos checar o whatsapp agora
      .neq("id", user.id)
      .maybeSingle();

    if (existingUserError) {
      console.error("Erro ao verificar WhatsApp existente:", existingUserError);
      return {
        success: false,
        message: "Erro ao verificar dados. Tente novamente.",
      };
    }
    if (existingUserData) {
      // Este caso ainda é improvável, mas mantido como segurança
      console.warn(
        "WhatsApp já cadastrado para outro usuário ao tentar completar cadastro",
        { userId: user.id, phone: user.phone }
      );
      return {
        success: false,
        message: "Este número de WhatsApp já está associado a outra conta.",
        // Talvez redirecionar para login? Ou apenas mostrar erro.
        redirectTo: "/login",
      };
    }

    // 5. Inserir o usuário na tabela `usuarios`
    const { error: insertError } = await supabase.from("usuarios").insert({
      id: user.id,
      nome: clienteData.razao_social,
      cpf: null,
      cnpj: cleanCnpj,
      whatsapp: user.phone,
      role: "cliente",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        console.warn(
          "Tentativa de inserir usuário duplicado (completarCadastroAction):",
          insertError
        );
        // Assume que o usuário já existe, redireciona
        return { success: true, redirectTo: "/dashboard" };
      }
      console.error(
        "Erro ao inserir usuário (completarCadastroAction):",
        insertError
      );
      return {
        success: false,
        message: "Erro ao salvar cadastro. Tente novamente.",
      };
    }

    // 6. Sucesso!
    console.log("Usuário inserido via completarCadastroAction:", user.id);
    revalidatePath("/", "layout");
    return { success: true, redirectTo: "/dashboard" };
  } catch (err: any) {
    console.error("Erro inesperado em completarCadastroAction:", err);
    return { success: false, message: "Erro inesperado no servidor." };
  }
}

/**
 * Tenta encontrar um registro na tabela 'clientes' usando um CPF (11 dígitos)
 * consultando diretamente a coluna 'clientes.cnpj'.
 */
export async function buscarClientePorCPFAction(
  cpf: string // Espera CPF limpo (11 dígitos)
): Promise<VerifyClientResult> {
  if (!cpf || cpf.length !== 11) {
    return { success: false, message: "Formato de CPF inválido." };
  }

  const supabase = await createClient();

  try {
    // 1. Buscar o cliente DIRETAMENTE pelo CPF na coluna 'cnpj'
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("razao_social, nome_fantasia") // Seleciona os dados necessários
      .eq("cnpj", cpf) // <<< CORRIGIDO: Busca CPF na coluna CNPJ
      .maybeSingle(); // Pode não existir cliente com CPF no campo CNPJ

    if (clienteError) {
      console.error(
        "Erro ao buscar cliente por CPF (na coluna cnpj):",
        clienteError
      );
      return {
        success: false,
        message: "Erro ao verificar documento. Tente novamente.",
      };
    }

    if (!cliente) {
      // Não encontrou cliente com este CPF na coluna CNPJ
      return {
        success: false,
        message: "CPF não encontrado na base de dados de clientes.",
      };
    }

    // 2. Cliente encontrado! Verificar se este documento (CPF) já está vinculado a OUTRO usuário.
    //    Isso evita que o mesmo registro de cliente (identificado pelo CPF aqui)
    //    seja vinculado a múltiplas contas de autenticação.
    const { data: usuarioExistente, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("cnpj", cpf) // Verifica se algum usuário já tem este CPF vinculado no campo CNPJ
      .maybeSingle();

    if (usuarioError) {
      console.error(
        "Erro ao verificar CPF vinculado em usuários:",
        usuarioError
      );
      return {
        success: false,
        message: "Erro ao verificar disponibilidade do documento.",
      };
    }

    if (usuarioExistente) {
      // Encontrou um usuário JÁ VINCULADO a este CPF/Documento.
      // Isso impede que um novo usuário se vincule ao mesmo cliente.
      return {
        success: false,
        message:
          "Este documento (CPF) já está vinculado a outra conta de usuário.",
      };
    }

    // 3. Sucesso! O CPF existe em clientes.cnpj e não está vinculado a outro usuário.
    //    Retornar os dados do cliente encontrado, usando o CPF como 'cnpj' para consistência.
    return {
      success: true,
      clienteData: {
        cnpj: cpf, // <<< Retorna o CPF encontrado como 'cnpj'
        razao_social: cliente.razao_social,
        nome_fantasia: cliente.nome_fantasia,
      },
    };
  } catch (err: any) {
    console.error("Erro inesperado em buscarClientePorCPFAction:", err);
    return {
      success: false,
      message: err.message || "Erro inesperado no servidor.",
    };
  }
}
