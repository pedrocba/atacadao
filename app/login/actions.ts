"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Função simples para formatar o número para E.164
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
            // Ignorar erros em Server Actions
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

  // Tentar enviar OTP via Supabase Auth
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
    
    // Para outros erros, continuamos para a tela de verificação
    console.log(
      "Erro não fatal no envio de OTP, prosseguindo para /verificar-otp",
      otpError.message
    );
    redirect(`/verificar-otp?phone=${encodeURIComponent(phoneNumber)}`);
  }

  // Se não houve erro, redirecionar para a página de verificação
  console.log(
    "OTP enviado com sucesso, redirecionando para /verificar-otp"
  );
  redirect(`/verificar-otp?phone=${encodeURIComponent(phoneNumber)}`);
}
