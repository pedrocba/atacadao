import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // 1. Atualiza a sessão e obtém o usuário já verificado
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // --- 2. Proteção de Rotas ---
  const protectedRoutes = [
    "/dashboard",
    "/completar-cadastro",
    "/submeter-nf",
    "/meus-cupons",
    "/admin", // Protege todas as rotas admin
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Redireciona para login se não estiver autenticado e tentar acessar rota protegida
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Opcional: Adicionar parâmetro para redirecionar de volta após login
    // url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // --- 3. Redirecionamento de Usuário Logado ---
  const isAuthRoute = pathname === "/login" || pathname === "/verificar-otp";

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    // Como removemos a consulta ao banco no middleware por performance,
    // redirecionamos todos para o dashboard padrão.
    // O dashboard ou layout deve lidar com redirecionamento de admin se necessário.
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Nota: A verificação específica de 'admin' e 'completar-cadastro' que exigia
  // consulta ao banco de dados foi removida do middleware para evitar latência.
  // Essas verificações devem ser feitas nos Layouts ou Pages (Server Components).

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
