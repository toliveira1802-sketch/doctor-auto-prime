import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Car,
  CalendarClock,
  TrendingUp,
  Receipt,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Target,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "Diagnóstico": "#6366f1",
  "Orçamento": "#06b6d4",
  "Aguardando Aprovação": "#eab308",
  "Aguardando Peças": "#f97316",
  "Em Execução": "#22c55e",
  "Pronto": "#10b981",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const { data: operacional } = trpc.dashboard.operacional.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Wrench className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-foreground">Doctor Auto Prime</h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestão</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Plataforma de gestão automotiva premium. Faça login para acessar o painel de controle.
          </p>
          <Button size="lg" className="w-full" asChild>
            <a href={getLoginUrl()}>Entrar no Sistema</a>
          </Button>
        </div>
      </div>
    );
  }

  const metaPercent = kpis
    ? Math.min(100, Math.round((kpis.faturamentoMes / kpis.metaMensal) * 100))
    : 0;

  const projecaoDiaria = kpis && kpis.diasTrabalhados > 0
    ? (kpis.faturamentoMes / kpis.diasTrabalhados) * kpis.diasUteis
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Button asChild>
            <Link href="/os/nova">
              <Receipt className="w-4 h-4 mr-2" />
              Nova OS
            </Link>
          </Button>
        </div>

        {/* KPI Cards */}
        {kpisLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-5 h-24" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Car}
              label="Veículos no Pátio"
              value={String(kpis?.veiculosNoPatio ?? 0)}
              sub="em andamento"
              color="text-blue-400"
            />
            <KpiCard
              icon={CalendarClock}
              label="Agendamentos Hoje"
              value={String(kpis?.agendamentosHoje ?? 0)}
              sub="confirmados"
              color="text-yellow-400"
            />
            <KpiCard
              icon={TrendingUp}
              label="Faturamento Mês"
              value={formatCurrency(kpis?.faturamentoMes ?? 0)}
              sub={`Ticket médio: ${formatCurrency(kpis?.ticketMedio ?? 0)}`}
              color="text-green-400"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Entregues no Mês"
              value={String(kpis?.entreguesMes ?? 0)}
              sub="veículos entregues"
              color="text-emerald-400"
            />
          </div>
        )}

        {/* Meta Mensal */}
        {kpis && (
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Meta Mensal</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">{metaPercent}%</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatCurrency(kpis.faturamentoMes)} / {formatCurrency(kpis.metaMensal)}
                  </span>
                </div>
              </div>
              <Progress value={metaPercent} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Dias trabalhados: {kpis.diasTrabalhados}/{kpis.diasUteis}</span>
                {projecaoDiaria > 0 && (
                  <span className={projecaoDiaria >= kpis.metaMensal ? "text-green-400" : "text-yellow-400"}>
                    Projeção: {formatCurrency(projecaoDiaria)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operacional + Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status do Pátio */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground">Status do Pátio</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/patio">
                    Ver Kanban <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {operacional && operacional.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={operacional} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 10, fill: "oklch(0.60 0.01 240)" }}
                      tickFormatter={(v) => v.split(" ")[0]}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.01 240)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.16 0.01 240)",
                        border: "1px solid oklch(0.25 0.01 240)",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {operacional.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? "#6366f1"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum veículo no pátio
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atalhos */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/patio", icon: Car, label: "Pátio Kanban", desc: "Visualizar e mover veículos", color: "text-blue-400" },
                { href: "/os/nova", icon: Receipt, label: "Nova Ordem de Serviço", desc: "Abrir OS para novo veículo", color: "text-primary" },
                { href: "/agenda", icon: CalendarClock, label: "Agenda", desc: "Agendamentos do dia", color: "text-yellow-400" },
                { href: "/crm", icon: TrendingUp, label: "CRM / Clientes", desc: "Histórico e interações", color: "text-green-400" },
                { href: "/financeiro", icon: Target, label: "Financeiro", desc: "Faturamento e metas", color: "text-emerald-400" },
                { href: "/produtividade", icon: Wrench, label: "Produtividade", desc: "Ranking de mecânicos", color: "text-purple-400" },
              ].map(({ href, icon: Icon, label, desc, color }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group">
                    <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
