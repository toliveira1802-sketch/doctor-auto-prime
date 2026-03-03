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
  Settings,
  TrendingUp,
  Target,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pages = [
  {
    group: "Admin — Operacional",
    color: "bg-blue-500/10 border-blue-500/20",
    badge: "bg-blue-500/20 text-blue-400",
    items: [
      { path: "/admin/dashboard", label: "Dashboard Admin", description: "KPIs: veículos no pátio, agendamentos, faturamento e distribuição de status.", icon: LayoutDashboard, status: "live" },
      { path: "/admin/patio", label: "Pátio Kanban", description: "Board Kanban com colunas por status. Mover OS entre estágios.", icon: Car, status: "live" },
      { path: "/admin/os", label: "Ordens de Serviço", description: "Lista completa de OS com filtros por status, busca por placa/cliente e paginação.", icon: ClipboardList, status: "live" },
      { path: "/admin/nova-os", label: "Nova OS", description: "Wizard multi-etapa: Cliente → Veículo → Serviços → Revisão.", icon: Plus, status: "live" },
      { path: "/admin/os/1", label: "Detalhe OS", description: "Detalhes completos, histórico, itens, mudança de status e observações.", icon: FileText, status: "live", note: "Substitua /1 pelo ID de uma OS real" },
      { path: "/admin/agenda", label: "Agenda", description: "Calendário de agendamentos por hora. Criar novo agendamento.", icon: CalendarClock, status: "live" },
      { path: "/admin/clientes", label: "Clientes", description: "Base de clientes com busca por nome, CPF, telefone.", icon: Users, status: "live" },
      { path: "/admin/clientes/1", label: "Detalhe Cliente", description: "Perfil completo: contato, veículos, histórico de OS e CRM.", icon: User, status: "live", note: "Substitua /1 pelo ID de um cliente real" },
    ],
  },
  {
    group: "Admin — Financeiro & Config",
    color: "bg-emerald-500/10 border-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-400",
    items: [
      { path: "/admin/financeiro", label: "Financeiro", description: "Faturamento mensal, % da meta, ticket médio, histórico 6 meses e mix de serviços.", icon: DollarSign, status: "live" },
      { path: "/admin/produtividade", label: "Produtividade", description: "Ranking de mecânicos por OS, gráfico de barras e indicadores de qualidade.", icon: BarChart3, status: "live" },
      { path: "/admin/configuracoes", label: "Configurações", description: "Metas financeiras, metas por consultor e dados da empresa.", icon: Settings, status: "live" },
    ],
  },
  {
    group: "Gestão — Dashboards Estratégicos",
    color: "bg-purple-500/10 border-purple-500/20",
    badge: "bg-purple-500/20 text-purple-400",
    items: [
      { path: "/gestao/visao-geral", label: "Visão Geral", description: "Painel estratégico com KPIs consolidados, histórico e top mecânicos.", icon: TrendingUp, status: "live" },
      { path: "/gestao/operacional", label: "Operacional", description: "OS ativas, prontas para entrega e aguardando aprovação em tempo real.", icon: Wrench, status: "live" },
      { path: "/gestao/financeiro", label: "Financeiro", description: "Análise financeira com faturamento vs meta, mix de serviços e top OS.", icon: DollarSign, status: "live" },
      { path: "/gestao/produtividade", label: "Produtividade", description: "Ranking completo de mecânicos com score de qualidade e análise por período.", icon: BarChart3, status: "live" },
      { path: "/gestao/colaboradores", label: "Colaboradores", description: "Equipe administrativa: consultores, recepcionistas e coordenadores.", icon: Users, status: "live" },
      { path: "/gestao/mecanicos", label: "Mecânicos", description: "Equipe técnica com grau, especialidade e score de qualidade.", icon: Wrench, status: "live" },
      { path: "/gestao/metas", label: "Metas", description: "Configuração e acompanhamento de metas financeiras e operacionais.", icon: Target, status: "live" },
      { path: "/gestao/relatorios", label: "Relatórios", description: "Relatórios gerenciais consolidados por período. Exportação em breve.", icon: FileText, status: "live" },
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
