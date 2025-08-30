"use client";

import { useState, useEffect, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client"; // Mudar para client
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ClienteActions } from "./ClienteActions"; // Importar o componente de ações
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link"; // Adicionar import para Link
// TODO: Importar componentes de edição quando criados

// Tipos
type Cliente = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
};

type SortConfigObject = {
  // Adicionar colunas ordenáveis
  key: keyof Cliente | "cnpj" | "razao_social" | "nome_fantasia";
  direction: "ascending" | "descending";
};
type SortConfig = SortConfigObject | null;
type SortKey = SortConfigObject["key"];

// Função para formatar CNPJ (reutilizada)
function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return "-";
  const cleaned = cnpj.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`;
  }
  return cnpj;
}

// Componente Principal
export default function AdminClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "razao_social",
    direction: "ascending",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;

      let query = supabase
        .from("clientes")
        .select("cnpj, razao_social, nome_fantasia", { count: "exact" });

      // Aplicar Filtro
      if (filterText) {
        const filterPattern = `%${filterText}%`;
        query = query.or(
          `cnpj.ilike.${filterPattern},razao_social.ilike.${filterPattern},nome_fantasia.ilike.${filterPattern}`
        );
      }

      // Aplicar Ordenação
      if (sortConfig) {
        query = query.order(sortConfig.key, {
          ascending: sortConfig.direction === "ascending",
          nullsFirst: false,
        });
      } else {
        query = query.order("razao_social", { ascending: true }); // Fallback
      }

      // Aplicar Paginação
      query = query.range(startIndex, endIndex);

      const { data: clientesData, error, count } = await query;
      if (error) throw error;

      setClientes((clientesData as Cliente[]) || []);
      setTotalItems(count ?? 0);
    } catch (error: any) {
      console.error("Erro ao buscar clientes:", error);
      setErrorMsg(error.message || "Ocorreu um erro desconhecido.");
      setClientes([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filterText, sortConfig, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Funções de ordenação
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
    setCurrentPage(1); // Resetar página ao ordenar
    setSortConfig({ key, direction });
  };

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

  // Funções de paginação
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6">
      <div className="px-4 md:px-6">
        <h1 className="text-lg font-medium">Gerenciar Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Visualize e edite os dados dos clientes PJ cadastrados.
        </p>
      </div>
      {/* Botão para Importar Clientes */}
      <div className="px-4 md:px-6 mt-4 flex justify-end">
        <Link href="/admin/clientes/importar-excel">
          <Button variant="default">Importar Clientes via Excel</Button>
        </Link>
      </div>
      <Separator />

      {errorMsg && (
        <div className="px-4 md:px-6">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erro ao Carregar Clientes</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex items-center py-4 px-4 md:px-6">
        <Input
          placeholder="Filtrar por CNPJ, Razão Social ou Nome Fantasia..."
          value={filterText}
          onChange={(e) => {
            setFilterText(e.target.value);
            setCurrentPage(1); // Resetar página ao filtrar
          }}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border w-full overflow-x-auto">
        <Table>
          <TableCaption>Lista de clientes cadastrados.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("cnpj")}>
                  CNPJ {getSortIcon("cnpj")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => requestSort("razao_social")}
                >
                  Razão Social {getSortIcon("razao_social")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => requestSort("nome_fantasia")}
                >
                  Nome Fantasia {getSortIcon("nome_fantasia")}
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
                    <Skeleton className="h-4 w-[250px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 float-right" />
                  </TableCell>
                </TableRow>
              ))
            ) : clientes && clientes.length > 0 ? (
              clientes.map((cliente) => (
                <TableRow key={cliente.cnpj}>
                  <TableCell className="font-mono">
                    {formatCnpj(cliente.cnpj)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {cliente.razao_social}
                  </TableCell>
                  <TableCell>{cliente.nome_fantasia || "-"}</TableCell>
                  <TableCell className="text-right">
                    <ClienteActions cliente={cliente} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  {filterText
                    ? "Nenhum cliente encontrado para o filtro atual."
                    : "Nenhum cliente encontrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4 px-4 md:px-6">
        <div className="text-sm text-muted-foreground">
          {totalItems} cliente(s) encontrado(s).
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
