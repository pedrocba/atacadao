"use server";

import { createClient } from "@/utils/supabase/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface LoginWithWhatsAppState {
  message: string;
}

const formatBrazilPhoneNumber = (value: string): string | null => {
  const digitsOnly = value.replace(/\D/g, "");

  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return `+55${digitsOnly}`;
  }

  return null;
};

export async function loginWithWhatsApp(
  _prevState: LoginWithWhatsAppState,
  formData: FormData
): Promise<LoginWithWhatsAppState> {
  const supabase = await createClient();

  const rawWhatsapp = (formData.get("whatsapp") as string) ?? "";
  const formattedPhone = formatBrazilPhoneNumber(rawWhatsapp);

  if (!formattedPhone) {
    return { message: "Número de WhatsApp inválido. Use DDD + número." };
  }

  const {
    error: signInError,
  } = await supabase.auth.signInWithOtp({
    phone: formattedPhone,
    options: {
      channel: "whatsapp",
      shouldCreateUser: true,
    },
  });

  if (signInError) {
    console.error("Erro ao enviar OTP via WhatsApp:", signInError);

    const message =
      signInError.message ===
      "For security reasons, you can only request this code a few more times"
        ? "Muitas tentativas. Aguarde antes de solicitar um novo código."
        : "Não foi possível enviar o código. Tente novamente.";

    return { message };
  }

  redirect(
    `/verificar-otp?phone=${encodeURIComponent(formattedPhone)}&source=login`
  );
}

// Definição do estado que a action pode retornar
interface VerifyOtpState {
  message?: string | null;
  phone?: string;
}

// Função para criar um cliente Supabase com a chave de serviço
const createServiceRoleClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  );
};

export async function verifyOtpAction(
  prevState: VerifyOtpState,
  formData: FormData
): Promise<VerifyOtpState> {
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
          } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
      },
    }
  );

  const otp = formData.get("otp") as string;
  const phone = prevState?.phone || (formData.get("phone") as string);

  if (!phone) {
    return { message: "Número de telefone não fornecido." };
  }
  if (!otp || otp.length !== 6) {
    return { message: "Código OTP inválido.", phone: phone };
  }

  const {
    data: { session },
    error: verifyError,
  } = await supabase.auth.verifyOtp({
    phone: phone,
    token: otp,
    type: "sms",
  });

  if (verifyError) {
    console.error("Erro ao verificar OTP:", verifyError);
    return { message: "Código inválido ou expirado. Tente novamente.", phone: phone };
  }
  if (!session?.user) {
    return { message: "Erro ao obter informações do usuário.", phone: phone };
  }

  const user = session.user;
  const supabaseService = createServiceRoleClient();
  const { data: existingUser, error: userError } = await supabaseService
    .from("usuarios")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) {
    console.error("Erro CRÍTICO ao buscar usuário existente (Service Role):", userError);
    return { message: "Erro ao verificar o cadastro. Contate o suporte.", phone: phone };
  }

  if (existingUser) {
    if (existingUser.role === 'admin') {
      redirect("/admin/dashboard");
    }
    redirect("/dashboard");
  } else {
    redirect(`/completar-cadastro?phone=${encodeURIComponent(phone)}`);
  }
}
