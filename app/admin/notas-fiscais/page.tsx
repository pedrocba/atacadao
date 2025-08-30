"use client";

import { useState, useEffect, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  ArrowUpDown,
  Building,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

// Tipos
type NotaFiscal = {
  num_nota: string;
  data_emissao: string | null;
  valor: number | null;
  cnpj: string | null;
  status?: string | null;
  created_at?: string | null;
  cod_filial: number | null;
};

type ClienteInfo = {
  cnpj: string;
  razao_social: string;
};

type ClienteMap = { [cnpj: string]: ClienteInfo };

// Tipo para dados combinados (Nota + Razao Social)
type CombinedNota = NotaFiscal & { razao_social: string };

// Tipos de Ordenação
type SortConfigObject = {
  key: keyof NotaFiscal | "razao_social";
  direction: "ascending" | "descending";
};
type SortConfig = SortConfigObject | null;
type SortKey = SortConfigObject["key"];

// Funções de formatação
function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
    }).format(date);
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return dateString;
  }
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return "-";
  const cleaned = cnpj.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`;
  }
  return cnpj;
}

// --- Componente Principal ---
export default function AdminNotasFiscaisPage() {
  const [notas, setNotas] = useState<CombinedNota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "num_nota",
    direction: "descending",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [filiais, setFiliais] = useState<string[]>([]);
  const [filialSelecionada, setFilialSelecionada] = useState<string>("");

  const supabase = createClient();

  // Buscar filiais distintas ao carregar a página
  useEffect(() => {
    async function fetchFiliais() {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("cod_filial")
        .not("cod_filial", "is", null)
        .order("cod_filial", { ascending: true });
      if (!error && data) {
        const unicas = Array.from(new Set(data.map((n) => n.cod_filial)));
        setFiliais(unicas.map(String));
      }
    }
    fetchFiliais();
  }, [supabase]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;

      let query = supabase
        .from("notas_fiscais")
        .select("num_nota, data_emissao, valor, cnpj, cod_filial", {
          count: "exact",
        });

      if (filterText) {
        const filterPattern = `%${filterText}%`;
        query = query.or(
          `num_nota.ilike.${filterPattern},cnpj.ilike.${filterPattern}`
        );
      }

      if (filialSelecionada) {
        query = query.eq("cod_filial", parseInt(filialSelecionada));
      }

      const sortKey = sortConfig?.key;
      if (sortConfig && sortKey !== "razao_social") {
        const validSortKey = sortKey as keyof NotaFiscal;
        query = query.order(validSortKey, {
          ascending: sortConfig.direction === "ascending",
          nullsFirst: false,
        });
      } else if (!sortConfig) {
        query = query.order("num_nota", { ascending: false });
      }

      query = query.range(startIndex, endIndex);

      const { data: notasData, error: errorNotas, count } = await query;
      if (errorNotas) throw errorNotas;

      let fetchedNotas = (notasData as NotaFiscal[]) || [];
      setTotalItems(count ?? 0);

      const cnpjsDaPagina = [
        ...Array.from(new Set(fetchedNotas.map((n) => n.cnpj).filter(Boolean))),
      ] as string[];
      const pageClientesMap: ClienteMap = {};

      if (cnpjsDaPagina.length > 0) {
        const { data: clientesData, error: errorClientes } = await supabase
          .from("clientes")
          .select("cnpj, razao_social")
          .in("cnpj", cnpjsDaPagina);

        if (errorClientes) {
          console.warn("Erro ao buscar clientes:", errorClientes.message);
        } else {
          (clientesData as ClienteInfo[]).forEach((cliente) => {
            if (cliente.cnpj) {
              pageClientesMap[cliente.cnpj] = cliente;
            }
          });
        }
      }

      let combinedData: CombinedNota[] = fetchedNotas.map((nota) => ({
        ...nota,
        razao_social: nota.cnpj
          ? (pageClientesMap[nota.cnpj]?.razao_social ?? "N/A")
          : "N/A",
      }));

      if (filterText) {
        const lowerFilter = filterText.toLowerCase();
        combinedData = combinedData.filter(
          (item) =>
            item.razao_social.toLowerCase().includes(lowerFilter) ||
            item.cnpj?.includes(lowerFilter) ||
            item.num_nota.toLowerCase().includes(lowerFilter)
        );
      }

      if (sortConfig && sortKey === "razao_social") {
        combinedData.sort((a, b) => {
          const valA = a.razao_social.toLowerCase();
          const valB = b.razao_social.toLowerCase();
          if (valA < valB) return sortConfig.direction === "ascending" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        });
      }

      setNotas(combinedData);
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      setErrorMsg(error.message || "Ocorreu um erro desconhecido.");
      setNotas([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    supabase,
    filterText,
    sortConfig,
    currentPage,
    itemsPerPage,
    filialSelecionada,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setCurrentPage(1);
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

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6">
      <div className="px-4 md:px-6 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-medium">Gerenciar Notas Fiscais</h1>
          <p className="text-sm text-muted-foreground">
            Visualize e gerencie as notas fiscais enviadas.
          </p>
        </div>
        <Link href="/admin/notas-fiscais/importar-excel">
          <Button variant="default">Importar via Excel</Button>
        </Link>
      </div>
      <Separator />

      {errorMsg && (
        <div className="px-4 md:px-6">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erro ao Carregar Dados</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Filtro de filial */}
      <div className="flex items-center gap-4 py-2 px-4 md:px-6">
        <label htmlFor="filtro-filial" className="text-sm font-medium">
          Filtrar por Filial:
        </label>
        <select
          id="filtro-filial"
          className="border rounded px-2 py-1 text-sm"
          value={filialSelecionada}
          onChange={(e) => {
            setFilialSelecionada(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">Todas</option>
          {filiais.map((filial) => (
            <option key={filial} value={filial}>
              {filial}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center py-4 px-4 md:px-6">
        <Input
          placeholder="Filtrar por Razão Social, CNPJ ou Nº Nota..."
          value={filterText}
          onChange={(event) => {
            setFilterText(event.target.value);
            setCurrentPage(1);
          }}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border w-full overflow-x-auto">
        <Table>
          <TableCaption>Lista de notas fiscais submetidas.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => requestSort("razao_social")}
                >
                  Cliente (Razão Social) {getSortIcon("razao_social")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("cnpj")}>
                  CNPJ {getSortIcon("cnpj")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("num_nota")}>
                  Num. Nota {getSortIcon("num_nota")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => requestSort("data_emissao")}
                >
                  Data Emissão {getSortIcon("data_emissao")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => requestSort("cod_filial")}
                >
                  Filial {getSortIcon("cod_filial")}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort("valor")}>
                  Valor {getSortIcon("valor")}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[80px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[80px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-[90px] float-right" />
                  </TableCell>
                </TableRow>
              ))
            ) : notas && notas.length > 0 ? (
              notas.map((nota) => {
                return (
                  <TableRow key={nota.num_nota}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{nota.razao_social}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatCnpj(nota.cnpj)}
                    </TableCell>
                    <TableCell>{nota.num_nota}</TableCell>
                    <TableCell>{formatDate(nota.data_emissao)}</TableCell>
                    <TableCell>{nota.cod_filial || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(nota.valor)}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {filterText
                    ? "Nenhuma nota fiscal encontrada para o filtro atual."
                    : "Nenhuma nota fiscal encontrada."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4 px-4 md:px-6">
        <div className="text-sm text-muted-foreground">
          {totalItems} nota(s) fiscal(is) encontrada(s).
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
