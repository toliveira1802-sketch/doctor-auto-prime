import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  CalendarClock,
  Users,
  DollarSign,
  BarChart3,
  Plus,
  FileText,
  User,
  ArrowRight,
  Code2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pages = [
  {
    group: "Principal",
    color: "bg-blue-500/10 border-blue-500/20",
    badge: "bg-blue-500/20 text-blue-400",
    items: [
      {
        path: "/",
        label: "Dashboard",
        description: "KPIs principais: veículos no pátio, agendamentos, faturamento do mês, meta mensal com termômetro e gráfico de status do pátio.",
        icon: LayoutDashboard,
        status: "live",
      },
    ],
  },
  {
    group: "Operacional",
    color: "bg-emerald-500/10 border-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-400",
    items: [
      {
        path: "/patio",
        label: "Pátio Kanban",
        description: "Board Kanban com drag-and-drop. Colunas: Diagnóstico → Orçamento → Aguardando Aprovação → Aguardando Peças → Em Execução → Pronto.",
        icon: Car,
        status: "live",
      },
      {
        path: "/os",
        label: "Ordens de Serviço",
        description: "Lista completa de OS com filtros por status, consultor e busca por placa/cliente. Paginação e acesso rápido ao detalhe.",
        icon: ClipboardList,
        status: "live",
      },
      {
        path: "/os/nova",
        label: "Nova OS",
        description: "Fluxo de criação de OS: selecionar cliente existente ou criar novo, vincular veículo, definir serviço, mecânico e valor.",
        icon: Plus,
        status: "live",
      },
      {
        path: "/os/1",
        label: "Detalhe da OS",
        description: "Visualização completa de uma OS: dados do veículo/cliente, status atual, timeline de histórico de alterações, e atualização de status.",
        icon: FileText,
        status: "live",
        note: "Substitua /1 pelo ID de uma OS real",
      },
      {
        path: "/agenda",
        label: "Agenda",
        description: "Visualização de agendamentos por mecânico e horário. Criação rápida de novo agendamento com seleção de mecânico e serviço.",
        icon: CalendarClock,
        status: "live",
      },
      {
        path: "/crm",
        label: "CRM / Clientes",
        description: "Lista de clientes com busca, histórico de interações e acesso ao perfil completo. Registro de novas interações.",
        icon: Users,
        status: "live",
      },
      {
        path: "/crm/1",
        label: "Detalhe do Cliente",
        description: "Perfil completo: dados pessoais, veículos cadastrados, histórico de OS e timeline de interações CRM.",
        icon: User,
        status: "live",
        note: "Substitua /1 pelo ID de um cliente real",
      },
    ],
  },
  {
    group: "Gestão",
    color: "bg-purple-500/10 border-purple-500/20",
    badge: "bg-purple-500/20 text-purple-400",
    items: [
      {
        path: "/financeiro",
        label: "Dashboard Financeiro",
        description: "Faturamento mensal com gráfico de barras, mix de serviços (pizza), top 5 OS do mês, ticket médio e termômetro de meta.",
        icon: DollarSign,
        status: "live",
      },
      {
        path: "/produtividade",
        label: "Dashboard Produtividade",
        description: "Ranking de mecânicos por OS concluídas, metas semanais e mensais por mecânico, gráfico de distribuição de serviços.",
        icon: BarChart3,
        status: "live",
      },
    ],
  },
];

const statusColors: Record<string, string> = {
  live: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  wip: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  planned: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const statusLabels: Record<string, string> = {
  live: "Live",
  wip: "Em progresso",
  planned: "Planejado",
};

export default function Dev() {
  const [, setLocation] = useLocation();

  const totalPages = pages.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dev Navigator</h1>
            <p className="text-sm text-muted-foreground">Doctor Auto Prime — Mapa de Páginas</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Badge variant="outline" className="text-xs">
            {totalPages} páginas
          </Badge>
          <Badge variant="outline" className="text-xs">
            {pages.length} grupos
          </Badge>
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Onda 1 — Admin Panel
          </Badge>
        </div>
      </div>

      {/* Page Groups */}
      <div className="space-y-8">
        {pages.map((group) => (
          <div key={group.group}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${group.badge}`}>
                {group.group}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="grid gap-3">
              {group.items.map((page) => {
                const Icon = page.icon;
                return (
                  <div
                    key={page.path}
                    className={`rounded-xl border p-4 ${group.color} hover:border-primary/30 transition-all cursor-pointer group`}
                    onClick={() => setLocation(page.path)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-lg bg-background/50 border border-border/50 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{page.label}</span>
                            <code className="text-[10px] font-mono bg-background/60 border border-border/50 px-1.5 py-0.5 rounded text-muted-foreground">
                              {page.path}
                            </code>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusColors[page.status]}`}>
                              {statusLabels[page.status]}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {page.description}
                          </p>
                          {page.note && (
                            <p className="text-[11px] text-yellow-400/80 mt-1.5 flex items-center gap-1">
                              <span>⚠</span> {page.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(page.path);
                        }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>Doctor Auto Prime — Onda 1 Admin Panel</span>
        <span>Build: Wave 1 · Mar 2026</span>
      </div>
    </div>
  );
}
