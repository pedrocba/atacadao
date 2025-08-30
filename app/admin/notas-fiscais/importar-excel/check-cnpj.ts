import { createClient } from "@/utils/supabase/server";

export async function checkCnpjExists(cnpj: string): Promise<boolean> {
  // Normaliza para string de 14 dígitos, só números
  const cnpjLimpo = String(cnpj).replace(/\D/g, "");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("cnpj")
    .eq("cnpj", cnpjLimpo)
    .maybeSingle();
  if (error) {
    console.error("Erro ao consultar clientes:", error);
    return false;
  }
  return !!data;
}
