import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, DollarSign, Target, Car, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";

const META_MENSAL = 200000;

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function formatCurrencyShort(v: number) {
  if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return formatCurrency(v);
}

const TIPO_COLORS: Record<string, string> = {
  Rápido: "#6366f1",
  Médio: "#06b6d4",
  Demorado: "#f59e0b",
  Projeto: "#ec4899",
};

export default function Financeiro() {
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [consultor, setConsultor] = useState("todos");

  const { data, isLoading } = trpc.dashboard.financeiro.useQuery({
    mes,
    consultor: consultor === "todos" ? undefined : consultor,
  });

  const pctMeta = data ? Math.min((data.fatMensal / META_MENSAL) * 100, 100) : 0;

  const mesOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { val, label };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-sm text-muted-foreground">Análise de faturamento e metas</p>
          </div>
          <div className="flex gap-3">
            <Select value={consultor} onValueChange={setConsultor}>
              <SelectTrigger className="w-36 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="João">João</SelectItem>
                <SelectItem value="Pedro">Pedro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-44 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mesOptions.map((m) => (
                  <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Faturamento do Mês",
                  value: formatCurrency(data.fatMensal),
                  icon: DollarSign,
                  color: "text-green-400",
                  bg: "bg-green-500/10",
                  trend: data.crescimento ?? 0,
                },
                {
                  label: "Ticket Médio",
                  value: formatCurrency(data.ticketMedio),
                  icon: TrendingUp,
                  color: "text-cyan-400",
                  bg: "bg-cyan-500/10",
                  trend: null,
                },
                {
                  label: "OS Entregues",
                  value: data.totalOS,
                  icon: Car,
                  color: "text-indigo-400",
                  bg: "bg-indigo-500/10",
                  trend: null,
                },
                {
                  label: "Meta Mensal",
                  value: `${pctMeta.toFixed(0)}%`,
                  icon: Target,
                  color: pctMeta >= 100 ? "text-green-400" : pctMeta >= 70 ? "text-yellow-400" : "text-red-400",
                  bg: pctMeta >= 100 ? "bg-green-500/10" : pctMeta >= 70 ? "bg-yellow-500/10" : "bg-red-500/10",
                  trend: null,
                },
              ].map(({ label, value, icon: Icon, color, bg, trend }) => (
                <Card key={label} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                        {trend !== null && (
                          <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(trend).toFixed(1)}% vs mês anterior
                          </div>
                        )}
                      </div>
                      <div className={`p-2 rounded-lg ${bg}`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Meta Thermometer */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Termômetro da Meta — {formatCurrency(META_MENSAL)}
                  </CardTitle>
                  <span className={`text-sm font-bold ${pctMeta >= 100 ? "text-green-400" : pctMeta >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                    {formatCurrency(data.fatMensal)} / {formatCurrency(META_MENSAL)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      pctMeta >= 100 ? "bg-green-500" : pctMeta >= 70 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${pctMeta}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">0%</span>
                  <span className="text-xs text-muted-foreground">50%</span>
                  <span className="text-xs text-muted-foreground">100%</span>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly trend */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Faturamento Mensal (6 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.historicoMensal ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        formatter={(v: number) => [formatCurrency(v), "Faturamento"]}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* By service type */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Mix de Serviços (Receita)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="60%" height={180}>
                      <PieChart>
                        <Pie
                          data={data.mixServicos}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="valor"
                          nameKey="tipo"
                        >
                          {data.mixServicos.map((entry: { tipo: string; count: number }, i: number) => (
                            <Cell key={i} fill={TIPO_COLORS[entry.tipo ?? ""] ?? "#6366f1"} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [formatCurrency(v), "Receita"]}
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {data.mixServicos.map((t: { tipo: string; count: number }) => (
                        <div key={t.tipo ?? "x"} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: TIPO_COLORS[t.tipo ?? ""] ?? "#6366f1" }} />
                          <div>
                            <p className="text-xs font-medium text-foreground">{t.tipo ?? "Outros"}</p>
                            <p className="text-xs text-muted-foreground">{t.count} OS</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top OS */}
            {data.topOS && data.topOS.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top OS do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.topOS.map((o: { id: number; numeroOs: string | null; cliente: string; placa: string; valor: number; status: string | null }, i: number) => (
                      <div key={o.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                        <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                        <div className="flex-1">
                          <span className="text-xs font-mono text-muted-foreground">{o.numeroOs ?? `#${o.id}`}</span>
                          <p className="text-xs text-foreground">{o.placa} · {o.cliente}</p>
                        </div>
                        <span className="text-sm font-bold text-green-400">{formatCurrency(o.valor)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
