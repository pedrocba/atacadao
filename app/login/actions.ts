"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// Função simples para formatar o número para E.164
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return phone;
}

export async function loginWithWhatsApp(prevState: any, formData: FormData) {
const supabase = await createClient();

  const rawPhoneNumber = formData.get("whatsapp") as string;

  if (!rawPhoneNumber) {
    return { message: "Número de WhatsApp é obrigatório." };
  }

  const phoneNumber = formatPhoneNumber(rawPhoneNumber);

  const { error: otpError } = await supabase.auth.signInWithOtp({
    phone: phoneNumber,
    options: {
      shouldCreateUser: true,
      channel: "whatsapp",
    },
  });

  if (otpError) {
    console.error("Erro ao enviar OTP inicial:", otpError);
    if (otpError.message.includes("rate limit")) {
      return { message: "Muitas tentativas. Tente novamente mais tarde." };
    }
    redirect(`/verificar-otp?phone=${encodeURIComponent(phoneNumber)}`);
  } else {
    redirect(`/verificar-otp?phone=${encodeURIComponent(phoneNumber)}`);
  }
}
