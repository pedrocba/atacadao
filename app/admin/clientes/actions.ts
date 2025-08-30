"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

// Schema de validação para os dados do formulário
const UpdateClienteSchema = z.object({
  cnpj: z.string().length(14, "CNPJ inválido."), // Assumindo CNPJ sem formatação
  razao_social: z.string().min(3, "Razão Social é obrigatória."),
  nome_fantasia: z.string().optional(), // Nome fantasia é opcional
});

export type ClienteFormState = {
  message: string | null;
  errors?: {
    razao_social?: string[];
    nome_fantasia?: string[];
    general?: string[];
  };
  success: boolean;
};

export async function updateClienteAction(
  prevState: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const supabase = await createClient();

  // 1. Validar dados do formulário
  const validatedFields = UpdateClienteSchema.safeParse({
    cnpj: formData.get("cnpj"),
    razao_social: formData.get("razao_social"),
    nome_fantasia: formData.get("nome_fantasia"),
  });

  if (!validatedFields.success) {
    return {
      message: "Falha na validação.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { cnpj, razao_social, nome_fantasia } = validatedFields.data;

  // 2. Verificar permissão do usuário (Admin) - crucial!
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "Usuário não autenticado.", success: false };
  }

  const { data: adminData, error: adminError } = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminError || !adminData || adminData.role !== "admin") {
    return {
      message:
        "Permissão negada. Somente administradores podem editar clientes.",
      success: false,
    };
  }

  // 3. Atualizar cliente no banco de dados
  try {
    const { error: updateError } = await supabase
      .from("clientes")
      .update({
        razao_social: razao_social,
        nome_fantasia: nome_fantasia || null, // Salva null se vazio
      })
      .eq("cnpj", cnpj);

    if (updateError) {
      console.error("Erro ao atualizar cliente:", updateError);
      return {
        message: `Falha ao atualizar cliente: ${updateError.message}`,
        success: false,
      };
    }

    // 4. Revalidar o path para atualizar a UI
    revalidatePath("/admin/clientes");
    return { message: "Cliente atualizado com sucesso!", success: true };
  } catch (e) {
    console.error("Erro inesperado:", e);
    return {
      message: "Erro inesperado ao atualizar o cliente.",
      success: false,
    };
  }
}
