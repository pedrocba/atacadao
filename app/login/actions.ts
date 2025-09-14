"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Função para formatar o número de telefone
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return phone;
}

export async function loginWithWhatsApp(prevState: any, formData: FormData) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignorar erros em Server Actions, pois o cabeçalho pode já ter sido enviado
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignorar erros em Server Actions
          }
        },
      },
    }
  );

  const rawPhoneNumber = formData.get("whatsapp") as string;

  if (!rawPhoneNumber) {
    return { message: "Número de WhatsApp é obrigatório." };
  }

  const phoneNumber = formatPhoneNumber(rawPhoneNumber);

  // Envia o OTP
  await supabase.auth.signInWithOtp({
    phone: phoneNumber,
    options: {
      shouldCreateUser: true,
      channel: "whatsapp",
    },
  });

  // Redireciona para a página de verificação
  redirect(`/verificar-otp?phone=${encodeURIComponent(phoneNumber)}`);
}
