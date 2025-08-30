import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SubmeterForm } from "./SubmeterForm"; // Importa o Client Component
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function SubmeterNotaFiscalPage() {
  // Proteção básica - verificar se usuário está logado
  // O middleware já faz isso, mas é uma boa prática redundante
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Link>
      </Button>
      <h1 className="text-2xl font-bold mb-6">
        Gerar Cupom a partir de Nota Fiscal
      </h1>
      <p className="text-muted-foreground mb-6 max-w-xl">
        Digite o número da nota fiscal emitida pela Okajima Distribuidora para
        gerar seu cupom. Certifique-se de que a nota fiscal pertence ao seu CNPJ
        cadastrado e ainda não gerou um cupom.
      </p>

      <SubmeterForm />
    </div>
  );
}
