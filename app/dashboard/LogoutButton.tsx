"use client";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/auth/actions"; // Importar a action
import { LogOut } from "lucide-react"; // Ícone opcional

export function LogoutButton() {
  return (
    // Usar um formulário para chamar a Server Action
    <form action={logoutAction}>
      <Button variant="outline" size="sm" type="submit">
        <LogOut className="mr-2 h-4 w-4" /> {/* Ícone */}
        Sair
      </Button>
    </form>
  );
}
