"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Definição do estado que a action pode retornar
interface VerifyOtpState {
  message?: string | null;
  phone?: string;
}

// Função auxiliar para criar um cliente com a Service Role Key
// Isso é seguro pois só é executado no servidor e as chaves não são expostas
const createServiceRoleClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use a chave de serviço aqui
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Ações que modificam cookies devem ser tratadas com cuidado
          // Para esta operação de leitura, podemos deixar em branco ou apenas registrar
        },
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
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Ignorar erros em Server Actions
          }
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

  // A verificação do OTP continua usando o cliente normal (contexto do usuário)
  const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
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

  if (!session?.user) {
    console.error("Usuário não encontrado após verificação de OTP bem-sucedida.");
    return { message: "Erro ao obter informações do usuário.", phone: phone };
  }
  
  const user = session.user;

  // AGORA, USAMOS O CLIENTE DE SERVIÇO PARA BYPASSAR A RLS NESTA CONSULTA
  const supabaseService = createServiceRoleClient();
  const { data: existingUser, error: userError } = await supabaseService
    .from("usuarios")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) {
    console.error("Erro CRÍTICO ao buscar usuário existente pós-OTP (Service Role):", userError);
    return { message: "Erro ao verificar o cadastro. Contate o suporte.", phone: phone };
  }

  if (existingUser) {
    console.log(`[Verify OTP Action] Usuário ${user.id} encontrado. Redirecionando...`);
    if (existingUser.role === 'admin') {
      redirect("/admin/dashboard");
    }
    redirect("/dashboard");
  } else {
    console.log(`[Verify OTP Action] Usuário ${user.id} NÃO encontrado. Redirecionando para /completar-cadastro.`);
    redirect(`/completar-cadastro?phone=${encodeURIComponent(phone)}`);
  }
}
