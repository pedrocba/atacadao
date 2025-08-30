"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cadastroAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from "next/link";

// Botão de submit interno
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Validando..." : "Cadastrar e Enviar Código"}
    </Button>
  );
}

const initialState = {
  message: null,
  error: false,
  validationErrors: undefined,
};

export function CadastroForm() {
  const [formState, formAction] = useActionState(cadastroAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {/* Mensagem de erro geral */}
      {formState?.message && !formState.validationErrors && (
        <Alert variant={formState.error ? "destructive" : "default"}>
          <Terminal className="h-4 w-4" />
          <AlertTitle>{formState.error ? "Erro" : "Info"}</AlertTitle>
          <AlertDescription>{formState.message}</AlertDescription>
        </Alert>
      )}

      {/* Campo CNPJ */}
      <div>
        <Label htmlFor="cnpj">CNPJ (apenas números)</Label>
        <Input
          id="cnpj"
          name="cnpj"
          type="text"
          inputMode="numeric"
          placeholder="12345678000199"
          required
          maxLength={14}
          className="mt-1"
          aria-describedby="cnpj-error"
        />
        {formState?.validationErrors?.cnpj && (
          <p id="cnpj-error" className="text-sm text-red-500 mt-1">
            {formState.validationErrors.cnpj}
          </p>
        )}
      </div>

      {/* Campo Nome Completo */}
      <div>
        <Label htmlFor="nome">Nome Completo do Responsável</Label>
        <Input
          id="nome"
          name="nome"
          type="text"
          placeholder="Seu Nome Completo"
          required
          className="mt-1"
          aria-describedby="nome-error"
        />
        {formState?.validationErrors?.nome && (
          <p id="nome-error" className="text-sm text-red-500 mt-1">
            {formState.validationErrors.nome}
          </p>
        )}
      </div>

      {/* Campo CPF */}
      <div>
        <Label htmlFor="cpf">CPF (apenas números)</Label>
        <Input
          id="cpf"
          name="cpf"
          type="text"
          inputMode="numeric"
          placeholder="11122233344"
          required
          maxLength={11}
          className="mt-1"
          aria-describedby="cpf-error"
        />
        {formState?.validationErrors?.cpf && (
          <p id="cpf-error" className="text-sm text-red-500 mt-1">
            {formState.validationErrors.cpf}
          </p>
        )}
      </div>

      {/* Campo WhatsApp */}
      <div>
        <Label htmlFor="whatsapp">WhatsApp (DDD + Número)</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          placeholder="11999998888"
          required
          className="mt-1"
          aria-describedby="whatsapp-error"
        />
        {formState?.validationErrors?.whatsapp && (
          <p id="whatsapp-error" className="text-sm text-red-500 mt-1">
            {formState.validationErrors.whatsapp}
          </p>
        )}
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="underline hover:text-primary">
          Faça login
        </Link>
      </p>
    </form>
  );
}
