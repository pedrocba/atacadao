"use client"; // Mover para client component

import { useState, useEffect, useCallback } from "react"; // Adicionar imports
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client"; // Usar client
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // Para exibir a role
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Para erros
import { Terminal } from "lucide-react"; // Ícone para erro
import { UserActions } from "./UserActions"; // Importar componente de ações
import { Skeleton } from "@/components/ui/skeleton"; // Adicionar Skeleton
import { Input } from "@/components/ui/input"; // Add Input
import { Button } from "@/components/ui/button"; // Add Button
import { ArrowUpDown } from "lucide-react"; // Add Icon for sorting
import { ChevronLeft, ChevronRight } from "lucide-react"; // Icons for pagination
// TODO: Importar componentes de edição/ação quando criados

// Tipos (Definir um tipo para o usuário)
type Usuario = {
  id: string;
  nome: string | null;
  // cpf: string | null; // Remover CPF se não for mais usado
  whatsapp: string | null;
  cnpj: string | null;
  role: string | null;
  created_at: string | null;
};

// Adicionar tipo para configuração de ordenação
type SortConfigObject = {
  key: keyof Usuario | "nome" | "whatsapp" | "cnpj" | "role" | "created_at"; // Colunas ordenáveis
  direction: "ascending" | "descending";
};
type SortConfig = SortConfigObject | null;

// Definir o tipo para a chave de ordenação separadamente
type SortKey = SortConfigObject["key"];

// Função para formatar data (reutilizada)
function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch (e) {
    return dateString; // Retorna o original se houver erro
  }
}

// Função para formatar WhatsApp (ex: +55 (11) 98765-4321)
// Assume que o formato salvo é E.164 (+5511987654321)
function formatWhatsapp(whatsapp: string | null): string {
  if (!whatsapp) return "-";
  const cleaned = whatsapp.replace(/\D/g, ""); // Remove não dígitos
  // Tenta aplicar a máscara +NN (NN) NNNNN-NNNN
  const match = cleaned.match(/^(\d{2})(\d{2})(\d{5})(\d{4})$/);
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
  }
  // Tenta aplicar máscara para números sem o 9º dígito (mais antigos)
  const match8digit = cleaned.match(/^(\d{2})(\d{2})(\d{4})(\d{4})$/);
  if (match8digit) {
    return `+${match8digit[1]} (${match8digit[2]}) ${match8digit[3]}-${match8digit[4]}`;
  }
  return whatsapp; // Retorna original se não corresponder
}

// Função para formatar CNPJ (ex: 12.345.678/0001-99)
function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return "-";
  const cleaned = cnpj.replace(/\D/g, ""); // Remove não dígitos
  // Aplica a máscara NN.NNN.NNN/NNNN-NN
  const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`;
  }
  return cnpj; // Retorna original se não corresponder
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [performingAdminId, setPerformingAdminId] = useState<
    string | undefined
  >(undefined); // Estado para admin ID
  const [filterText, setFilterText] = useState(""); // Estado para filtro
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "created_at",
    direction: "descending",
  }); // Estado para ordenação (padrão)
  const [currentPage, setCurrentPage] = useState(1); // Estado para página atual
  const [itemsPerPage] = useState(10); // Itens por página (pode ser configurável depois)
  const [totalItems, setTotalItems] = useState(0); // Estado para total de itens

  const supabase = createClient(); // Criar cliente supabase

  // Função para buscar dados
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Obter o ID do admin logado (necessário para UserActions)
      const {
        data: { user: adminUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError && userError.message !== "Auth session missing!")
        throw userError; // Ignorar erro de sessão ausente inicial
      setPerformingAdminId(adminUser?.id);

      // Calcular range da paginação
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;

      // Construir query base
      let query = supabase
        .from("usuarios")
        // Pedir contagem junto com select
        .select("id, nome, whatsapp, cnpj, role, created_at", {
          count: "exact",
        });

      // Aplicar Filtro (no nome, whatsapp ou cnpj)
      if (filterText) {
        const filterPattern = `%${filterText}%`;
        query = query.or(
          `nome.ilike.${filterPattern},whatsapp.ilike.${filterPattern},cnpj.ilike.${filterPattern}`
        );
      }

      // Aplicar Ordenação
      if (sortConfig) {
        query = query.order(sortConfig.key, {
          ascending: sortConfig.direction === "ascending",
          nullsFirst: false, // Opcional: como tratar nulos
        });
      } else {
        // Fallback: Ordenação padrão se sortConfig for null (não deve acontecer com o estado inicial)
        query = query.order("created_at", { ascending: false });
      }

      // Aplicar Paginação
      query = query.range(startIndex, endIndex);

      // Executar query
      const { data: usuariosData, error, count } = await query;

      if (error) throw error;

      setUsuarios(usuariosData as Usuario[]);
      setTotalItems(count ?? 0); // Atualizar total de itens (usar count da resposta)
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      setErrorMsg(error.message || "Ocorreu um erro desconhecido.");
      setUsuarios([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filterText, sortConfig, currentPage, itemsPerPage]); // Dependência do supabase

  // Buscar dados no mount inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Usar fetchData como dependência

  // Função para solicitar ordenação
  const requestSort = (key: SortKey) => {
    if (!key) return;
    let direction: SortConfigObject["direction"] = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Função para obter ícone de ordenação
  const getSortIcon = (key: SortKey) => {
    if (!key) return null;
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === "ascending" ? (
      <span className="ml-2">▲</span>
    ) : (
      <span className="ml-2">▼</span>
    );
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Funções para mudar de página
  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="space-y-6">
      <div className="px-4 md:px-6">
        <h1 className="text-lg font-medium">Gerenciar Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Visualize e edite os usuários cadastrados na plataforma.
        </p>
      </div>
      <Separator />
      {errorMsg && (
        <div className="px-4 md:px-6">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erro ao Carregar Usuários</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        </div>
      )}
      <div className="flex items-center py-4 px-4 md:px-6">
        <Input
          placeholder="Filtrar por Nome, WhatsApp ou CNPJ..."
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border  w-full">
        <Table>
          <TableCaption>Lista de usuários cadastrados.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("nome")}>
                  Nome Completo
                  {getSortIcon("nome")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("whatsapp")}>
                  WhatsApp
                  {getSortIcon("whatsapp")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("cnpj")}>
                  CNPJ Associado
                  {getSortIcon("cnpj")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("role")}>
                  Role
                  {getSortIcon("role")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => requestSort("created_at")}
                >
                  Data Cadastro
                  {getSortIcon("created_at")}
                </Button>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[80px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 float-right" />
                  </TableCell>
                </TableRow>
              ))
            ) : usuarios && usuarios.length > 0 ? (
              usuarios.map((usuario) => {
                const userRole = usuario.role === "admin" ? "admin" : "cliente";
                return (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">
                      {usuario.nome || "-"}
                    </TableCell>
                    <TableCell>{formatWhatsapp(usuario.whatsapp)}</TableCell>
                    <TableCell>{formatCnpj(usuario.cnpj)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={userRole === "admin" ? "default" : "secondary"}
                      >
                        {usuario.role || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(usuario.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <UserActions
                        userId={usuario.id}
                        currentRole={userRole}
                        performingAdminId={performingAdminId}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {filterText
                    ? "Nenhum usuário encontrado para o filtro atual."
                    : "Nenhum usuário encontrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4 px-4 md:px-6">
        <div className="text-sm text-muted-foreground">
          {totalItems} usuário(s) encontrado(s).
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages || totalItems === 0}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
