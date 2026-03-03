import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Wrench, Trophy, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const GRAU_COLORS: Record<string, string> = {
  "Junior": "bg-blue-500/20 text-blue-400",
  "Pleno": "bg-amber-500/20 text-amber-400",
  "Senior": "bg-green-500/20 text-green-400",
  "Especialista": "bg-purple-500/20 text-purple-400",
};

export default function GestaoProdutividade() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const { data } = trpc.dashboard.produtividade.useQuery({ mes, ano });
  const d = data as any;
  const ranking: any[] = d?.ranking ?? [];

  const prevMonth = () => { if (mes === 1) { setMes(12); setAno(y => y - 1); } else setMes(m => m - 1); };
  const nextMonth = () => { if (mes === 12) { setMes(1); setAno(y => y + 1); } else setMes(m => m + 1); };

  const chartData = ranking.slice(0, 12).map(r => ({
    nome: r.nome.split(" ")[0],
    os: r.totalOS,
    valor: r.totalValor,
  }));

  const totalOS = ranking.reduce((s, r) => s + r.totalOS, 0);
  const totalValor = ranking.reduce((s, r) => s + r.totalValor, 0);
  const topMecanico = ranking[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtividade</h1>
          <p className="text-muted-foreground text-sm">Desempenho estratégico dos mecânicos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium w-28 text-center">{MONTHS[mes - 1]} {ano}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Total OS</span>
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{totalOS}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Valor Total</span>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">
              {totalValor >= 1000 ? `R$ ${(totalValor / 1000).toFixed(1)}k` : `R$ ${totalValor}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Meta OS/Semana</span>
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold">{d?.metaOsSemana ?? 15}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Líder do Mês</span>
              <Trophy className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-sm font-bold text-yellow-400 truncate">{topMecanico?.nome?.split(" ")[0] ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{topMecanico?.totalOS ?? 0} OS</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">OS por Mecânico</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  formatter={(v: any) => [v, "OS"]}
                />
                <Bar dataKey="os" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Ranking Detalhado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ranking Completo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {ranking.map((r: any, i: number) => {
              const initials = r.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
              const score = r.positivos - r.negativos;
              return (
                <div key={r.id} className="flex items-center gap-4 px-4 py-3">
                  <div className={`text-sm font-bold w-6 text-center ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {i + 1}
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{r.nome}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{r.especialidade}</span>
                      <Badge className={`text-xs ${GRAU_COLORS[r.grau] ?? "bg-muted text-muted-foreground"}`}>{r.grau}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-primary">{r.totalOS}</div>
                      <div className="text-xs text-muted-foreground">OS</div>
                    </div>
                    {r.totalValor > 0 && (
                      <div className="text-center hidden lg:block">
                        <div className="font-bold text-green-400">
                          R${r.totalValor >= 1000 ? `${(r.totalValor / 1000).toFixed(1)}k` : r.totalValor}
                        </div>
                        <div className="text-xs text-muted-foreground">Valor</div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <ThumbsUp className="h-3 w-3" />{r.positivos}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <ThumbsDown className="h-3 w-3" />{r.negativos}
                      </span>
                      <span className={`text-xs font-bold ${score >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {score >= 0 ? "+" : ""}{score}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
