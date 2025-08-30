"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils"; // Helper para classes condicionais (se estiver usando)
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Package,
  Award,
  Users,
  Settings,
  LogOut,
  ClipboardList,
  Building,
  Receipt,
  TicketPercent,
  LayoutDashboard,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logoutAction } from "@/app/auth/actions";
import Image from "next/image"; // Importar Image
import { useState, useEffect } from "react"; // Importar useState e useEffect

// Importar logo
import logoAtacadao from "@/img/logo_atacadao.png";

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/sorteio", label: "Realizar Sorteio", icon: Award },
  { href: "/admin/cupons", label: "Gerenciar Cupons", icon: TicketPercent },
  { href: "/admin/usuarios", label: "Gerenciar Usuários", icon: Users },
  { href: "/admin/clientes", label: "Gerenciar Clientes", icon: Building },
  { href: "/admin/notas-fiscais", label: "Gerenciar NFs", icon: Receipt },
  // { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

interface AdminSidebarProps {
  userIdentifier: string;
}

export function AdminSidebar({ userIdentifier }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Fecha o menu mobile ao navegar (corrigido com useEffect)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Botão Hamburger (visível apenas abaixo de sm) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:hidden">
        <Link
          href="/admin/dashboard" // Link para o dashboard ao clicar no logo
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Image
            src={logoAtacadao}
            alt="Logo Atacadão"
            className="h-8 w-auto object-contain"
          />
        </Link>
        <Button variant="outline" size="icon" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
          <span className="sr-only">Abrir/Fechar Menu</span>
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex-col border-r bg-background text-foreground transition-transform duration-300 ease-in-out",
          "w-64 sm:translate-x-0", // Largura padrão e visível a partir de sm
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full" // Controle de visibilidade mobile
        )}
      >
        <div className="flex items-center justify-between px-4 border-b h-auto">
          <Link href="/admin/dashboard" className="flex items-center">
            <Image
              src={logoAtacadao}
              alt="Logo Atacadão"
              className="object-contain w-36"
            />
          </Link>
          {/* Botão de fechar dentro da sidebar (visível apenas mobile quando aberta) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileMenu}
            className="sm:hidden"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar Menu</span>
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <nav className="grid items-start px-4 py-6 text-sm font-medium gap-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({
                    variant:
                      pathname === item.href ||
                      (item.href !== "/admin/dashboard" &&
                        pathname.startsWith(item.href))
                        ? "default"
                        : "ghost",
                  }),
                  "justify-start"
                )}
                onClick={() => isMobileMenuOpen && toggleMobileMenu()} // Fecha ao clicar no item
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </ScrollArea>
        <div className="mt-auto p-4 border-t">
          <Separator className="my-2" />
          <div className="flex items-center gap-2 mb-4">
            <UserCircle className="h-5 w-5 text-muted-foreground" />
            <span
              className="text-sm text-muted-foreground truncate"
              title={userIdentifier}
            >
              {userIdentifier}
            </span>
          </div>
          <form action={logoutAction}>
            <Button variant="ghost" className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
