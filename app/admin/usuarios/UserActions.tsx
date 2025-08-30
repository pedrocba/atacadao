"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  UserCog,
  UserCheck,
  Trash2,
  Loader2,
} from "lucide-react";
import { updateUserRoleAction, deactivateUserAction } from "./actions";
import { toast } from "sonner";

interface UserActionsProps {
  userId: string;
  currentRole: "admin" | "cliente";
  performingAdminId?: string;
}

export function UserActions({
  userId,
  currentRole,
  performingAdminId,
}: UserActionsProps) {
  const [isPendingRole, setIsPendingRole] = useState(false);
  const [isPendingDeactivate, setIsPendingDeactivate] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isSelf = performingAdminId === userId;

  const handleRoleChange = async (newRole: "admin" | "cliente") => {
    if (newRole === currentRole) return;
    setIsPendingRole(true);
    try {
      const result = await updateUserRoleAction(userId, newRole);
      if (result.error)
        toast.error(result.message || "Falha ao atualizar role.");
      else toast.success(result.message || "Role atualizado!");
    } catch (error) {
      toast.error("Erro inesperado ao mudar role.");
    } finally {
      setIsPendingRole(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    setIsPendingDeactivate(true);
    setIsAlertOpen(false);
    try {
      const result = await deactivateUserAction(userId);
      if (result.error)
        toast.error(result.message || "Falha ao desativar usuário.");
      else toast.success(result.message || "Usuário desativado!");
    } catch (error) {
      toast.error("Erro inesperado ao desativar usuário.");
    } finally {
      setIsPendingDeactivate(false);
    }
  };

  const isPending = isPendingRole || isPendingDeactivate;

  return (
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
            <span className="sr-only">Abrir menu</span>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleRoleChange("admin")}
            disabled={currentRole === "admin" || isPending || isSelf}
            className="cursor-pointer"
          >
            <UserCog className="mr-2 h-4 w-4" />
            Tornar Admin
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleRoleChange("cliente")}
            disabled={currentRole === "cliente" || isPending || isSelf}
            className="cursor-pointer"
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Tornar Cliente
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              disabled={isPending || isSelf}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Desativar Usuário
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Desativação</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja desativar este usuário? Ele não poderá mais
            fazer login. Esta ação pode ser revertida por um administrador
            posteriormente (se implementado).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPendingDeactivate}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivateConfirm}
            disabled={isPendingDeactivate}
          >
            {isPendingDeactivate ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Confirmar Desativação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
