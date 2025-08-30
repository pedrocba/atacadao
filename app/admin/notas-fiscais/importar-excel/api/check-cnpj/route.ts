import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  const { cnpj } = await req.json();
  const cnpjLimpo = String(cnpj).replace(/\D/g, "");
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("cnpj")
    .eq("cnpj", cnpjLimpo)
    .maybeSingle();
  return NextResponse.json({ exists: !!data });
}
