import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EligibleNote {
  num_nota: string;
  data_emissao: string | null;
  valor: number | null;
}

interface EligibleNotesProps {
  notes: EligibleNote[];
}

const formatCurrency = (value: number | null) => {
  if (value === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return dateString;
  }
};

export function EligibleNotes({ notes }: EligibleNotesProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Notas Fiscais Aptas para Submissão</CardTitle>
        <CardDescription>
          Estas são as notas fiscais que você pode usar para gerar novos cupons.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="text-muted-foreground">
            Você não possui notas fiscais aptas para submissão no momento.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Nota Fiscal</TableHead>
                <TableHead>Data de Emissão</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note.num_nota}>
                  <TableCell className="font-medium">{note.num_nota}</TableCell>
                  <TableCell>{formatDate(note.data_emissao)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(note.valor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
