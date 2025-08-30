import React from "react";
import { AdminSidebar } from "./AdminSidebar";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";

// Este layout garante que apenas admins logados vejam o conteúdo
// O middleware já faz a maior parte do trabalho, mas adiciona segurança
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Proteção dupla (middleware deve pegar primeiro, mas garante)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  // Não precisamos verificar o role aqui novamente se confiamos no middleware
  // Mas se quiséssemos:
  // const { data: userData } = await supabase.from('usuarios').select('role').eq('id', user.id).single();
  // if (userData?.role !== 'admin') {
  //     redirect('/app/dashboard'); // Redireciona não-admin
  // }

  // Preparar a informação do usuário para passar para a sidebar
  const userIdentifier = user.phone || user.email || "Usuário Logado"; // Usa telefone, fallback para email, depois genérico

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar userIdentifier={userIdentifier} />
      <div className="flex flex-col flex-1 sm:ml-64">
        <main className="flex-1">
          <div className="p-6">{children}</div>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
