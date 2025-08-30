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
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  ArrowUpDown,
  TicketCheck,
  TicketX,
  Building,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Tipos
type Cupom = {
  id: number;
  created_at: string;
  num_nota: string;
  cnpj: string | null;
  sorteado_em: string | null;
};

type ClienteInfo = {
  cnpj: string;
  razao_social: string;
};

type ClienteMap = { [cnpj: string]: ClienteInfo };

type CombinedCupom = Cupom & {
  razao_social: string;
  status: "Sorteado" | "Elegível";
};

type SortConfigObject = {
  key: keyof Cupom | "razao_social" | "status";
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
      timeStyle: "short",
    }).format(date);
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return dateString;
  }
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
export default function AdminCuponsPage() {
  const [cupons, setCupons] = useState<CombinedCupom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "created_at",
    direction: "descending",
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

      let query = supabase.from("cupons").select(
        `
          id,
          created_at,
          num_nota,
          cnpj,
          sorteado_em
        `,
        { count: "exact" }
      );

      if (filterText) {
        const filterPattern = `%${filterText}%`;
        query = query.or(
          `num_nota.ilike.${filterPattern},cnpj.ilike.${filterPattern}`
        );
      }

      const sortKey = sortConfig?.key;
      if (sortConfig && sortKey !== "razao_social" && sortKey !== "status") {
        query = query.order(sortKey as keyof Cupom, {
          ascending: sortConfig.direction === "ascending",
          nullsFirst: false,
        });
      } else if (!sortConfig) {
        query = query.order("created_at", { ascending: false });
      }

      query = query.range(startIndex, endIndex);

      const { data: cuponsData, error: errorCupons, count } = await query;
      if (errorCupons) throw errorCupons;

      let fetchedCupons = (cuponsData as Cupom[]) || [];
      setTotalItems(count ?? 0);

      const cnpjsDaPagina = [
        ...Array.from(
          new Set(fetchedCupons.map((c) => c.cnpj).filter(Boolean))
        ),
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

      let combinedData: CombinedCupom[] = fetchedCupons.map((cupom) => ({
        ...cupom,
        razao_social: cupom.cnpj
          ? (pageClientesMap[cupom.cnpj]?.razao_social ?? "N/A")
          : "N/A",
        status: cupom.sorteado_em ? "Sorteado" : "Elegível",
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

      if (sortConfig && (sortKey === "razao_social" || sortKey === "status")) {
        combinedData.sort((a, b) => {
          const valA = String(a[sortKey] ?? "").toLowerCase();
          const valB = String(b[sortKey] ?? "").toLowerCase();
          if (valA < valB) return sortConfig.direction === "ascending" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "ascending" ? 1 : -1;
          return 0;
        });
      }

      setCupons(combinedData);
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      setErrorMsg(error.message || "Ocorreu um erro desconhecido.");
      setCupons([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filterText, sortConfig, currentPage, itemsPerPage]);

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

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="space-y-6">
      <div className="px-4 md:px-6">
        <h1 className="text-lg font-medium">Gerenciar Cupons</h1>
        <p className="text-sm text-muted-foreground">
          Visualize todos os cupons gerados na plataforma.
        </p>
      </div>
      <Separator />

      {errorMsg && (
        <div className="px-4 md:px-6">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erro ao Carregar Cupons</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex items-center py-4 px-4 md:px-6">
        <Input
          placeholder="Filtrar por Razão Social, CNPJ ou N° Nota..."
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
          <TableCaption>Lista de cupons gerados.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("id")}>
                  ID {getSortIcon("id")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => requestSort("created_at")}
                >
                  Data Criação {getSortIcon("created_at")}
                </Button>
              </TableHead>
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
                  Nº Nota Fiscal {getSortIcon("num_nota")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort("status")}>
                  Status {getSortIcon("status")}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-[50px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[90px]" />
                  </TableCell>
                </TableRow>
              ))
            ) : cupons && cupons.length > 0 ? (
              cupons.map((cupom) => {
                return (
                  <TableRow key={cupom.id}>
                    <TableCell className="font-mono text-xs">
                      {cupom.id}
                    </TableCell>
                    <TableCell>{formatDate(cupom.created_at)}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{cupom.razao_social}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatCnpj(cupom.cnpj)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {cupom.num_nota}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cupom.status === "Sorteado" ? "outline" : "default"
                        }
                      >
                        {cupom.status === "Sorteado" ? (
                          <TicketX className="mr-1 h-3 w-3" />
                        ) : (
                          <TicketCheck className="mr-1 h-3 w-3" />
                        )}
                        {cupom.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {filterText
                    ? "Nenhum cupom encontrado para o filtro atual."
                    : "Nenhum cupom encontrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4 px-4 md:px-6">
        <div className="text-sm text-muted-foreground">
          {totalItems} cupom(ns) encontrado(s).
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
