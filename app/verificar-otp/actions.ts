"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// Definição do estado que a action pode retornar
interface VerifyOtpState {
  message?: string | null;
  phone?: string;
}

export async function verifyOtpAction(
  prevState: VerifyOtpState,
  formData: FormData
): Promise<VerifyOtpState> {
  const supabase = await createClient();

  const otp = formData.get("otp") as string;
  const phone = prevState?.phone || (formData.get("phone") as string);

  if (!phone) {
    return { message: "Número de telefone não fornecido." };
  }

  if (!otp || otp.length !== 6) {
    return { message: "Código OTP inválido.", phone: phone };
  }

  const { data: verifyData, error: verifyError } =
    await supabase.auth.verifyOtp({
      phone: phone,
      token: otp,
      type: "whatsapp",
    });

  if (verifyError) {
    console.error("Erro ao verificar OTP:", verifyError);
    if (
      verifyError.message.toLowerCase().includes("invalid") ||
      verifyError.message.toLowerCase().includes("expired")
    ) {
      return {
        message: "Código inválido ou expirado. Tente novamente.",
        phone: phone,
      };
    }
    return {
      message: "Falha ao verificar o código. Tente novamente.",
      phone: phone,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error(
      "Usuário não encontrado após verificação de OTP bem-sucedida."
    );
    return { message: "Erro ao obter informações do usuário.", phone: phone };
  }

  const { data: existingUser, error: userError } = await supabase
    .from("usuarios")
    .select("id")
    .eq("id", user.id)
    .maybeSingle(); // Usar maybeSingle aqui

  if (userError) {
    // Não tratar PGRST116 como erro aqui, apenas logar erros reais
    console.error("Erro ao buscar usuário existente pós-OTP:", userError);
    return { message: "Erro ao verificar cadastro existente.", phone: phone };
  }

  if (existingUser) {
    console.log(
      `[Verify OTP Action] Usuário ${user.id} encontrado na tabela 'usuarios'. Login direto.`
    );
    return { message: "Login bem-sucedido." }; // Página redireciona
  } else {
    console.log(
      `[Verify OTP Action] Usuário ${user.id} NÃO encontrado na tabela 'usuarios'. Redirecionando para /completar-cadastro.`
    );
    redirect(`/completar-cadastro?phone=${encodeURIComponent(phone)}`);
  }
}
