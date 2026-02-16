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
  razao_social?: string | null;
}

export function SorteioForm({ totalCuponsElegiveis }: SorteioFormProps) {
  const [quantidade, setQuantidade] = useState<number>(1);
  const [isSorteando, setIsSorteando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cuponsSorteados, setCuponsSorteados] = useState<CupomSorteado[]>([]);

  // Estados apenas para animação estética
  const [displayCupom, setDisplayCupom] = useState<number | string>("---");
  const [animationIds, setAnimationIds] = useState<number[]>([]);
  const animacaoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mostrarAnimacao, setMostrarAnimacao] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (animacaoIntervalRef.current) clearInterval(animacaoIntervalRef.current);
    };
  }, []);

  const startAestheticAnimation = (ids: number[]) => {
    if (ids.length === 0) return;
    setMostrarAnimacao(true);
    let index = 0;
    animacaoIntervalRef.current = setInterval(() => {
      index = (index + 1) % ids.length;
      setDisplayCupom(ids[index]);
    }, 80);
  };

  const stopAnimation = () => {
    if (animacaoIntervalRef.current) {
      clearInterval(animacaoIntervalRef.current);
      animacaoIntervalRef.current = null;
    }
  };

  const handleSorteio = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSorteando) return;

    // Reset de estado
    setIsSorteando(true);
    setError(null);
    setCuponsSorteados([]);
    setDisplayCupom("SORTEANDO...");

    try {
      // 1. Iniciar animação visual (apenas para efeito)
      const { cupom_ids } = await getElegibleCuponsForAnimation();
      if (cupom_ids.length > 0) {
        setAnimationIds(cupom_ids);
        startAestheticAnimation(cupom_ids);
      }

      // 2. Chamar lógica REAL do servidor
      // NENHUMA decisão de ganhador é feita aqui no frontend.
      const result = await realizarSorteioAction(quantidade);

      stopAnimation();

      if (result.success && result.cuponsSorteados) {
        // Dados reais vindos do servidor
        setCuponsSorteados(result.cuponsSorteados);
        setDisplayCupom("🎉");
      } else {
        setError(result.message || "Erro inesperado ao realizar sorteio.");
        setDisplayCupom("ERRO");
      }
    } catch (err: any) {
      stopAnimation();
      setError(err.message || "Falha na conexão com o servidor.");
      setDisplayCupom("FALHA");
    } finally {
      setIsSorteando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Painel de Sorteio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSorteio} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade de ganhadores:</Label>
              <Input
                type="number"
                id="quantidade"
                min="1"
                max={50}
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isSorteando}
                className="max-w-[200px]"
              />
            </div>

            <Button
              type="submit"
              className="w-full md:w-auto h-12 px-8 text-lg font-bold bg-[#1e3a8a] transition-all hover:scale-105"
              disabled={isSorteando || totalCuponsElegiveis === 0}
            >
              {isSorteando ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5 fill-current" /> REALIZAR SORTEIO
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Visualizer (Aesthetic only) */}
      {(mostrarAnimacao || isSorteando) && (
        <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border-4 border-dashed border-blue-200">
          <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Escaneando Cupons</p>
          <div className="text-7xl font-black text-blue-900 tabular-nums">
            {displayCupom}
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <XCircle className="h-5 w-5" />
          <AlertTitle className="font-bold">Falha no Processamento</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Winner List (Real data from server only) */}
      {cuponsSorteados.length > 0 && (
        <Card className="border-green-200 bg-green-50/30 overflow-hidden">
          <CardHeader className="bg-green-100/50">
            <CardTitle className="flex items-center text-green-800">
              <Award className="mr-2 h-6 w-6" /> Resultado Oficial
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Cliente / Razão Social</TableHead>
                  <TableHead className="text-right">Nota Fiscal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuponsSorteados.map((cupom) => (
                  <TableRow key={cupom.id} className="hover:bg-green-100/30 transition-colors">
                    <TableCell className="font-black text-green-700">#{cupom.id}</TableCell>
                    <TableCell className="font-semibold uppercase">
                      {cupom.razao_social || cupom.nome_cliente || "NÃO IDENTIFICADO"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-gray-500">
                      {cupom.num_nota}
                    </TableCell>
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
