import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Trophy, Wrench, Target, TrendingUp, Loader2 } from "lucide-react";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function formatCurrencyShort(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return formatCurrency(v);
}

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309"];

export default function Produtividade() {
  const [periodo, setPeriodo] = useState<"semana" | "mes">("mes");

  const { data: mecanicos, isLoading } = trpc.dashboard.produtividade.useQuery({ periodo });

  const totalProduzido = mecanicos?.reduce((sum, m) => sum + m.produzido, 0) ?? 0;
  const totalCarros = mecanicos?.reduce((sum, m) => sum + m.carros, 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produtividade</h1>
            <p className="text-sm text-muted-foreground">Ranking e metas da equipe</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={periodo === "semana" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodo("semana")}
            >
              Semana
            </Button>
            <Button
              variant={periodo === "mes" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodo("mes")}
            >
              Mês
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !mecanicos || mecanicos.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum dado de produtividade disponível.</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Produzido", value: formatCurrency(totalProduzido), icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
                { label: "Total de Carros", value: totalCarros, icon: Wrench, color: "text-cyan-400", bg: "bg-cyan-500/10" },
                { label: "Mecânicos Ativos", value: mecanicos.length, icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${bg}`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Ranking Cards */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Ranking — {periodo === "semana" ? "Esta Semana" : "Este Mês"}
              </h2>
              {mecanicos.map((m, i) => {
                const pct = m.meta > 0 ? Math.min((m.produzido / m.meta) * 100, 100) : 0;
                const isTop = i === 0;
                return (
                  <Card
                    key={m.id}
                    className={`bg-card border transition-all ${
                      isTop ? "border-yellow-500/50 shadow-lg shadow-yellow-500/5" : "border-border"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="w-10 text-center shrink-0">
                          {i < 3 ? (
                            <span className="text-2xl">{["🥇", "🥈", "🥉"][i]}</span>
                          ) : (
                            <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                          )}
                        </div>

                        {/* Icon */}
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Wrench className="w-5 h-5 text-primary" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground">{m.nome}</p>
                            {m.especialidade && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {m.especialidade}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {m.carros} carro{m.carros !== 1 ? "s" : ""}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Meta: {formatCurrency(m.meta)}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-2">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-0.5">
                              <span className="text-xs text-muted-foreground">{pct.toFixed(0)}% da meta</span>
                              <span className="text-xs text-muted-foreground">
                                {m.meta > m.produzido ? `Faltam ${formatCurrency(m.meta - m.produzido)}` : "✓ Meta atingida!"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Value */}
                        <div className="text-right shrink-0">
                          <p className={`text-xl font-bold ${isTop ? "text-yellow-400" : "text-green-400"}`}>
                            {formatCurrency(m.produzido)}
                          </p>
                          <p className="text-xs text-muted-foreground">produzido</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Bar Chart */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Comparativo de Produção</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={mecanicos} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={formatCurrencyShort}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), "Produzido"]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="produzido" radius={[0, 4, 4, 0]}>
                      {mecanicos.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#f59e0b" : "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                    <Bar dataKey="meta" radius={[0, 4, 4, 0]} fill="hsl(var(--muted))" opacity={0.4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
