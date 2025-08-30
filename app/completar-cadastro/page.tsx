"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Building,
  UserCheck,
} from "lucide-react";
import {
  verificarClienteAction,
  completarCadastroAction,
  buscarClientePorCPFAction,
} from "@/app/cadastro/actions";

// Interfaces mantidas para clareza, embora CompleteCadastroResult possa ser simplificada
interface ClienteData {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
}
interface VerifyClientResult {
  success: boolean;
  message?: string;
  clienteData?: ClienteData | null;
}
interface CompleteCadastroResult {
  success: boolean;
  message?: string;
  redirectTo?: string;
  // validationErrors removido pois não há mais campos a validar aqui
}

// Botão de Submit com estado de pending
function SubmitButton({
  children,
  disabled,
  className,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className={className} disabled={disabled || pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
        </>
      ) : (
        children
      )}
    </Button>
  );
}

// Novo componente interno que usa useSearchParams
function CompletarCadastroContent() {
  const [documento, setDocumento] = useState("");
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<ClienteData | null>(null);
  const [errorMessageVerify, setErrorMessageVerify] = useState<string | null>(
    null
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneFromUrl = searchParams.get("phone");

  // Estado para a action de completar cadastro
  const initialStateComplete: CompleteCadastroResult = {
    success: false,
    message: undefined,
  };
  const [stateComplete, formActionComplete] = useActionState(
    completarCadastroAction,
    initialStateComplete
  );

  // Efeito para redirecionar após a action de completar
  useEffect(() => {
    if (stateComplete.success && typeof stateComplete.redirectTo === "string") {
      router.push(stateComplete.redirectTo);
    }
    // Erro geral da action completarCadastroAction será exibido
  }, [stateComplete, router]);

  // Máscara Dinâmica CPF/CNPJ
  const applyMask = (value: string): string => {
    const digits = value.replace(/\D/g, "");

    if (digits.length <= 11) {
      // Máscara CPF: 000.000.000-00
      return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3}\.\d{3}\.\d{3})(\d{1,2})$/, "$1-$2")
        .slice(0, 14);
    } else {
      // Máscara CNPJ: 00.000.000/0000-00
      return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
        .replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d{1,2})$/, "$1-$2")
        .slice(0, 18);
    }
  };

  const handleDocumentoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const maskedValue = applyMask(event.target.value);
    setDocumento(maskedValue);
    setVerificationResult(null);
    setErrorMessageVerify(null);
  };

  // Verificação (CPF ou CNPJ)
  const handleVerifyDocument = async () => {
    setIsLoadingVerify(true);
    setErrorMessageVerify(null);
    setVerificationResult(null);
    const cleanDocument = documento.replace(/\D/g, "");
    let result: VerifyClientResult = {
      success: false,
      message: "Documento inválido.",
    };

    if (cleanDocument.length === 11) {
      // É CPF
      result = await buscarClientePorCPFAction(cleanDocument);
    } else if (cleanDocument.length === 14) {
      // É CNPJ
      result = await verificarClienteAction(cleanDocument);
    } else {
      setErrorMessageVerify(
        "Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido."
      );
      setIsLoadingVerify(false);
      return;
    }

    if (result.success && result.clienteData) {
      setVerificationResult(result.clienteData);
    } else {
      setErrorMessageVerify(
        result.message || "Erro desconhecido na verificação."
      );
    }
    setIsLoadingVerify(false);
  };

  // Lógica de Habilitação do Botão Verificar
  const canVerify = () => {
    const cleanDocument = documento.replace(/\D/g, "");
    return cleanDocument.length === 11 || cleanDocument.length === 14;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        {" "}
        {/* Reduzido max-w para md */}
        <CardHeader>
          <CardTitle>Completar Cadastro</CardTitle>
          <CardDescription>
            {phoneFromUrl
              ? `Para vincular sua conta (associada ao telefone ${phoneFromUrl}), informe o CNPJ da sua empresa.`
              : "Para vincular sua conta, informe o CNPJ da sua empresa."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {" "}
          {/* Adicionado espaçamento */}
          {/* Seção de Verificação de CPF ou CNPJ */}
          <div className="space-y-4">
            <Label htmlFor="documento">CNPJ</Label>
            <div className="flex gap-2">
              <Input
                id="documento"
                name="documento-verify"
                value={documento}
                onChange={handleDocumentoChange}
                placeholder="00.000.000/0000-00"
                disabled={isLoadingVerify || !!verificationResult}
                className="flex-grow"
                aria-describedby="documento-error-verify"
                maxLength={18}
              />
              <Button
                onClick={handleVerifyDocument}
                disabled={
                  !canVerify() || isLoadingVerify || !!verificationResult
                }
                variant="outline"
              >
                {isLoadingVerify ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Building className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Verificar</span>
              </Button>
            </div>
            {errorMessageVerify && (
              <p id="documento-error-verify" className="text-sm text-red-500">
                {errorMessageVerify}
              </p>
            )}
          </div>
          {/* Resultado da Verificação e Botão Finalizar (aparece após sucesso) */}
          {verificationResult && (
            <form
              action={formActionComplete}
              className="space-y-4 pt-4 border-t"
            >
              <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center text-green-800 dark:text-green-300">
                    <CheckCircle className="mr-2 h-5 w-5" /> Cliente Vinculado
                    Encontrado!
                  </CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-400 pt-1">
                    Confirme os dados da empresa que será vinculada:
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-green-900 dark:text-green-200 space-y-1">
                  <p>
                    <strong>CNPJ:</strong> {applyMask(verificationResult.cnpj)}
                  </p>
                  <p>
                    <strong>Razão Social:</strong>{" "}
                    {verificationResult.razao_social}
                  </p>
                  {verificationResult.nome_fantasia && (
                    <p>
                      <strong>Nome Fantasia:</strong>{" "}
                      {verificationResult.nome_fantasia}
                    </p>
                  )}
                </CardContent>
              </Card>
              {/* Passa o CNPJ verificado para a action */}
              <input
                type="hidden"
                name="cnpj"
                value={verificationResult.cnpj}
              />
              {phoneFromUrl && (
                <input type="hidden" name="phone" value={phoneFromUrl} />
              )}
              {/* Mensagem de erro/sucesso da action completarCadastroAction */}
              {stateComplete.message && (
                <Alert
                  variant={stateComplete.success ? "default" : "destructive"}
                >
                  {stateComplete.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {stateComplete.success ? "Sucesso!" : "Erro!"}
                  </AlertTitle>
                  <AlertDescription>{stateComplete.message}</AlertDescription>
                </Alert>
              )}
              <SubmitButton className="w-full" disabled={stateComplete.success}>
                <UserCheck className="mr-2 h-4 w-4" />
                Finalizar Cadastro e Vincular Conta
              </SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente principal da página que envolve o conteúdo com Suspense
export default function CompletarCadastroPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CompletarCadastroContent />
    </Suspense>
  );
}

// Componente simples de fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  );
}
