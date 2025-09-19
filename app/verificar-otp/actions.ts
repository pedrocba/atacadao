"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Definição do estado que a action pode retornar
interface VerifyOtpState {
  message?: string | null;
  phone?: string;
}

// Função para criar um cliente Supabase padrão
const createClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Em alguns casos, set pode falhar em server actions
            // Este try/catch evita crashes
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch (error) {
            // Em alguns casos, remove pode falhar em server actions
            // Este try/catch evita crashes
          }
        },
      },
    }
  );
};

// Função para criar um cliente Supabase com a chave de serviço (seguro no servidor)
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
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Em alguns casos, set pode falhar em server actions
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch (error) {
            // Em alguns casos, remove pode falhar em server actions
          }
        },
      },
    }
  );
};

export async function verifyOtpAction(
  prevState: VerifyOtpState,
  formData: FormData
): Promise<VerifyOtpState> {
  try {
    const supabase = await createClient();
    const otp = formData.get("otp") as string;
    const phone = prevState?.phone || (formData.get("phone") as string);

    if (!phone) {
      return { message: "Número de telefone não fornecido." };
    }

    if (!otp || otp.length !== 6) {
      return { message: "Código OTP inválido.", phone: phone };
    }

    // Verificação OTP
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: phone,
      token: otp,
      type: "sms",
    });

    if (verifyError) {
      console.error("Erro ao verificar OTP:", verifyError.message);
      if (verifyError.message.includes("Invalid OTP") || verifyError.message.includes("invalid")) {
        return { message: "O código inserido está incorreto. Tente novamente.", phone: phone };
      }
      if (verifyError.message.includes("expired")) {
        return { message: "Código expirado. Solicite um novo código.", phone: phone };
      }
      return { message: "Código inválido ou expirado. Tente novamente.", phone: phone };
    }

    // Verificação da sessão
    if (!data.session || !data.user) {
      return { message: "Não foi possível autenticar a sessão. Tente fazer login novamente.", phone: phone };
    }

    const { user } = data.session;
    const supabaseService = await createServiceRoleClient();
    
    const { data: existingUser, error: userError } = await supabaseService
      .from("usuarios")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      console.error("Erro ao buscar usuário existente:", userError);
      return { message: "Erro ao verificar o cadastro. Contate o suporte.", phone: phone };
    }

    // Redirecionamento baseado no usuário
    if (existingUser) {
      if (existingUser.role === 'admin') {
        redirect("/admin/dashboard");
      } else {
        redirect("/dashboard");
      }
    } else {
      redirect(`/completar-cadastro?phone=${encodeURIComponent(phone)}`);
    }

  } catch (error) {
    console.error("Erro geral na verificação OTP:", error);
    return { 
      message: "Erro interno do servidor. Tente novamente.", 
      phone: prevState?.phone 
    };
  }
}
