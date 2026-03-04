import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Plus, CheckCircle, Clock, AlertTriangle, ChevronRight,
  Car, Calendar, DollarSign, Wrench, BarChart3, TrendingUp,
} from "lucide-react";

const PRIORIDADE_COLORS: Record<string, string> = {
  alta:   "bg-red-500/20 text-red-400 border-red-500/40",
  media:  "bg-amber-500/20 text-amber-400 border-amber-500/40",
  baixa:  "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

const PRIORIDADE_ICON: Record<string, React.ReactNode> = {
  alta:  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />,
  media: <Clock className="h-3.5 w-3.5 text-amber-400" />,
  baixa: <CheckCircle className="h-3.5 w-3.5 text-blue-400" />,
};

export default function AdminDashboard() {
  const utils = trpc.useUtils();

  // Pendências do dia (status = Pendente)
  const { data: pendenciasList = [], isLoading: loadingPend } =
    trpc.pendencias.list.useQuery({ status: "Pendente" });

  const updateStatus = trpc.pendencias.updateStatus.useMutation({
    onSuccess: () => {
      utils.pendencias.list.invalidate();
      toast.success("Pendência concluída!");
    },
  });

  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? pendenciasList : pendenciasList.slice(0, 5);

  // KPIs compactos para o header bar
  const { data: kpis } = trpc.dashboard.kpis.useQuery();
  const veiculosNoPatio = (kpis?.statusCounts ?? [])
    .filter((s: any) => !["Entregue", "Cancelado"].includes(s.status))
    .reduce((acc: number, s: any) => acc + Number(s.count), 0);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral em tempo real</p>
        </div>
        <Link href="/admin/nova-os">
          <Button className="gap-2"><Plus className="h-4 w-4" />Nova OS</Button>
        </Link>
      </div>

      {/* Barra de KPIs compacta — linha superior */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            href: "/admin/patio",
            label: "Veículos no Pátio",
            value: kpis ? veiculosNoPatio : "—",
            icon: Car,
            color: "text-primary border-primary/30",
          },
          {
            href: "/admin/agenda",
            label: "Agendamentos Hoje",
            value: kpis ? (kpis.agendamentosHoje ?? 0) : "—",
            icon: Calendar,
            color: "text-blue-400 border-blue-500/30",
          },
          {
            href: "/admin/financeiro",
            label: "Faturamento (Mês)",
            value: kpis
              ? `R$ ${((kpis.faturamentoMes ?? 0) / 1000).toFixed(0)}k`
              : "—",
            icon: DollarSign,
            color: "text-green-400 border-green-500/30",
          },
          {
            href: "/admin/os",
            label: "Entregas no Mês",
            value: kpis ? (kpis.entregasMes ?? 0) : "—",
            icon: Wrench,
            color: "text-amber-400 border-amber-500/30",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors cursor-pointer ${item.color}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${item.color.split(" ")[0]}`} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                  <p className={`text-lg font-bold leading-tight ${item.color.split(" ")[0]}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ─── Pendências do Dia ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h2 className="font-semibold text-sm">Pendências do dia</h2>
            {pendenciasList.length > 0 && (
              <Badge variant="outline" className="text-xs ml-1">
                {pendenciasList.length}
              </Badge>
            )}
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Ver menos" : "Ver todas"}
            <ChevronRight className={`h-3 w-3 transition-transform ${showAll ? "rotate-90" : ""}`} />
          </button>
        </div>

        {/* Lista */}
        <div className="divide-y divide-border">
          {loadingPend ? (
            <div className="px-5 py-4 text-sm text-muted-foreground">Carregando...</div>
          ) : displayed.length === 0 ? (
            <div className="px-5 py-4 text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Nenhuma pendência para hoje. Bom trabalho!
            </div>
          ) : (
            displayed.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors group"
              >
                {/* Prioridade ícone */}
                <div className="shrink-0">
                  {PRIORIDADE_ICON[p.prioridade ?? "media"]}
                </div>

                {/* Título + descrição */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.titulo}</p>
                  {p.descricao && (
                    <p className="text-xs text-muted-foreground truncate">{p.descricao}</p>
                  )}
                </div>

                {/* Badge prioridade */}
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${PRIORIDADE_COLORS[p.prioridade ?? "media"]}`}
                >
                  {p.prioridade ?? "média"}
                </Badge>

                {/* Botão concluir (aparece no hover) */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10 shrink-0"
                  onClick={() => updateStatus.mutate({ id: p.id, status: "Concluído" })}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Concluir
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
      {/* ─── 4 Cards de Acesso Rápido ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            href: "/admin/patio",
            label: "Operacional",
            desc: "Pátio e OS em andamento",
            icon: Wrench,
            accent: "from-primary/20 to-primary/5 border-primary/30 hover:border-primary/60",
            iconColor: "text-primary",
          },
          {
            href: "/admin/financeiro",
            label: "Financeiro",
            desc: "Faturamento e metas",
            icon: DollarSign,
            accent: "from-green-500/20 to-green-500/5 border-green-500/30 hover:border-green-500/60",
            iconColor: "text-green-400",
          },
          {
            href: "/admin/produtividade",
            label: "Produtividade",
            desc: "Ranking e performance",
            icon: BarChart3,
            accent: "from-blue-500/20 to-blue-500/5 border-blue-500/30 hover:border-blue-500/60",
            iconColor: "text-blue-400",
          },
          {
            href: "/admin/agenda",
            label: "Agenda do Dia",
            desc: "Agendamentos e visitas",
            icon: Calendar,
            accent: "from-amber-500/20 to-amber-500/5 border-amber-500/30 hover:border-amber-500/60",
            iconColor: "text-amber-400",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`relative flex flex-col gap-3 p-5 rounded-xl border bg-gradient-to-br cursor-pointer transition-all duration-200 hover:scale-[1.02] ${item.accent}`}
              >
                <div className={`w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground/50" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
