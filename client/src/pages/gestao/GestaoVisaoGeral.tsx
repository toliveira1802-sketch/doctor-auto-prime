import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Car, Users, Wrench, TrendingUp, Target, Calendar, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function GestaoVisaoGeral() {
  const { data: kpis } = trpc.dashboard.kpis.useQuery(undefined);
  const { data: fin } = trpc.dashboard.financeiro.useQuery(undefined);
  const { data: prod } = trpc.dashboard.produtividade.useQuery(undefined);

  const k = kpis as any;
  const f = fin as any;
  const p = prod as any;

  const statusData = (k?.statusDistribuicao ?? []).map((s: any) => ({ name: s.status, value: s.count }));
  const ranking = (p?.ranking ?? []).slice(0, 5);

  const fmt = (v: number) =>
    v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visão Geral</h1>
        <p className="text-muted-foreground text-sm">Painel estratégico da Doctor Auto Prime</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Faturamento Mês</span>
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{fmt(f?.fatMensal ?? 0)}</div>
            <div className="flex items-center gap-1 mt-1">
              <div className="flex-1 bg-muted rounded-full h-1">
                <div className="bg-green-400 h-1 rounded-full" style={{ width: `${Math.min(f?.percentual ?? 0, 100)}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{f?.percentual ?? 0}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Veículos no Pátio</span>
              <Car className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold">{k?.veiculosNoPatio ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">{k?.agendamentosHoje ?? 0} agendamentos hoje</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Ticket Médio</span>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold">{fmt(f?.ticketMedio ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">{f?.totalOS ?? 0} OS entregues</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">OS no Mês</span>
              <Wrench className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold">{p?.totalOsMes ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">{ranking.length} mecânicos ativos</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico Faturamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Faturamento 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={f?.historicoMensal ?? []}>
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

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">Sem dados</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                      {statusData.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {statusData.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-muted-foreground flex-1 truncate">{s.name}</span>
                      <span className="text-xs font-bold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Mecânicos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 5 Mecânicos do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">Sem dados</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {ranking.map((r: any, i: number) => (
                <div key={r.id} className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                  <div className={`text-lg font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                    #{i + 1}
                  </div>
                  <div className="text-sm font-semibold mt-1 truncate">{r.nome.split(" ")[0]}</div>
                  <div className="text-2xl font-bold text-primary mt-1">{r.totalOS}</div>
                  <div className="text-xs text-muted-foreground">OS</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
