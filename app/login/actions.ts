"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Definição do estado que a action pode retornar
interface VerifyOtpState {
  message?: string | null;
  phone?: string;
}

// Função para criar um cliente Supabase com a chave de serviço
const createServiceRoleClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) { },
        remove(name: string, options: CookieOptions) { },
      },
    }
  );
};

export async function verifyOtpAction(
  prevState: VerifyOtpState,
  formData: FormData
): Promise<VerifyOtpState> {
  const cookieStore = await cookies();
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
          } catch (error) { }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) { }
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

  const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
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
  const supabaseService = await createServiceRoleClient();
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

export async function loginWithWhatsApp(
  prevState: { message: string },
  formData: FormData,
) {
  const cookieStore = await cookies();
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
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) { }
        },
      },
    },
  );

  const phone = formData.get("whatsapp") as string;
  // Simple validation: remove non-numeric chars
  const cleanPhone = phone.replace(/\\D/g, "");

  if (!cleanPhone) {
    return { message: "Número de telefone inválido." };
  }

  // Format for WhatsApp typically requires country code if not present.
  // Assuming BR (+55) if length is 10 or 11.
  let formattedPhone = cleanPhone;
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    formattedPhone = `55${cleanPhone}`;
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone,
    options: {
      channel: 'whatsapp'
    }
  });

  if (error) {
    console.error("Erro ao enviar OTP:", error);
    return { message: "Erro ao enviar código. Tente novamente." };
  }

  redirect(`/verificar-otp?phone=${encodeURIComponent(formattedPhone)}`);
}
