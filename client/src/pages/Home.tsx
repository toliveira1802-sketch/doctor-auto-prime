import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  DollarSign,
  Loader2,
  Plus,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "Diagnóstico": "#f59e0b",
  "Orçamento": "#3b82f6",
  "Aguardando Aprovação": "#8b5cf6",
  "Aguardando Peças": "#ec4899",
  "Em Execução": "#10b981",
  "Controle de Qualidade": "#06b6d4",
  "Pronto": "#22c55e",
  "Aguardando Retirada": "#f97316",
  "Entregue": "#6b7280",
  "Cancelada": "#ef4444",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery();

  const statusData = (kpis?.statusCounts ?? []).map((s) => ({
    name: s.status,
    value: s.count,
    fill: STATUS_COLORS[s.status ?? ""] ?? "#6b7280",
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {user?.name?.split(" ")[0] ?? "Pitoco"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button onClick={() => navigate("/admin/nova-os")} className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Plus className="h-4 w-4" />
          Nova OS
        </Button>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Car className="h-4 w-4 text-amber-500" />
                Pátio Ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{kpis?.veiculosNoPatio ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">veículos em serviço</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{kpis?.agendamentosHoje ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">agendamentos</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(kpis?.faturamentoMes ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">este mês</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Entregas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{kpis?.entregasMes ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">este mês</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Meta Progress + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Meta do Mês */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Meta do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(kpis?.faturamentoMes ?? 0)}</div>
                <div className="text-xs text-muted-foreground">de {formatCurrency(kpis?.metaMes ?? 200000)}</div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${(kpis?.percentualMeta ?? 0) >= 100 ? "text-green-400" : (kpis?.percentualMeta ?? 0) >= 70 ? "text-amber-400" : "text-red-400"}`}>
                  {kpis?.percentualMeta ?? 0}%
                </div>
                <div className="text-xs text-muted-foreground">atingido</div>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${(kpis?.percentualMeta ?? 0) >= 100 ? "bg-green-500" : (kpis?.percentualMeta ?? 0) >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(kpis?.percentualMeta ?? 0, 100)}%` }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                Falta: {formatCurrency(Math.max(0, (kpis?.metaMes ?? 200000) - (kpis?.faturamentoMes ?? 0)))}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pátio por Status */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              Pátio por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum veículo no pátio</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={statusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Pátio", icon: Car, path: "/admin/patio", color: "text-amber-500" },
              { label: "Nova OS", icon: Plus, path: "/admin/nova-os", color: "text-green-400" },
              { label: "Agenda", icon: Calendar, path: "/admin/agendamentos", color: "text-blue-400" },
              { label: "Financeiro", icon: DollarSign, path: "/gestao/financeiro", color: "text-emerald-400" },
            ].map((item) => (
              <Button
                key={item.path}
                variant="outline"
                className="h-16 flex-col gap-2 border-border/50 hover:border-amber-500/50 hover:bg-amber-500/5"
                onClick={() => navigate(item.path)}
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-xs">{item.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
