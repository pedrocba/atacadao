import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CadastroForm } from "./CadastroForm"; // Importa o Client Component
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function CadastroPage() {
  // Redireciona se já estiver logado
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/app/dashboard"); // Ou para onde fizer sentido
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para se cadastrar. O CNPJ deve ser
            participante da campanha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CadastroForm />
        </CardContent>
      </Card>
    </div>
  );
}
