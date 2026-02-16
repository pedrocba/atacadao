"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface SorteioResult {
  success: boolean;
  message?: string;
  cuponsSorteados?: {
    id: number;
    num_nota: string;
    nome_cliente?: string | null;
    razao_social?: string | null;
  }[];
}

// Função auxiliar para embaralhar um array (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;
  // Enquanto ainda houver elementos para embaralhar.
  while (currentIndex !== 0) {
    // Escolha um elemento restante.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // E troque-o pelo elemento atual.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

export async function getElegibleCuponsForAnimation(): Promise<{
  cupom_ids: number[];
}> {
  // MOCK DATA
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
  const mockIds = Array.from({ length: 200 }, (_, i) => i + 1);
  return { cupom_ids: mockIds };
}

/**
 * Realiza o sorteio de um número específico de cupons.
 * Lógica implementada diretamente em TypeScript.
 */

export async function realizarSorteioAction(
  quantidade: number
): Promise<SorteioResult> {
  if (quantidade <= 0) {
    return { success: false, message: "A quantidade deve ser maior que zero." };
  }

  // MOCK LOGIC - Simulate process
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate work

  // Generate random winners
  const cuponsSorteadosMock = [];
  const nomesMockados = [
    "SUPERMERCADO SILVA E CIA LTDA",
    "MERCADINHO DO JOAO",
    "PADARIA CENTRAL",
    "FARMACIA SAO JOSE",
    "ACOUGUE BOI NA BRASA",
    "DISTRIBUIDORA ALIANCA",
    "COMERCIAL SANTOS",
    "LOJA DE CONVENIENCIA EXPRESS"
  ];

  for (let i = 0; i < quantidade; i++) {
    const id = Math.floor(Math.random() * 500) + 1;
    cuponsSorteadosMock.push({
      id: id,
      num_nota: `NOTA-${id}-${Date.now()}`,
      nome_cliente: nomesMockados[Math.floor(Math.random() * nomesMockados.length)],
      razao_social: nomesMockados[Math.floor(Math.random() * nomesMockados.length)],
    });
  }

  // No revalidation needed for mock state on server, but UI will update.
  // revalidatePath("/admin/sorteio");

  return {
    success: true,
    message: `${cuponsSorteadosMock.length} cupom(ns) sorteado(s) com sucesso! (MOCK)`,
    cuponsSorteados: cuponsSorteadosMock,
  };
}
