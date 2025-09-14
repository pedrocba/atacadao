"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

  const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
    phone: phone,
    token: otp,
    type: "whatsapp",
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
    console.error("Erro ao buscar usuário existente (Service Role):", userError);
    return { message: "Erro ao verificar o cadastro. Contate o suporte.", phone: phone };
  }

  if (existingUser) {
    if (existingUser.role === 'admin') {
      redirect("/admin/dashboard");
    } else {
      redirect("/dashboard");
    }
  } else {
    redirect(`/completar-cadastro?phone=${encodeURIComponent(phone)}`);
  }
}
