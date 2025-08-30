import { createClient } from "@/utils/supabase/server";

export async function checkCnpjExistsAction(cnpj: string): Promise<boolean> {
  "use server";
  const cnpjLimpo = String(cnpj).replace(/\D/g, "");
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("cnpj")
    .eq("cnpj", cnpjLimpo)
    .maybeSingle();
  return !!data;
}
