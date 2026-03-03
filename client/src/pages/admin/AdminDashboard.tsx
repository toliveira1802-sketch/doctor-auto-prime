import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Car, Calendar, DollarSign, CheckCircle, TrendingUp, TrendingDown,
  Plus, ArrowRight, Wrench, Clock, AlertCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "Diagnóstico": "#f59e0b",
  "Orçamento": "#3b82f6",
  "Aguardando Aprovação": "#8b5cf6",
  "Aprovado": "#06b6d4",
  "Em Execução": "#f97316",
  "Aguardando Peça": "#ef4444",
  "Pronto": "#22c55e",
  "Entregue": "#6b7280",
  "Cancelado": "#dc2626",
};

export default function AdminDashboard() {
  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery();

  const statusData = kpis?.statusCounts?.map((s: any) => ({
    name: s.status,
    value: Number(s.count),
    color: STATUS_COLORS[s.status] ?? "#6b7280",
  })) ?? [];

  const totalAtivos = statusData.filter((s: any) => s.name !== "Entregue" && s.name !== "Cancelado").reduce((acc: number, s: any) => acc + s.value, 0);

  const metaPerc = kpis?.metaMes ? Math.min(100, Math.round(((kpis.faturamentoMes ?? 0) / kpis.metaMes) * 100)) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Operacional</h1>
          <p className="text-muted-foreground text-sm">Visão geral em tempo real</p>
        </div>
        <Link href="/admin/nova-os">
          <Button className="gap-2"><Plus className="h-4 w-4" />Nova OS</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Veículos no Pátio</span>
              <Car className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">{isLoading ? "—" : totalAtivos}</div>
            <p className="text-xs text-muted-foreground mt-1">OS ativas</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Agendamentos Hoje</span>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{isLoading ? "—" : (kpis?.agendamentosHoje ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">confirmados</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Faturamento do Mês</span>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold">
              {isLoading ? "—" : `R$ ${(kpis?.faturamentoMes ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Meta: R$ {(kpis?.metaMes ?? 0).toLocaleString("pt-BR")}</span>
                <span>{metaPerc}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${metaPerc}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Entregas no Mês</span>
              <CheckCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold">{isLoading ? "—" : (kpis?.entregasMes ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">OS entregues</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" />Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Nenhuma OS ativa</div>
            ) : (
              <div className="flex gap-4 items-center">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {statusData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [v, "OS"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {statusData.map((s: any) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-muted-foreground truncate max-w-[120px]">{s.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs h-5">{s.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />OS por Status (Barras)</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Nenhuma OS ativa</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={statusData} margin={{ left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="OS" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: "/admin/patio", label: "Ver Pátio", icon: Car, color: "text-primary" },
          { href: "/admin/ordens-servico", label: "Todas as OS", icon: Wrench, color: "text-blue-500" },
          { href: "/admin/agendamentos", label: "Agendamentos", icon: Calendar, color: "text-amber-500" },
          { href: "/admin/financeiro", label: "Financeiro", icon: DollarSign, color: "text-green-500" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
