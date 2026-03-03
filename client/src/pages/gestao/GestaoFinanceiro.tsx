import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Target, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from "recharts";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function GestaoFinanceiro() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
  const { data } = trpc.dashboard.financeiro.useQuery({ mes: mesStr });
  const d = data as any;

  const fmt = (v: number) =>
    v >= 1000000 ? `R$ ${(v / 1000000).toFixed(1)}M` :
    v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` :
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  const prevMonth = () => { if (mes === 1) { setMes(12); setAno(y => y - 1); } else setMes(m => m - 1); };
  const nextMonth = () => { if (mes === 12) { setMes(1); setAno(y => y + 1); } else setMes(m => m + 1); };

  const historicoComMeta = (d?.historicoMensal ?? []).map((h: any) => ({
    ...h,
    meta: d?.metaMes ?? 0,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Análise financeira estratégica</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium w-28 text-center">{MONTHS[mes - 1]} {ano}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Faturamento", value: fmt(d?.fatMensal ?? 0), sub: `Meta: ${fmt(d?.metaMes ?? 0)}`, icon: DollarSign, color: "text-green-400" },
          { label: "% da Meta", value: `${d?.percentual ?? 0}%`, sub: d?.percentual >= 100 ? "Meta atingida!" : "Em progresso", icon: Target, color: d?.percentual >= 100 ? "text-green-400" : d?.percentual >= 70 ? "text-amber-400" : "text-red-400" },
          { label: "Ticket Médio", value: fmt(d?.ticketMedio ?? 0), sub: `${d?.totalOS ?? 0} OS entregues`, icon: TrendingUp, color: "text-blue-400" },
          { label: "Crescimento", value: `${d?.crescimento ?? 0}%`, sub: "vs mês anterior", icon: BarChart2, color: "text-purple-400" },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Histórico com Meta */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Faturamento vs Meta (6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={historicoComMeta}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                formatter={(v: any, name: string) => [`R$ ${Number(v).toLocaleString("pt-BR")}`, name === "total" ? "Faturamento" : "Meta"]}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Faturamento" />
              <Bar dataKey="meta" fill="rgba(239,68,68,0.3)" radius={[4, 4, 0, 0]} name="Meta" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mix de Serviços */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mix de Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(d?.mixServicos ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">Sem dados</div>
              ) : (
                (d?.mixServicos ?? []).slice(0, 8).map((s: any, i: number) => {
                  const total = (d?.mixServicos ?? []).reduce((acc: number, x: any) => acc + x.count, 0);
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                      <div className="text-xs text-muted-foreground w-28 truncate">{s.tipo}</div>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }} />
                      </div>
                      <div className="text-xs font-mono w-16 text-right">{s.count} ({pct}%)</div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top OS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top OS do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {(d?.topOS ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Sem dados</div>
            ) : (
              <div className="space-y-2">
                {(d?.topOS ?? []).map((o: any, i: number) => (
                  <div key={o.id} className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs w-4">{i + 1}</span>
                    <span className="font-mono text-xs text-primary">{o.numeroOs}</span>
                    <span className="text-xs flex-1 truncate">{o.cliente}</span>
                    <span className="text-xs font-bold text-green-400">
                      R$ {Number(o.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
