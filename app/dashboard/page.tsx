import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "./LogoutButton"; // Importar o botão
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmeterForm } from "@/app/submeter-nf/SubmeterForm"; // Importar o formulário
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns"; // Para formatar datas
import { ptBR } from "date-fns/locale"; // Para formato brasileiro
import Image from "next/image"; // Importar Image

// Importar Logo
import logoAtacadao from "@/img/logo_atacadao.png";

// Definir um tipo para os dados esperados do usuário da tabela 'usuarios'
interface UsuarioCompleto {
  cnpj: string;
  role: string;
  nome: string;
  // Adicionar outros campos se precisar deles no dashboard
}

// Helper para formatar data e hora
const formatDateTime = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return dateString; // Retorna a string original em caso de erro
  }
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Obter o usuário autenticado
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Se não houver usuário autenticado, redireciona para login
  // O middleware já deve fazer isso, mas é uma segurança extra.
  if (userError || !user) {
    console.error("Dashboard: Usuário não autenticado.", userError);
    redirect("/login");
  }

  // 2. Tentar buscar o registro do usuário na tabela 'usuarios'
  const { data: usuarioCompleto, error: usuarioCompletoError } = await supabase
    .from("usuarios")
    .select("cnpj, role, nome")
    .eq("id", user.id)
    .single();

  if (usuarioCompletoError || !usuarioCompleto) {
    console.error("Dashboard: Erro ao buscar perfil do usuário.", usuarioCompletoError);
    // Logout seguro se o perfil não existir (consistência de dados)
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Se for admin, redirecionar
  if (usuarioCompleto.role === "admin") {
    redirect("/admin/dashboard");
  }

  const { nome: nomeUsuario, cnpj: userCnpj } = usuarioCompleto;

  // 3. Buscar cupons do cliente (usando o CNPJ obtido)
  // Otimização: Limitar colunas e usar talvez paginação no futuro se necessário
  const { data: cupons, error: cuponsError } = await supabase
    .from("cupons")
    .select("id, num_nota, created_at, sorteado_em")
    .eq("cnpj", userCnpj)
    .order("created_at", { ascending: false });

  if (cuponsError) {
    console.error("Dashboard: Erro ao buscar cupons.", cuponsError);
  }

  // --- RENDERIZAÇÃO DO DASHBOARD NORMAL ---
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-screen-sm">
      {/* ===== Cabeçalho ===== */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b">
        <div className="flex items-center gap-4">
          <Image
            src={logoAtacadao}
            alt="Logo Atacadão Meio a Meio"
            className="object-contain w-20"
          />
          <span className="text-xl font-medium text-muted-foreground">
            Olá, {nomeUsuario}!
          </span>
        </div>
        <LogoutButton />
      </div>
      {/* ===== Fim Cabeçalho ===== */}

      {/* Seção Superior: Submeter Nota Fiscal */}
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle>Nova Nota Fiscal</CardTitle>
          <CardDescription>
            Insira o número da nota fiscal para gerar um cupom para o sorteio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* O formulário pegará o CNPJ do usuário logado via action */}
          <SubmeterForm />
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Seção Inferior: Meus Cupons */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Meus Cupons Gerados</CardTitle>
          <CardDescription>
            Acompanhe os cupons que você gerou a partir das suas notas fiscais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cuponsError && (
            <p className="text-red-500 mb-4">Erro ao carregar seus cupons.</p>
          )}
          {!cuponsError && (!cupons || cupons.length === 0) && (
            <p className="text-muted-foreground">
              Você ainda não gerou nenhum cupom.
            </p>
          )}
          {!cuponsError && cupons && cupons.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID Cupom</TableHead>
                  <TableHead>Nº Nota Fiscal</TableHead>
                  <TableHead>Data Geração</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cupons.map((cupom) => (
                  <TableRow key={cupom.id}>
                    <TableCell className="font-medium">{cupom.id}</TableCell>
                    <TableCell>{cupom.num_nota}</TableCell>
                    <TableCell>{formatDateTime(cupom.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={cupom.sorteado_em ? "secondary" : "default"}
                      >
                        {cupom.sorteado_em
                          ? `Sorteado em ${formatDateTime(cupom.sorteado_em)}`
                          : "Elegível"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
