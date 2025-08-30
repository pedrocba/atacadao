"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { EditClienteForm } from "./EditClienteForm";

interface ClienteActionsProps {
  cliente: {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string | null;
  };
}

export function ClienteActions({ cliente }: ClienteActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifique os dados do cliente abaixo. Clique em salvar para aplicar
            as alterações.
            <br />
            <span className="font-mono mt-2 block">CNPJ: {cliente.cnpj}</span>
          </DialogDescription>
        </DialogHeader>
        <EditClienteForm
          cliente={cliente}
          onSuccess={() => setIsDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
