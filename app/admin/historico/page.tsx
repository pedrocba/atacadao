import { Separator } from "@/components/ui/separator";

export default function AdminHistoricoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium">Histórico de Sorteios</h1>
        <p className="text-sm text-muted-foreground">
          Visualize os sorteios realizados anteriormente.
        </p>
      </div>
      <Separator />
      <div>
        {/* TODO: Implementar busca e exibição do histórico da tabela 'sorteios' */}
        <p className="text-muted-foreground">
          (Conteúdo do histórico de sorteios será exibido aqui)
        </p>
      </div>
    </div>
  );
}
