import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Target, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function AdminFinanceiro() {
  const now = new Date();
  const [mes, setMes] = useState<number>(now.getMonth() + 1);
  const [ano, setAno] = useState<number>(now.getFullYear());

  const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
  const { data, isLoading } = trpc.dashboard.financeiro.useQuery({ mes: mesStr });

  const d = data as any;

  const fmt = (v: number) =>
    v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAno(y => y - 1); }
    else setMes(m => m - 1);
  };
  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAno(y => y + 1); }
    else setMes(m => m + 1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Faturamento e metas mensais</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium w-28 text-center">{MONTHS[mes - 1]} {ano}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando dados financeiros...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Faturamento</span>
                  <DollarSign className="h-4 w-4 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-green-400">{fmt(d?.fatMensal ?? 0)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Meta: {fmt(d?.metaMes ?? 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">% da Meta</span>
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div className={`text-2xl font-bold ${(d?.percentual ?? 0) >= 100 ? "text-green-400" : (d?.percentual ?? 0) >= 70 ? "text-amber-400" : "text-red-400"}`}>
                  {d?.percentual ?? 0}%
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(d?.percentual ?? 0, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Ticket Médio</span>
                  <Receipt className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold">{fmt(d?.ticketMedio ?? 0)}</div>
                <div className="text-xs text-muted-foreground mt-1">{d?.totalOS ?? 0} OS entregues</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Crescimento</span>
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold">{d?.crescimento ?? 0}%</div>
                <div className="text-xs text-muted-foreground mt-1">vs mês anterior</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Histórico 6 meses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Histórico de Faturamento (6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={d?.historicoMensal ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#888" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "Faturamento"]}
                    />
                    <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Mix de Serviços */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mix de Serviços</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(d?.mixServicos ?? []).length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">Sem dados</div>
                  ) : (
                    (d?.mixServicos ?? []).slice(0, 8).map((s: any, i: number) => {
                      const total = (d?.mixServicos ?? []).reduce((acc: number, x: any) => acc + x.count, 0);
                      const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="text-xs text-muted-foreground w-32 truncate">{s.tipo}</div>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs font-mono w-12 text-right">{s.count} ({pct}%)</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top OS */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top OS do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {(d?.topOS ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">Nenhuma OS entregue neste período</div>
              ) : (
                <div className="divide-y divide-border">
                  {(d?.topOS ?? []).map((o: any, i: number) => (
                    <div key={o.id} className="flex items-center gap-4 py-2.5">
                      <span className="text-muted-foreground text-sm w-5">{i + 1}</span>
                      <span className="font-mono text-xs text-primary">{o.numeroOs}</span>
                      <span className="text-sm flex-1">{o.cliente}</span>
                      <span className="text-xs text-muted-foreground font-mono">{o.placa}</span>
                      <span className="text-sm font-bold text-green-400">
                        R$ {Number(o.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
