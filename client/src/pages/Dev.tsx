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
  Zap,
  Map,
  Bot,
  GitBranch,
  Building,
  Briefcase,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TOUR_PAGES } from "@/components/PageTour";

const pages = [
  {
    group: "Admin — Operacional",
    color: "bg-blue-500/10 border-blue-500/20",
    badge: "bg-blue-500/20 text-blue-400",
    items: [
      { path: "/admin/dashboard", label: "Dashboard Admin", description: "KPIs: veículos no pátio, agendamentos, faturamento e distribuição de status.", icon: LayoutDashboard, status: "live" },
      { path: "/admin/operacional", label: "Operacional", description: "OS ativas em tempo real, alerta de atrasos, prontas para entrega.", icon: Wrench, status: "live" },
      { path: "/admin/patio", label: "Pátio Kanban + Mapa", description: "Board Kanban com drag-and-drop + Mapa visual das vagas da oficina.", icon: Car, status: "live" },
      { path: "/admin/nova-os", label: "Nova OS", description: "Wizard multi-etapa: Cliente → Veículo → Serviços → Revisão.", icon: Plus, status: "live" },
      { path: "/admin/os", label: "Ordens de Serviço", description: "Lista completa de OS com filtros por status, busca por placa/cliente.", icon: ClipboardList, status: "live" },
      { path: "/admin/os/1", label: "Detalhe OS", description: "Detalhes completos, histórico, itens, mudança de status, fotos & vídeos.", icon: FileText, status: "live", note: "Substitua /1 pelo ID de uma OS real" },
      { path: "/admin/agenda", label: "Agenda", description: "Calendário de agendamentos por hora.", icon: CalendarClock, status: "live" },
      { path: "/admin/agenda-mecanicos", label: "Agenda Mecânicos", description: "Visualização de carga por mecânico e agendamentos do dia.", icon: CalendarClock, status: "live" },
      { path: "/admin/clientes", label: "Clientes (CRM)", description: "Base de clientes com busca por nome, CPF, telefone.", icon: Users, status: "live" },
      { path: "/admin/clientes/1", label: "Detalhe Cliente", description: "Perfil completo: contato, veículos, histórico de OS e CRM.", icon: User, status: "live", note: "Substitua /1 pelo ID de um cliente real" },
    ],
  },
  {
    group: "Admin — Config & Análises",
    color: "bg-emerald-500/10 border-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-400",
    items: [
      { path: "/admin/financeiro", label: "Financeiro", description: "Faturamento mensal, % da meta, ticket médio, histórico 6 meses e mix de serviços.", icon: DollarSign, status: "live" },
      { path: "/admin/produtividade", label: "Produtividade", description: "Ranking de mecânicos por OS, gráfico de barras e indicadores de qualidade.", icon: BarChart3, status: "live" },
      { path: "/admin/configuracoes", label: "Configurações", description: "Metas financeiras, metas por consultor e dados da empresa.", icon: Settings, status: "live" },
      { path: "/admin/usuarios", label: "Usuários", description: "Gerenciamento de usuários: criar, editar, desativar, resetar senha.", icon: Users, status: "live" },
      { path: "/admin/mecanicos/analytics", label: "Analytics Mecânicos", description: "Análise detalhada de desempenho por mecânico.", icon: BarChart3, status: "live" },
      { path: "/admin/mecanicos/feedback", label: "Feedback Mecânicos", description: "Feedback e avaliações dos mecânicos.", icon: Wrench, status: "live" },
      { path: "/admin/integracoes", label: "Integrações", description: "Status das integrações externas (Kommo, Trello, WhatsApp).", icon: Zap, status: "live" },
      { path: "/admin/trello-migracao", label: "Trello Migração", description: "Board Trello, stats de cards e geração de planilha XLSX.", icon: GitBranch, status: "live" },
      { path: "/admin/ia-qg", label: "QG das IAs", description: "Painel central dos agentes IA: Ana, Reativação, Lead Scoring.", icon: Bot, status: "live" },
    ],
  },
  {
    group: "Gestão — Estratégico",
    color: "bg-purple-500/10 border-purple-500/20",
    badge: "bg-purple-500/20 text-purple-400",
    items: [
      { path: "/gestao/os-ultimate", label: "OS Ultimate", description: "Painel gerencial completo: funil, KPIs, ranking mecânicos, alertas.", icon: TrendingUp, status: "live" },
      { path: "/gestao/visao-geral", label: "Visão Geral", description: "KPIs consolidados, histórico e top mecânicos.", icon: LayoutDashboard, status: "live" },
      { path: "/gestao/operacional", label: "Operacional", description: "OS ativas em tempo real, prontas para entrega e aguardando aprovação.", icon: Wrench, status: "live" },
      { path: "/gestao/financeiro", label: "Financeiro", description: "Análise financeira com faturamento vs meta, mix de serviços.", icon: DollarSign, status: "live" },
      { path: "/gestao/produtividade", label: "Produtividade", description: "Ranking completo de mecânicos com score de qualidade.", icon: BarChart3, status: "live" },
      { path: "/gestao/metas", label: "Metas", description: "Configuração e acompanhamento de metas financeiras e operacionais.", icon: Target, status: "live" },
      { path: "/gestao/relatorios", label: "Relatórios", description: "Relatórios gerenciais consolidados por período.", icon: FileText, status: "live" },
      { path: "/gestao/campanhas", label: "Campanhas", description: "ROI por canal, funil de conversão lead → OS, insights automáticos.", icon: TrendingUp, status: "live" },
      { path: "/gestao/melhorias", label: "Melhorias", description: "Board de sugestões com votos, status e categorias.", icon: Zap, status: "live" },
    ],
  },
  {
    group: "Gestão — Equipe",
    color: "bg-orange-500/10 border-orange-500/20",
    badge: "bg-orange-500/20 text-orange-400",
    items: [
      { path: "/gestao/colaboradores", label: "Colaboradores", description: "Equipe administrativa: consultores, recepcionistas, coordenadores.", icon: Users, status: "live" },
      { path: "/gestao/mecanicos", label: "Mecânicos", description: "Equipe técnica com grau, especialidade e score de qualidade.", icon: Wrench, status: "live" },
      { path: "/gestao/rh", label: "RH", description: "Score por mecânico, ranking de performance, equipe administrativa.", icon: Briefcase, status: "live" },
      { path: "/gestao/operacoes", label: "Operações", description: "Distribuição OS por status, carga por mecânico, agendamentos.", icon: Building, status: "live" },
      { path: "/gestao/tecnologia", label: "Tecnologia", description: "Status de integrações, stack tecnológico, roadmap 2026-2028.", icon: Code2, status: "live" },
    ],
  },
  {
    group: "Auth & Mecânico",
    color: "bg-yellow-500/10 border-yellow-500/20",
    badge: "bg-yellow-500/20 text-yellow-400",
    items: [
      { path: "/selecionar-perfil", label: "Selecionar Perfil", description: "Tela de login: 5 roles — Dev, Gestão, Consultor, Mecânico, Cliente.", icon: User, status: "live" },
      { path: "/mecanico", label: "Visão Mecânico", description: "Interface simplificada para mecânicos: OS do dia, status, ações.", icon: Wrench, status: "live" },
    ],
  },
  {
    group: "Dev",
    color: "bg-zinc-500/10 border-zinc-500/20",
    badge: "bg-zinc-500/20 text-zinc-400",
    items: [
      { path: "/dev/painel", label: "Painel DEV", description: "Logs, usuários, controle de acesso, visibilidade por role.", icon: Code2, status: "live" },
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

  const startTour = () => {
    localStorage.setItem("dap_tour_active", "1");
    window.dispatchEvent(new Event("dap_tour_start"));
    setLocation(TOUR_PAGES[0].path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dev Navigator</h1>
              <p className="text-sm text-muted-foreground">Doctor Auto Prime — Mapa de Páginas</p>
            </div>
          </div>

          <Button onClick={startTour} className="gap-2">
            <Play className="h-4 w-4" />
            Iniciar Tour (← →)
          </Button>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Badge variant="outline" className="text-xs">
            {totalPages} páginas
          </Badge>
          <Badge variant="outline" className="text-xs">
            {pages.length} grupos
          </Badge>
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Wave 1+2 — Live
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Map className="h-3.5 w-3.5" />
            Ou clique no botão <span className="font-mono bg-muted px-1 rounded">🗺</span> no canto inferior direito
          </div>
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
                const tourIdx = TOUR_PAGES.findIndex((p) => p.path === page.path);
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
                            {tourIdx >= 0 && (
                              <span className="text-[10px] text-zinc-500">
                                #{tourIdx + 1}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {page.description}
                          </p>
                          {(page as any).note && (
                            <p className="text-[11px] text-yellow-400/80 mt-1.5 flex items-center gap-1">
                              <span>⚠</span> {(page as any).note}
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
        <span>Doctor Auto Prime — Wave 1 + 2</span>
        <span>Build: Mar 2026 · {totalPages} páginas</span>
      </div>
    </div>
  );
}
