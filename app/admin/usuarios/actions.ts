"use server";

import { createClient as createStandardClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

interface UpdateRoleState {
  message: string | null;
  error?: boolean;
  success?: boolean;
}

export async function updateUserRoleAction(
  userId: string, // UUID do usuário a ser modificado
  newRole: "admin" | "cliente" // O novo role
): Promise<UpdateRoleState> {
  const supabase = await createStandardClient();

  // --- Verificação de Segurança ---
  const {
    data: { user: performingUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !performingUser) {
    return {
      message: "Ação não autorizada: Usuário não autenticado.",
      error: true,
    };
  }
  const { data: performingUserData, error: performingUserError } =
    await supabase
      .from("usuarios")
      .select("role")
      .eq("id", performingUser.id)
      .single();

  if (performingUserError || performingUserData?.role !== "admin") {
    return {
      message: "Ação não autorizada: Você não tem permissão para mudar roles.",
      error: true,
    };
  }
  if (performingUser.id === userId && newRole !== "admin") {
    return {
      message: "Não é possível remover seu próprio privilégio de admin.",
      error: true,
    };
  }
  if (newRole !== "admin" && newRole !== "cliente") {
    return { message: "Role inválido especificado.", error: true };
  }

  // --- Atualizar o Role ---
  try {
    const { error: updateError } = await supabase
      .from("usuarios")
      .update({ role: newRole })
      .eq("id", userId);
    if (updateError) {
      console.error(
        `Erro ao atualizar role para usuário ${userId}:`,
        updateError
      );
      return {
        message: `Erro ao atualizar role: ${updateError.message}`,
        error: true,
      };
    }
    revalidatePath("/admin/usuarios");
    return {
      message: `Role do usuário atualizado para ${newRole} com sucesso!`,
      success: true,
    };
  } catch (err: any) {
    console.error("Erro inesperado ao atualizar role:", err);
    return { message: "Ocorreu um erro inesperado.", error: true };
  }
}

interface DeactivateState {
  message: string | null;
  error?: boolean;
  success?: boolean;
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Supabase URL ou Service Role Key não configuradas nas variáveis de ambiente."
    );
  }

  // Cria um cliente usando a chave de serviço diretamente
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return supabaseAdmin;
}

export async function deactivateUserAction(
  userId: string // UUID do usuário a ser desativado
): Promise<DeactivateState> {
  // 1. Verificar se o usuário que está fazendo a ação é admin (usando cliente normal)
  const supabaseUserClient = await createStandardClient(); // Usar o cliente padrão aqui
  const {
    data: { user: performingUser },
    error: authError,
  } = await supabaseUserClient.auth.getUser();
  if (authError || !performingUser) {
    return {
      message: "Ação não autorizada: Usuário não autenticado.",
      error: true,
    };
  }
  const { data: performingUserData, error: performingUserError } =
    await supabaseUserClient
      .from("usuarios")
      .select("role")
      .eq("id", performingUser.id)
      .single();

  if (performingUserError || performingUserData?.role !== "admin") {
    return {
      message:
        "Ação não autorizada: Você não tem permissão para desativar usuários.",
      error: true,
    };
  }

  // 2. Impedir que um admin se desative
  if (performingUser.id === userId) {
    return {
      message: "Não é possível desativar sua própria conta.",
      error: true,
    };
  }

  // 3. Criar cliente Admin e desativar o usuário no Auth
  try {
    // Usa a função simplificada
    const supabaseAdmin = createSupabaseAdminClient();

    // "Bane" o usuário indefinidamente para desativar login
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { ban_duration: "none" } // 'none' = banido permanentemente
        // Para reativar, seria preciso setar ban_duration = '0s' ou similar
      );

    if (updateError) {
      console.error(
        `Erro ao desativar usuário ${userId} no Auth:`,
        updateError
      );
      if (updateError.message.includes("User not found")) {
        return {
          message: `Erro: Usuário com ID ${userId} não encontrado no sistema de autenticação.`,
          error: true,
        };
      }
      return {
        message: `Erro ao desativar usuário: ${updateError.message}`,
        error: true,
      };
    }

    // Opcional: Marcar na tabela 'usuarios' também (ex: com um campo deactivated_at)
    // const { error: localUpdateError } = await supabaseUserClient
    //      .from('usuarios')
    //      .update({ deactivated_at: new Date().toISOString() })
    //      .eq('id', userId)
    // if (localUpdateError) { /* Logar erro, mas continuar? */ }

    revalidatePath("/admin/usuarios");
    return {
      message: "Usuário desativado com sucesso (login bloqueado).",
      success: true,
    };
  } catch (err: any) {
    console.error("Erro inesperado ao desativar usuário:", err);
    if (err.message.includes("Service Role Key")) {
      return {
        message: "Erro de configuração: Service Role Key ausente ou inválida.",
        error: true,
      };
    }
    return {
      message: `Ocorreu um erro inesperado: ${err.message || ""}`,
      error: true,
    };
  }
}
