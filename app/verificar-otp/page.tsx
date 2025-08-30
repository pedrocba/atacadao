"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useSearchParams, useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Suspense } from "react";
import { verifyOtpAction } from "./actions";
import Link from "next/link";

// Tipo para o estado de verificação de OTP
interface VerifyOtpState {
  message?: string | null;
  phone?: string;
}

// Botão de submit genérico com estado de pending
function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      {pending ? "Processando..." : children}
    </Button>
  );
}

// Componente do cliente principal
function VerifyOtpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get("phone");

  // Estado para o formulário de OTP
  const initialOtpState: VerifyOtpState = {
    message: null,
    phone: initialPhone || undefined,
  };
  const [otpState, otpFormAction] = useActionState<VerifyOtpState, FormData>(
    verifyOtpAction,
    initialOtpState
  );

  const [otp, setOtp] = React.useState("");

  // Efeito para redirecionar após sucesso do OTP
  React.useEffect(() => {
    if (otpState?.message === "Login bem-sucedido.") {
      console.log(
        "[Verify OTP Page] Login bem-sucedido, redirecionando para /dashboard"
      );
      router.replace("/dashboard");
    }
  }, [otpState, router]);

  // Determina qual telefone usar (do estado ou inicial)
  const currentPhone = otpState?.phone || initialPhone;

  // --- Formulário Padrão para pedir OTP ---
  if (!currentPhone) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Erro</CardTitle>
          <CardDescription>
            Número de telefone não encontrado. Por favor, volte e tente
            novamente.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <a href="/login">Voltar para Login</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Verificar Código</CardTitle>
        <CardDescription>
          Insira o código de 6 dígitos enviado para {currentPhone}.
        </CardDescription>
      </CardHeader>
      <form action={otpFormAction}>
        <CardContent>
          <input type="hidden" name="phone" value={currentPhone} />
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
              name="otp"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {/* Exibir mensagem de status/erro do formulário de OTP */}
          {otpState?.message && (
            <p
              className={`text-sm mt-4 text-center ${
                otpState.message === "Login bem-sucedido."
                  ? "text-green-500"
                  : "text-red-500"
              }`}
              aria-live="polite"
            >
              {otpState.message}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <div className="w-full flex flex-col gap-3">
            <SubmitButton disabled={otp.length !== 6}>
              Verificar Código
            </SubmitButton>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Voltar ao Login</Link>
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

// Componente da página principal com Suspense
export default function VerifyOtpPage() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Suspense fallback={<div className="text-center">Carregando...</div>}>
        <VerifyOtpClient />
      </Suspense>
    </div>
  );
}
