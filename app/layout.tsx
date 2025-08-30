import { ThemeSwitcher } from "@/components/theme-switcher";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

// Importar Logos
import logoAtacadao from "@/img/logo_atacadao.png";
import logoTijuca from "@/img/logo_tijuca.png";
import logoRoskoff from "@/img/logo_roskoff.png";
import logoPapa from "@/img/logo_papa.png";
import logoBic from "@/img/logo_bic.png";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Atacadão Meio a Meio Campanha",
  description: "Participe da nossa campanha e concorra a prêmios!",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-h-screen flex flex-col items-center">
            <div className="flex flex-col gap-0 w-full">{children}</div>

            <footer className="w-full border-t mt-12 py-6">
              <div className="container mx-auto px-4 text-center">
                <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6 md:gap-x-16">
                  <Image
                    src={logoAtacadao}
                    alt="Logo Atacadão"
                    width={300}
                    height={90}
                    className="object-contain h-20 w-auto"
                  />
                  <Image
                    src={logoTijuca}
                    alt="Logo Tijuca"
                    width={300}
                    height={90}
                    className="object-contain h-20 w-auto"
                  />
                  <Image
                    src={logoRoskoff}
                    alt="Logo Roskoff"
                    width={200}
                    height={60}
                    className="object-contain h-16 w-auto"
                  />
                  <Image
                    src={logoPapa}
                    alt="Logo Papa"
                    width={200}
                    height={60}
                    className="object-contain h-16 w-auto"
                  />
                  <Image
                    src={logoBic}
                    alt="Logo Bic"
                    width={200}
                    height={60}
                    className="object-contain h-16 w-auto"
                  />
                </div>
              </div>
            </footer>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
