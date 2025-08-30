"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { updateClienteAction, type ClienteFormState } from "./actions";

interface EditClienteFormProps {
  cliente: {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string | null;
  };
  onSuccess?: () => void; // Função para fechar o modal em caso de sucesso
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Salvar Alterações
    </Button>
  );
}

export function EditClienteForm({ cliente, onSuccess }: EditClienteFormProps) {
  const initialState: ClienteFormState = { message: null, success: false };
  const [state, dispatch] = useActionState(updateClienteAction, initialState);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        onSuccess?.(); // Chama a função para fechar o modal
      } else {
        toast.error(state.message, {
          description: state.errors?.general?.join(", "),
        });
      }
    }
  }, [state, onSuccess]);

  return (
    <form action={dispatch} className="space-y-4">
      {/* Campo CNPJ oculto para enviar junto ao action */}
      <input type="hidden" name="cnpj" value={cliente.cnpj} />

      <div>
        <Label htmlFor="razao_social">Razão Social</Label>
        <Input
          id="razao_social"
          name="razao_social"
          defaultValue={cliente.razao_social}
          required
          aria-describedby="razao_social-error"
        />
        {state.errors?.razao_social && (
          <p id="razao_social-error" className="text-sm text-red-500 mt-1">
            {state.errors.razao_social.join(", ")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
        <Input
          id="nome_fantasia"
          name="nome_fantasia"
          defaultValue={cliente.nome_fantasia ?? ""}
          aria-describedby="nome_fantasia-error"
        />
        {state.errors?.nome_fantasia && (
          <p id="nome_fantasia-error" className="text-sm text-red-500 mt-1">
            {state.errors.nome_fantasia.join(", ")}
          </p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
