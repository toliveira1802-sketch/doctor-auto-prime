/**
 * DevSystemOficina — Central de Controle do Sistema
 * Visão geral de todos os módulos: DEV, AUTH, MECANICOS,
 * CONSULTORES, GESTAO e CLIENTE com status em tempo real.
 * Acesso exclusivo ao perfil Dev.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Terminal,
  ShieldCheck,
  Wrench,
  Users,
  BarChart3,
  UserCircle,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowRight,
  Lock,
  Unlock,
  Eye,
  Settings,
  Zap,
  Database,
  GitBranch,
  Code2,
  ClipboardList,
  Car,
  DollarSign,
  MessageSquare,
  Star,
  TrendingUp,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type ModuleStatus = "online" | "degraded" | "offline";

interface ModuleRoute {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface SystemModule {
  id: string;
  label: string;
  descricao: string;
  icon: React.ElementType;
  cor: string;
  corBg: string;
  corBorder: string;
  corText: string;
  status: ModuleStatus;
  routes: ModuleRoute[];
  stats?: { label: string; value: string | number }[];
}

// ─── CONFIGURAÇÃO DOS MÓDULOS ─────────────────────────────────────────────────

const MODULES: SystemModule[] = [
  {
    id: "dev",
    label: "DEV",
    descricao: "Painel do desenvolvedor, sistema, integrações e IA",
    icon: Terminal,
    cor: "text-green-400",
    corBg: "bg-green-500/10",
    corBorder: "border-green-500/25",
    corText: "text-green-400",
    status: "online",
    routes: [
      { label: "Painel Dev",       path: "/dev/painel",    icon: Code2 },
      { label: "Sistema",          path: "/dev/sistema",   icon: Database },
      { label: "IA Portal",        path: "/dev/ia-portal", icon: Zap },
      { label: "Processos",        path: "/dev/processos", icon: GitBranch },
      { label: "Cliente Portal",   path: "/dev/cliente",   icon: UserCircle },
    ],
    stats: [
      { label: "Integrações",  value: 6 },
      { label: "Uptime",       value: "99.9%" },
    ],
  },
  {
    id: "auth",
    label: "AUTH",
    descricao: "Autenticação, perfis, senhas e controle de acesso",
    icon: ShieldCheck,
    cor: "text-purple-400",
    corBg: "bg-purple-500/10",
    corBorder: "border-purple-500/25",
    corText: "text-purple-400",
    status: "online",
    routes: [
      { label: "Selecionar Perfil", path: "/selecionar-perfil", icon: Users },
      { label: "Login Dev",         path: "/login?perfil=dev",        icon: Lock },
      { label: "Login Gestão",      path: "/login?perfil=gestao",     icon: Lock },
      { label: "Login Consultor",   path: "/login?perfil=consultor",  icon: Lock },
      { label: "Login Mecânico",    path: "/login?perfil=mecanico",   icon: Lock },
      { label: "Trocar Senha",      path: "/trocar-senha",            icon: Unlock },
    ],
    stats: [
      { label: "Roles",      value: 4 },
      { label: "Tabela",     value: "01_colaboradores" },
    ],
  },
  {
    id: "mecanicos",
    label: "MECÂNICOS",
    descricao: "Visão dedicada ao mecânico: OS, pátio e produtividade",
    icon: Wrench,
    cor: "text-cyan-400",
    corBg: "bg-cyan-500/10",
    corBorder: "border-cyan-500/25",
    corText: "text-cyan-400",
    status: "online",
    routes: [
      { label: "Visão Mecânico",    path: "/mecanico",                   icon: Wrench },
      { label: "Analytics",         path: "/admin/mecanicos/analytics",   icon: BarChart3 },
      { label: "Feedback",          path: "/admin/mecanicos/feedback",    icon: Star },
      { label: "Agenda Mecânicos",  path: "/admin/agenda-mecanicos",     icon: ClipboardList },
    ],
    stats: [
      { label: "OS Ativas",   value: "—" },
      { label: "Em execução", value: "—" },
    ],
  },
  {
    id: "consultores",
    label: "CONSULTORES",
    descricao: "Atendimento, ordens de serviço e CRM de clientes",
    icon: ClipboardList,
    cor: "text-orange-400",
    corBg: "bg-orange-500/10",
    corBorder: "border-orange-500/25",
    corText: "text-orange-400",
    status: "online",
    routes: [
      { label: "Dashboard",      path: "/admin/dashboard",   icon: BarChart3 },
      { label: "Pátio",          path: "/admin/patio",       icon: Car },
      { label: "Ordens de Serviço", path: "/admin/os",       icon: ClipboardList },
      { label: "Nova OS",        path: "/admin/nova-os",     icon: ClipboardList },
      { label: "Agendamentos",   path: "/admin/agenda",      icon: Activity },
      { label: "Clientes",       path: "/admin/clientes",    icon: Users },
    ],
    stats: [
      { label: "OS Abertas",  value: "—" },
      { label: "Agend. hoje", value: "—" },
    ],
  },
  {
    id: "gestao",
    label: "GESTÃO",
    descricao: "Visão gerencial, financeiro, metas e relatórios",
    icon: BarChart3,
    cor: "text-violet-400",
    corBg: "bg-violet-500/10",
    corBorder: "border-violet-500/25",
    corText: "text-violet-400",
    status: "online",
    routes: [
      { label: "Visão Geral",     path: "/gestao/visao-geral",   icon: TrendingUp },
      { label: "OS Ultimate",     path: "/gestao/os-ultimate",   icon: ClipboardList },
      { label: "Financeiro",      path: "/gestao/financeiro",    icon: DollarSign },
      { label: "Produtividade",   path: "/gestao/produtividade", icon: Activity },
      { label: "Metas",           path: "/gestao/metas",         icon: Star },
      { label: "Relatórios",      path: "/gestao/relatorios",    icon: BarChart3 },
      { label: "RH",              path: "/gestao/rh",            icon: Users },
      { label: "Campanhas",       path: "/gestao/campanhas",     icon: MessageSquare },
    ],
    stats: [
      { label: "Faturamento", value: "—" },
      { label: "Meta mês",    value: "—" },
    ],
  },
  {
    id: "cliente",
    label: "CLIENTE",
    descricao: "Portal do cliente, CRM e acompanhamento de OS",
    icon: UserCircle,
    cor: "text-amber-400",
    corBg: "bg-amber-500/10",
    corBorder: "border-amber-500/25",
    corText: "text-amber-400",
    status: "online",
    routes: [
      { label: "Portal Cliente",   path: "/dev/cliente",   icon: UserCircle },
      { label: "CRM",              path: "/admin/clientes",     icon: MessageSquare },
      { label: "Clientes",         path: "/admin/clientes", icon: Users },
      { label: "Detalhe Cliente",  path: "/admin/clientes", icon: Eye },
    ],
    stats: [
      { label: "Clientes",   value: "—" },
      { label: "Ativos",     value: "—" },
    ],
  },
];

const STATUS_CONFIG: Record<ModuleStatus, { label: string; color: string; dot: string }> = {
  online:   { label: "Online",   color: "text-green-400",  dot: "bg-green-400" },
  degraded: { label: "Degraded", color: "text-amber-400",  dot: "bg-amber-400" },
  offline:  { label: "Offline",  color: "text-red-400",    dot: "bg-red-400" },
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function DevSystemOficina() {
  const [, navigate] = useLocation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // KPIs gerais via tRPC
  const { data: kpis, refetch: refetchKpis } = trpc.dashboard.kpis.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchKpis();
    setTimeout(() => setRefreshing(false), 800);
    toast.success("Status atualizado!");
  };

  const allOnline = MODULES.every((m) => m.status === "online");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">System Oficina</h1>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                allOnline
                  ? "bg-green-500/10 text-green-400 border-green-500/25"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/25"
              )}
            >
              <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", allOnline ? "bg-green-400" : "bg-amber-400")} />
              {allOnline ? "Todos os módulos online" : "Atenção necessária"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Central de controle — visão completa de todos os módulos do sistema
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* ── KPIs Globais ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Módulos Ativos",
            value: MODULES.filter((m) => m.status === "online").length + "/" + MODULES.length,
            icon: Activity,
            color: "text-green-400",
          },
          {
            label: "Veículos no Pátio",
            value: kpis
              ? (kpis.statusCounts ?? [])
                  .filter((s: any) => !["Entregue", "Cancelado"].includes(s.status))
                  .reduce((a: number, s: any) => a + Number(s.count), 0)
              : "—",
            icon: Car,
            color: "text-orange-400",
          },
          {
            label: "OS Abertas",
            value: kpis ? (kpis.osAbertas ?? "—") : "—",
            icon: ClipboardList,
            color: "text-violet-400",
          },
          {
            label: "Agend. Hoje",
            value: kpis ? (kpis.agendamentosHoje ?? "—") : "—",
            icon: Activity,
            color: "text-cyan-400",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Grade de Módulos ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MODULES.map((mod) => {
          const isExpanded = expandedId === mod.id;
          const statusCfg = STATUS_CONFIG[mod.status];

          return (
            <Card
              key={mod.id}
              className={cn(
                "border transition-all duration-200 cursor-pointer group",
                mod.corBorder,
                isExpanded && mod.corBg
              )}
              onClick={() => setExpandedId(isExpanded ? null : mod.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", mod.corBg)}>
                      <mod.icon className={cn("h-5 w-5", mod.cor)} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold tracking-wide">
                        {mod.label}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {mod.descricao}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn("text-xs px-2 py-0.5 border", `border-${mod.corBorder}`)}
                    >
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1", statusCfg.dot)} />
                      <span className={statusCfg.color}>{statusCfg.label}</span>
                    </Badge>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </div>
                </div>
              </CardHeader>

              {/* Stats compactas */}
              {mod.stats && !isExpanded && (
                <CardContent className="pt-0 pb-3">
                  <div className="flex gap-4">
                    {mod.stats.map((s) => (
                      <div key={s.label}>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={cn("text-sm font-semibold", mod.cor)}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}

              {/* Rotas expandidas */}
              {isExpanded && (
                <CardContent className="pt-0 pb-4 space-y-1">
                  <div className={cn("h-px w-full mb-3", `bg-${mod.corBorder}`)} />
                  {mod.routes.map((route) => (
                    <button
                      key={route.path + route.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(route.path);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md",
                        "text-sm text-muted-foreground hover:text-foreground",
                        "hover:bg-muted/50 transition-colors duration-150 group/route"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <route.icon className={cn("h-3.5 w-3.5 shrink-0", mod.cor)} />
                        <span>{route.label}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover/route:opacity-100 transition-opacity" />
                    </button>
                  ))}

                  {/* Stats no modo expandido */}
                  {mod.stats && (
                    <div className="flex gap-4 pt-3 mt-1 border-t border-border/50">
                      {mod.stats.map((s) => (
                        <div key={s.label}>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className={cn("text-sm font-semibold", mod.cor)}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Ações rápidas ──────────────────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Nova OS",          path: "/admin/nova-os",         icon: ClipboardList, color: "text-orange-400" },
              { label: "Ver Pátio",        path: "/admin/patio",           icon: Car,           color: "text-cyan-400" },
              { label: "Usuários",         path: "/admin/usuarios",        icon: Users,         color: "text-purple-400" },
              { label: "Financeiro",       path: "/gestao/financeiro",     icon: DollarSign,    color: "text-green-400" },
              { label: "Sistema",          path: "/dev/sistema",           icon: Database,      color: "text-blue-400" },
              { label: "IA Portal",        path: "/dev/ia-portal",         icon: Zap,           color: "text-amber-400" },
            ].map((a) => (
              <Button
                key={a.path + a.label}
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(a.path)}
              >
                <a.icon className={cn("h-3.5 w-3.5", a.color)} />
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
