import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // 1. Atualiza a sessão e obtém a resposta inicial
  const response = await updateSession(request);

  // 2. Cria um cliente Supabase (usando cookies potencialmente atualizados pela response)
  //    para verificar o estado de autenticação atual.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // --- 3. Proteção de Rotas --- (Agrupando e expandindo)
  const protectedRoutes = [
    "/dashboard",
    "/completar-cadastro", // Proteger a página de completar cadastro
    "/submeter-nf", // Adicionar outras rotas que exigem login
    "/meus-cupons", // Adicionar outras rotas que exigem login
    // Adicionar mais rotas aqui conforme necessário
    // Rotas de admin são tratadas separadamente abaixo
  ];
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedRoute =
    protectedRoutes.some((route) => pathname.startsWith(route)) || isAdminRoute;

  if (!user && isProtectedRoute) {
    console.log(
      `[Middleware] Usuário não autenticado tentou acessar ${pathname}. Redirecionando para /login.`
    );
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 4. Redireciona usuário LOGADO que tenta acessar rotas de AUTENTICAÇÃO
  const isAuthRoute = pathname === "/login" || pathname === "/verificar-otp";

  if (user && isAuthRoute) {
    // Já logado, não deveria estar aqui. Tenta buscar role para redirecionar.
    const { data: userData } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(); // Usar maybeSingle, pois pode não ter registro ainda

    console.log(
      `[Middleware] Usuário logado ${user.id} acessou rota de autenticação ${pathname}. Redirecionando.`
    );
    const url = request.nextUrl.clone();
    if (userData?.role === "admin") {
      // Redireciona admin para o dashboard do admin
      url.pathname = "/admin/dashboard";
    } else {
      // Se for user normal ou se ainda não tem registro (userData null),
      // o destino padrão é /dashboard (a página de dashboard trata o erro se o registro não existir ainda)
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // --- 5. Verificação Específica para /completar-cadastro ---
  if (user && pathname === "/completar-cadastro") {
    // Usuário está autenticado e tentando acessar a página de completar cadastro.
    // Verificar se ele JÁ tem registro na tabela 'usuarios'.
    const { data: existingUser, error: checkError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (checkError) {
      console.error(
        "[Middleware] Erro ao verificar usuário existente em /completar-cadastro:",
        checkError
      );
      // Em caso de erro, talvez permitir o acesso seja mais seguro que redirecionar incorretamente?
      // Ou redirecionar para login?
      // return NextResponse.redirect(new URL('/login', request.url));
      // Por enquanto, permite prosseguir e a página trata erros.
    } else if (existingUser) {
      // Usuário já existe na tabela! Não deveria estar em /completar-cadastro.
      console.log(
        `[Middleware] Usuário ${user.id} já cadastrado tentou acessar /completar-cadastro. Redirecionando para /dashboard.`
      );
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    // Se não houve erro e existingUser é null, permite o acesso a /completar-cadastro
  }

  // --- 6. Verificação de Role 'admin' para Rotas /admin --- (Mantida como estava, renumerada)
  if (user && isAdminRoute) {
    console.log(
      `[Middleware] Verificando acesso admin para ${pathname} por User ID: ${user.id}`
    );
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single(); // Usar single aqui, pois esperamos que exista se passou pelas checagens anteriores

    if (userError || userData?.role !== "admin") {
      if (userError) {
        console.error(
          "[Middleware] Erro ao buscar role do usuário para rota admin:",
          userError
        );
      } else {
        console.warn(
          `[Middleware] Redirecionando! Usuário ${user.id} com role "${userData?.role}" tentou acessar ${pathname}.`
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard"; // Redireciona não-admin para o dashboard normal
      return NextResponse.redirect(url);
    }
    console.log("[Middleware] Acesso admin permitido para", user.id);
  }

  // 7. Retorna a resposta original
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
