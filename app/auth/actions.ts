"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function logoutAction() {
  const supabase = await createClient();

  // Invalida a sessão do usuário
  await supabase.auth.signOut();

  // Redireciona para a página de login
  return redirect("/login");
}
