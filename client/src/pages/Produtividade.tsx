import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Award, Loader2, Target, ThumbsDown, ThumbsUp, TrendingUp, Wrench } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const GRAU_COLORS: Record<string, string> = {
  Junior: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Pleno: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Senior: "bg-green-500/20 text-green-400 border-green-500/30",
  Especialista: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function formatCurrencyShort(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v}`;
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function Produtividade() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const { data, isLoading } = trpc.dashboard.produtividade.useQuery({ mes, ano });

  const ranking = data?.ranking ?? [];
  const metaOsSemana = data?.metaOsSemana ?? 15;
  const totalOsMes = data?.totalOsMes ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-amber-500" />
            Produtividade
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Ranking de mecânicos e metas de produção</p>
        </div>
        <div className="flex gap-2">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground"
          >
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground"
          >
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total OS Mês", value: totalOsMes, sub: "ordens finalizadas" },
          { label: "Mecânicos Ativos", value: ranking.length, sub: "na equipe" },
          { label: "Meta Semanal", value: `${metaOsSemana} OS`, sub: "por semana", highlight: true },
          { label: "Média por Mecânico", value: ranking.length > 0 ? Math.round(totalOsMes / ranking.length) : 0, sub: "OS no mês" },
        ].map((c) => (
          <Card key={c.label} className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${c.highlight ? "text-amber-500" : "text-foreground"}`}>{c.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ranking */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Ranking de Mecânicos — {MESES[mes - 1]} {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum dado de produtividade para o período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ranking.map((m, i) => {
                const pct = metaOsSemana > 0 ? Math.min(Math.round((m.totalOS / (metaOsSemana * 4)) * 100), 100) : 0;
                return (
                  <div key={m.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      i === 0 ? "bg-amber-500 text-black" : i === 1 ? "bg-zinc-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{m.nome}</span>
                        <Badge variant="outline" className={`text-xs ${GRAU_COLORS[m.grau] ?? ""}`}>{m.grau}</Badge>
                        <span className="text-xs text-muted-foreground">{m.especialidade}</span>
                      </div>
                      <div className="mt-1 w-full bg-muted rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-foreground">{m.totalOS}</div>
                      <div className="text-xs text-muted-foreground">OS</div>
                    </div>
                    <div className="text-right flex-shrink-0 hidden md:block">
                      <div className="text-sm font-semibold text-green-400">{formatCurrency(m.totalValor)}</div>
                      <div className="text-xs text-muted-foreground">produzido</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 text-green-400 text-xs"><ThumbsUp className="h-3 w-3" />{m.positivos}</div>
                      <div className="flex items-center gap-1 text-red-400 text-xs"><ThumbsDown className="h-3 w-3" />{m.negativos}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart */}
      {ranking.length > 0 && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Comparativo de OS por Mecânico</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ranking} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} width={90} />
                <Tooltip
                  formatter={(v: number) => [v, "OS"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="totalOS" radius={[0, 4, 4, 0]}>
                  {ranking.map((_, i) => <Cell key={i} fill={i === 0 ? "#f59e0b" : "hsl(var(--primary))"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Meta hint */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Meta Semanal: {metaOsSemana} OS</p>
              <p className="text-xs text-muted-foreground">Configure as metas em <strong>Configurações → Metas</strong></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
