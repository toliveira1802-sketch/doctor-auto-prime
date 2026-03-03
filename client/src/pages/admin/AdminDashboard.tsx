import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Car, Calendar, DollarSign, CheckCircle, TrendingUp,
  Plus, ArrowRight, Wrench, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// Veículos ATIVOS no pátio = todas as OS que NÃO são Entregue/Cancelado
const PATIO_ATIVOS = ["Diagnóstico", "Orçamento", "Aguardando Aprovação", "Aprovado", "Em Execução", "Aguardando Peça", "Pronto", "Em Teste"];

const STATUS_COLORS: Record<string, string> = {
  "Diagnóstico": "#f59e0b",
  "Orçamento": "#3b82f6",
  "Aguardando Aprovação": "#8b5cf6",
  "Aprovado": "#06b6d4",
  "Em Execução": "#f97316",
  "Aguardando Peça": "#ef4444",
  "Pronto": "#22c55e",
  "Em Teste": "#a855f7",
  "Entregue": "#6b7280",
  "Cancelado": "#dc2626",
};

export default function AdminDashboard() {
  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery();

  // Apenas status do pátio ativo (exclui Entregue/Cancelado)
  const statusData = (kpis?.statusCounts ?? [])
    .filter((s: any) => PATIO_ATIVOS.includes(s.status))
    .map((s: any) => ({
      name: s.status,
      value: Number(s.count),
      color: STATUS_COLORS[s.status] ?? "#6b7280",
    }))
    .sort((a: any, b: any) => b.value - a.value); // maior gargalo primeiro

  // Veículos no pátio = soma dos status ativos
  const veiculosNoPatio = statusData.reduce((acc: number, s: any) => acc + s.value, 0);

  // Faturamento = OS fechadas no mês vigente (vem do backend)
  const faturamento = kpis?.faturamentoMes ?? 0;
  const metaMes = kpis?.metaMes ?? 200000;
  const metaPerc = metaMes > 0 ? Math.min(100, Math.round((faturamento / metaMes) * 100)) : 0;
  const metaColor = metaPerc >= 100 ? "bg-green-500" : metaPerc >= 70 ? "bg-amber-500" : "bg-red-500";
  const metaTextColor = metaPerc >= 100 ? "text-green-400" : metaPerc >= 70 ? "text-amber-400" : "text-red-400";

  const entregasMes = kpis?.entregasMes ?? 0;
  const agendamentosHoje = kpis?.agendamentosHoje ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
        {/* Veículos no Pátio — soma das fileiras ativas do Kanban */}
        <Link href="/admin/patio">
          <Card className="border-primary/20 hover:border-primary/50 cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Veículos no Pátio</span>
                <Car className="h-4 w-4 text-primary" />
              </div>
              <div className="text-3xl font-bold">{isLoading ? "—" : veiculosNoPatio}</div>
              <p className="text-xs text-muted-foreground mt-1">em diagnóstico → pronto</p>
            </CardContent>
          </Card>
        </Link>

        {/* Agendamentos Hoje */}
        <Link href="/admin/agenda">
          <Card className="border-blue-500/20 hover:border-blue-500/50 cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Agendamentos Hoje</span>
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-3xl font-bold">{isLoading ? "—" : agendamentosHoje}</div>
              <p className="text-xs text-muted-foreground mt-1">confirmados</p>
            </CardContent>
          </Card>
        </Link>

        {/* Faturamento do Mês — somatória das OS fechadas no mês vigente */}
        <Link href="/admin/financeiro">
          <Card className="border-green-500/20 hover:border-green-500/50 cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Faturamento do Mês</span>
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-3xl font-bold">
                {isLoading ? "—" : `R$ ${faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
              </div>
              {/* Termômetro meta vs atingimento */}
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Meta: R$ {(metaMes / 1000).toFixed(0)}k</span>
                  <span className={`font-bold ${metaTextColor}`}>{metaPerc}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${metaColor} rounded-full transition-all`} style={{ width: `${metaPerc}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Entregas no Mês — OS finalizadas no mês vigente */}
        <Link href="/admin/os">
          <Card className="border-amber-500/20 hover:border-amber-500/50 cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Entregas no Mês</span>
                <CheckCircle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-3xl font-bold">{isLoading ? "—" : entregasMes}</div>
              <p className="text-xs text-muted-foreground mt-1">OS entregues este mês</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gargalo — barras horizontais por status, indicando onde estão acumulando */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Gargalo do Pátio
              <Badge variant="outline" className="ml-auto text-xs">{veiculosNoPatio} ativos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Nenhuma OS ativa</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={statusData}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={130}
                  />
                  <Tooltip
                    formatter={(v: any) => [`${v} OS`, "Quantidade"]}
                    contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                  />
                  <Bar dataKey="value" name="OS" radius={[0, 4, 4, 0]}>
                    {statusData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Meta vs Atingimento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Meta vs Atingimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {/* Faturamento */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Faturamento</span>
                <span className={`font-bold ${metaTextColor}`}>
                  R$ {faturamento.toLocaleString("pt-BR")} / R$ {(metaMes / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${metaColor} rounded-full transition-all`} style={{ width: `${metaPerc}%` }} />
              </div>
              <div className="text-right text-xs text-muted-foreground mt-0.5">{metaPerc}% da meta</div>
            </div>

            {/* Entregas */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">OS Entregues</span>
                <span className="font-bold text-amber-400">{entregasMes} / 80 OS</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${entregasMes >= 80 ? "bg-green-500" : entregasMes >= 56 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, Math.round((entregasMes / 80) * 100))}%` }}
                />
              </div>
              <div className="text-right text-xs text-muted-foreground mt-0.5">
                {Math.min(100, Math.round((entregasMes / 80) * 100))}% da meta
              </div>
            </div>

            {/* Agendamentos */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Agendamentos Hoje</span>
                <span className="font-bold text-blue-400">{agendamentosHoje} confirmados</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, agendamentosHoje * 10)}%` }}
                />
              </div>
            </div>

            {/* Veículos no pátio */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Veículos no Pátio</span>
                <span className="font-bold text-primary">{veiculosNoPatio} ativos</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {statusData.map((s: any) => (
                  <Badge key={s.name} variant="outline" className="text-xs" style={{ borderColor: s.color, color: s.color }}>
                    {s.name}: {s.value}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links — todos com rotas corretas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: "/admin/patio", label: "Ver Pátio", icon: Car, color: "text-primary" },
          { href: "/admin/os", label: "Todas as OS", icon: Wrench, color: "text-blue-500" },
          { href: "/admin/agenda", label: "Agendamentos", icon: Calendar, color: "text-amber-500" },
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
