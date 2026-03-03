import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Clock, AlertTriangle, CheckCircle, Wrench, ExternalLink } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Agendado": "bg-slate-500/20 text-slate-400",
  "Aguardando Entrada": "bg-blue-500/20 text-blue-400",
  "Diagnóstico": "bg-amber-500/20 text-amber-400",
  "Orçamento": "bg-orange-500/20 text-orange-400",
  "Aguardando Aprovação": "bg-yellow-500/20 text-yellow-400",
  "Em Execução": "bg-purple-500/20 text-purple-400",
  "Pronto": "bg-green-500/20 text-green-400",
  "Entregue": "bg-muted text-muted-foreground",
  "Cancelado": "bg-red-500/20 text-red-400",
};

export default function GestaoOperacional() {
  const [, navigate] = useLocation();
  const { data: osList, isLoading } = trpc.os.list.useQuery({ limit: 50 });
  const { data: kpis } = trpc.dashboard.kpis.useQuery(undefined);

  const k = kpis as any;
  const rawItems: any[] = (osList as any)?.items ?? [];
  const os = rawItems.map((r: any) => ({
    ...r.os,
    nomeCliente: r.cliente?.nomeCompleto,
    nomeMecanico: r.mecanico?.nome,
  }));

  const ativos = os.filter((o: any) => !["Entregue", "Cancelado"].includes(o.status));
  const prontos = os.filter((o: any) => o.status === "Pronto");
  const aguardando = os.filter((o: any) => o.status === "Aguardando Aprovação");
  const execucao = os.filter((o: any) => o.status === "Em Execução");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operacional</h1>
          <p className="text-muted-foreground text-sm">Visão em tempo real do pátio e OS ativas</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/patio")}>
          <ExternalLink className="h-4 w-4 mr-2" />Ver Pátio Kanban
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">No Pátio</span>
              <Car className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold">{k?.veiculosNoPatio ?? ativos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Em Execução</span>
              <Wrench className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400">{execucao.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Aguard. Aprovação</span>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-yellow-400">{aguardando.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Prontos p/ Entrega</span>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{prontos.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* OS Ativas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">OS Ativas ({ativos.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground text-sm">Carregando...</div>
          ) : ativos.length === 0 ? (
            <div className="p-6 text-muted-foreground text-sm text-center">Nenhuma OS ativa</div>
          ) : (
            <div className="divide-y divide-border">
              {ativos.map((o: any) => (
                <div key={o.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/os/${o.id}`)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{o.numeroOs}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground"}`}>{o.status}</Badge>
                    </div>
                    <div className="text-sm font-medium mt-0.5">{o.nomeCliente ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.placa} · {o.motivoVisita ?? "—"}</div>
                  </div>
                  <div className="text-right">
                    {o.nomeMecanico && <div className="text-xs text-muted-foreground">{o.nomeMecanico}</div>}
                    {(o.valorTotalOs ?? 0) > 0 && (
                      <div className="text-sm font-bold text-green-400">
                        R$ {Number(o.valorTotalOs).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
