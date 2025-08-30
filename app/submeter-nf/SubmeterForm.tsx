"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submeterNotaFiscalAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

// Botão de submit interno
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Validando e Gerando..." : "Gerar Cupom"}
    </Button>
  );
}

const initialState = {
  message: null,
  error: false,
  success: false,
};

export function SubmeterForm() {
  const [formState, formAction] = useActionState(
    submeterNotaFiscalAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Limpa o formulário em caso de sucesso
  useEffect(() => {
    if (formState.success && formRef.current) {
      formRef.current.reset(); // Limpa o input
    }
  }, [formState.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6 w-full">
      <div>
        <Label htmlFor="num_nota">Número da Nota Fiscal:</Label>
        <Input
          id="num_nota"
          name="num_nota"
          type="text" // Usar text para permitir diferentes formatos de NF
          placeholder="Digite o número completo da NF"
          required
          className="mt-1"
        />
        {/* <p className="text-sm text-muted-foreground mt-1">
             Ex: 000.000.123 ou 123456789...
         </p> */}
      </div>

      <SubmitButton />

      {/* Exibição de Mensagens de Feedback */}
      {formState?.message && (
        <Alert
          variant={
            formState.error
              ? "destructive"
              : formState.success
                ? "default"
                : "default"
          }
          className={formState.success ? "border-green-500" : ""} // Destaque verde para sucesso
        >
          <Terminal className="h-4 w-4" /> {/* Ícone genérico */}
          <AlertTitle>
            {formState.error ? "Erro" : formState.success ? "Sucesso" : "Info"}
          </AlertTitle>
          <AlertDescription>{formState.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
