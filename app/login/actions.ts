"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// Função simples para formatar o número para E.164 (ex: +5511999998888)
// Adapte conforme a necessidade real de validação/formatação
function formatPhoneNumber(phone: string): string {
  // Remove caracteres não numéricos
  const digits = phone.replace(/\D/g, "");
  // Assume código do país 55 (Brasil) se não fornecido
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  // Retorna o número original se não parecer um número brasileiro válido
  // Idealmente, teríamos validação mais robusta aqui
  return phone;
}

export async function loginWithWhatsApp(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const rawPhoneNumber = formData.get("whatsapp") as string;

  if (!rawPhoneNumber) {
    return { message: "Número de WhatsApp é obrigatório." };
  }

  const phoneNumber = formatPhoneNumber(rawPhoneNumber);

  // Tentar enviar OTP via Supabase Auth diretamente
const { error: otpError } = await supabase.auth.signInWithOtp({
  phone: phoneNumber,
  options: {
    shouldCreateUser: true,
    channel: "whatsapp", // ALTERADO DE 'sms' PARA 'whatsapp'
  },
});
// ...
  if (otpError) {
    console.error("Erro ao enviar OTP inicial:", otpError);

    // Tratar erro de rate limit especificamente
    if (otpError.message.includes("rate limit")) {
      return { message: "Muitas tentativas. Tente novamente mais tarde." };
    }

    // Para QUALQUER outro erro (incluindo "User not found"),
    // continuamos para a tela de verificação de OTP.
    // A lógica em verifyOtpAction tratará o caso de usuário não existente
    // redirecionando para /completar-cadastro.
    console.log(
      "Erro não fatal no envio de OTP ou usuário não encontrado, prosseguindo para /verificar-otp",
      otpError.message // Loga a mensagem original para depuração
    );
    // Redireciona para a página de verificação de OTP
    redirect(`/verificar-otp?phone=${encodeURIComponent(phoneNumber)}`);
  }

  // Se não houve erro no OTP, redirecionar para a página de verificação
  console.log(
    "OTP enviado com sucesso (ou erro tratável), redirecionando para /verificar-otp"
  );
  redirect(`/verificar-otp?phone=${encodeURIComponent(phoneNumber)}`);
}
