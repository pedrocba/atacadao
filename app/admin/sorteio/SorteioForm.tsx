"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Award, ListChecks, Play, XCircle } from "lucide-react";
import {
  getElegibleCuponsForAnimation,
  realizarSorteioAction,
} from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SorteioFormProps {
  totalCuponsElegiveis: number | null;
}

interface CupomSorteado {
  id: number;
  num_nota: string;
  nome_cliente?: string | null;
}

export function SorteioForm({ totalCuponsElegiveis }: SorteioFormProps) {
  const [quantidade, setQuantidade] = useState<number>(1);
  const [isSorteando, setIsSorteando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cuponsSorteados, setCuponsSorteados] = useState<CupomSorteado[]>([]);

  // --- Estados para Animação ---
  const [cupomIdsAnimacao, setCupomIdsAnimacao] = useState<number[]>([]);
  const [displayCupom, setDisplayCupom] = useState<number | string>("---");
  const animacaoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mostrarAnimacao, setMostrarAnimacao] = useState<boolean>(false);
  // ---------------------------

  // Limpa o intervalo da animação quando o componente desmonta ou o sorteio termina
  useEffect(() => {
    return () => {
      if (animacaoIntervalRef.current) {
        clearInterval(animacaoIntervalRef.current);
      }
    };
  }, []);

  const iniciarAnimacao = (ids: number[]) => {
    if (ids.length === 0) {
      setDisplayCupom("N/A"); // Não há cupons para animar
      return;
    }
    setMostrarAnimacao(true);
    setDisplayCupom(ids[0]); // Começa mostrando o primeiro

    let index = 0;
    animacaoIntervalRef.current = setInterval(() => {
      index = (index + 1) % ids.length;
      setDisplayCupom(ids[index]);
    }, 75); // Intervalo rápido para efeito de rolagem
  };

  const pararAnimacao = () => {
    if (animacaoIntervalRef.current) {
      clearInterval(animacaoIntervalRef.current);
      animacaoIntervalRef.current = null;
    }
    // A exibição final será tratada após receber os resultados
  };

  const handleSorteio = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSorteando || !totalCuponsElegiveis) return;

    if (quantidade <= 0) {
      setError("A quantidade a sortear deve ser maior que zero.");
      return;
    }

    if (quantidade > totalCuponsElegiveis) {
      setError(
        `A quantidade (${quantidade}) é maior que o total de cupons elegíveis (${totalCuponsElegiveis}).`
      );
      return;
    }

    setIsSorteando(true);
    setError(null);
    setSuccessMessage(null);
    setCuponsSorteados([]);
    setMostrarAnimacao(false); // Reseta a animação anterior
    setDisplayCupom("Sorteando..."); // Feedback inicial

    try {
      // 1. Buscar IDs para a animação (não bloqueia o sorteio)
      getElegibleCuponsForAnimation().then(({ cupom_ids }) => {
        setCupomIdsAnimacao(cupom_ids);
        if (cupom_ids.length > 0) {
          iniciarAnimacao(cupom_ids);
        } else {
          // Se não houver cupons para animar, apenas mostra "Sorteando..."
          setMostrarAnimacao(true); // Mostra a área de animação mesmo assim
        }
      });

      // 2. Realizar o sorteio DE FATO
      const result = await realizarSorteioAction(quantidade);

      pararAnimacao(); // Para a animação visual

      if (result.success && result.cuponsSorteados) {
        setCuponsSorteados(result.cuponsSorteados);
        setSuccessMessage(
          `Sorteio de ${result.cuponsSorteados.length} cupom(ns) realizado com sucesso!`
        );
        // A animação visual para, e a tabela de resultados é mostrada.
        // O display da animação pode ser limpo ou mostrar "Concluído"
        setDisplayCupom("🎉");
      } else {
        setError(
          result.message || "Ocorreu um erro desconhecido durante o sorteio."
        );
        setDisplayCupom("Erro!"); // Indica erro na animação
      }
    } catch (err: any) {
      pararAnimacao();
      setError(err.message || "Erro inesperado ao tentar realizar o sorteio.");
      setDisplayCupom("Erro!");
    } finally {
      setIsSorteando(false);
      // Não resetamos mostrarAnimacao aqui para manter o último estado visual (cupom ou erro)
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSorteio}
        className="space-y-4 p-4 border rounded-lg"
      >
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="quantidade">Quantidade de Cupons a Sortear:</Label>
          <Input
            type="number"
            id="quantidade"
            name="quantidade"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(parseInt(e.target.value, 10) || 1)}
            required
            disabled={
              isSorteando ||
              totalCuponsElegiveis === null ||
              totalCuponsElegiveis === 0
            }
            className="w-full"
          />
        </div>
        <Button
          type="submit"
          disabled={
            isSorteando ||
            totalCuponsElegiveis === null ||
            totalCuponsElegiveis === 0
          }
          className="w-full sm:w-auto"
        >
          {isSorteando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sorteando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" /> Iniciar Sorteio
            </>
          )}
        </Button>
        {totalCuponsElegiveis === 0 && (
          <p className="text-sm text-muted-foreground">
            Não há cupons elegíveis para sortear.
          </p>
        )}
        {totalCuponsElegiveis === null && !isSorteando && (
          <p className="text-sm text-destructive">
            Não foi possível carregar a contagem de cupons.
          </p>
        )}
      </form>

      {/* Área da Animação */}
      {mostrarAnimacao && (
        <Card className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-gray-700 dark:text-gray-200">
              Cupom da Sorte
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 animate-pulse">
              {displayCupom}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagens de Feedback */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erro no Sorteio</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && !error && (
        <Alert variant="default">
          <Award className="h-4 w-4" />
          <AlertTitle>Sorteio Concluído!</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Resultados do Sorteio */}
      {cuponsSorteados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListChecks className="mr-2 h-5 w-5" /> Cupons Sorteados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Cupom</TableHead>
                  <TableHead>Nº Nota</TableHead>
                  <TableHead>Nome Cliente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuponsSorteados.map((cupom) => (
                  <TableRow key={cupom.id}>
                    <TableCell className="font-medium">{cupom.id}</TableCell>
                    <TableCell>{cupom.num_nota}</TableCell>
                    <TableCell>{cupom.nome_cliente || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
