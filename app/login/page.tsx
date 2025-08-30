"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFormStatus } from "react-dom";
import { useActionState, useState } from "react";
import { loginWithWhatsApp } from "./actions";
import Link from "next/link";
import { Smartphone } from "lucide-react";

// Import Logos
import logoAtacadao from "@/img/logo_atacadao.png";
import logoTijuca from "@/img/logo_tijuca.png";
import logoRoskoff from "@/img/logo_roskoff.png";
import logoPapa from "@/img/logo_papa.png";
import logoBic from "@/img/logo_bic.png";

const initialState = {
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      aria-disabled={pending}
      disabled={pending}
      className="w-full bg-primary hover:bg-primary/90 transition-colors"
    >
      {pending ? "Enviando..." : "Enviar Código"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginWithWhatsApp, initialState);
  const [whatsapp, setWhatsapp] = useState("");

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) {
      let formattedValue = value;
      if (value.length > 2) {
        formattedValue = `(${value.slice(0, 2)}) ${value.slice(2)}`;
      }
      if (value.length > 7) {
        formattedValue = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
      }
      setWhatsapp(formattedValue);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Logo Section Start */}
      <div className="mb-8 w-full max-w-lg text-center">
        {/* Main Sponsors */}
        <div className="flex justify-center items-center gap-5 md:gap-5">
          <Image
            src={logoAtacadao}
            alt="Logo Atacadão"
            className="object-contain w-36"
          />
          <Image
            src={logoTijuca}
            alt="Logo Tijuca"
            className="object-contain w-36"
          />
        </div>
      </div>
      {/* Logo Section End */}

      {/* Login Card Section */}
      <div className="w-full max-w-md">
        <Card className="w-full shadow-lg">
          <form action={formAction}>
            <CardContent className="grid gap-4 p-6">
              <div className="grid gap-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  placeholder="(XX) XXXXX-XXXX"
                  required
                  autoComplete="tel"
                  className="h-10"
                  maxLength={15}
                />
              </div>
              {state?.message && (
                <p
                  aria-live="polite"
                  className="text-sm text-red-500 text-center"
                >
                  {state.message}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <SubmitButton />
            </CardFooter>
          </form>
        </Card>

        {/* Smaller Sponsors Section Start */}
        <div className="mt-8 w-full text-center">
          <div className="flex justify-center items-center gap-8 md:gap-10">
            <Image
              src={logoRoskoff}
              alt="Logo Roskoff"
              className="object-contain w-28"
            />
            <Image
              src={logoPapa}
              alt="Logo Papa"
              className="object-contain w-28"
            />
            <Image
              src={logoBic}
              alt="Logo Bic"
              className="object-contain w-28"
            />
          </div>
        </div>
        {/* Smaller Sponsors Section End */}
      </div>
    </div>
  );
}
