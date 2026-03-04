import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TrendingUp } from "lucide-react";

const WEEKS = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];
const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const RANK_EMOJI = ["🥇", "🥈", "🥉"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminProdutividade() {
  const now = new Date();
  const [mes] = useState(now.getMonth() + 1);
  const [ano] = useState(now.getFullYear());
  const [selectedMecanico, setSelectedMecanico] = useState("todos");
  const [selectedCategoria, setSelectedCategoria] = useState("todas");
  const [selectedSemana, setSelectedSemana] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.dashboard.produtividade.useQuery({ mes, ano });
  const d = data as any;
  const ranking: any[] = d?.ranking ?? [];
  const metaOsSemana = d?.metaOsSemana ?? 15;
  const totalOsMes = d?.totalOsMes ?? 0;
  const metaMensal = metaOsSemana * 4 * Math.max(1, ranking.length);
  const percentual = metaMensal > 0 ? Math.round((totalOsMes / metaMensal) * 100) : 0;
  const projecao = totalOsMes > 0 ? Math.round((totalOsMes / Math.max(1, now.getDate())) * new Date(ano, mes, 0).getDate()) : 0;
  const diasRestantes = new Date(ano, mes, 0).getDate() - now.getDate();
  const filteredRanking = ranking.filter((m: any) => {
    if (selectedMecanico !== "todos" && String(m.id) !== selectedMecanico) return false;
    if (selectedCategoria !== "todas" && m.especialidade !== selectedCategoria) return false;
    return true;
  });
  const especialidades = Array.from(new Set(ranking.map((m: any) => m.especialidade).filter(Boolean)));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Dashboard de Produtividade</h1>
            <p className="text-xs text-muted-foreground">Métricas individuais e por recurso</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Última atualização: {new Date().toLocaleTimeString("pt-BR")}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="font-semibold">Termômetro de Meta Mensal</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Progresso</span>
            <span className={`text-xl font-bold ${percentual >= 100 ? "text-green-400" : percentual >= 70 ? "text-amber-400" : "text-red-400"}`}>
              {percentual.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-3 mb-5 mt-3">
          <div
            className={`h-3 rounded-full transition-all ${percentual >= 100 ? "bg-green-500" : percentual >= 70 ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${Math.min(percentual, 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
          <div className="pr-4">
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="text-xl font-bold mt-1">{fmt(metaMensal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{metaOsSemana} OS/sem/mecânico</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-muted-foreground">Realizado</p>
            <p className="text-xl font-bold mt-1">{fmt(ranking.reduce((s: number, r: any) => s + r.totalValor, 0))}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalOsMes} OS no mês</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-green-400">Projeção</p>
            <p className={`text-xl font-bold mt-1 ${projecao >= metaMensal ? "text-green-400" : "text-amber-400"}`}>{projecao} OS</p>
            <p className="text-xs text-muted-foreground mt-1">{projecao > 0 && metaMensal > 0 ? ((projecao / metaMensal) * 100).toFixed(1) : "0.0"}% da meta</p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-muted-foreground">Faltam</p>
            <p className="text-xl font-bold mt-1">{Math.max(0, metaMensal - totalOsMes)} OS</p>
            <p className="text-xs text-muted-foreground mt-1">{diasRestantes} dias restantes</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedMecanico} onValueChange={setSelectedMecanico}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos Mecânicos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Mecânicos</SelectItem>
            {ranking.map((m: any) => (<SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todas Categorias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Categorias</SelectItem>
            {(especialidades as string[]).map((e: string) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {WEEKS.map(w => (
            <Button key={w} variant={selectedSemana === w ? "default" : "outline"} size="sm"
              onClick={() => setSelectedSemana(selectedSemana === w ? null : w)}>{w}</Button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🏆</span>
          <h2 className="font-semibold">Ranking de Mecânicos</h2>
        </div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando ranking...</div>
        ) : filteredRanking.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Nenhum mecânico encontrado</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRanking.map((m: any, i: number) => {
              const metaInd = metaOsSemana * 4;
              const pct = metaInd > 0 ? Math.min(100, Math.round((m.totalOS / metaInd) * 100)) : 0;
              const isTop3 = i < 3;
              const ticket = m.totalOS > 0 ? m.totalValor / m.totalOS : 0;
              return (
                <div key={m.id} className="rounded-xl border bg-card p-4 relative overflow-hidden"
                  style={{ borderColor: isTop3 ? RANK_COLORS[i] + "40" : undefined }}>
                  {isTop3 && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: RANK_COLORS[i] }} />}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{isTop3 ? RANK_EMOJI[i] : `#${i+1}`}</span>
                    <div>
                      <p className="font-semibold text-sm">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">{m.especialidade} · {m.grau}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">$ Valor Produzido</span><span className="font-bold">{fmt(m.totalValor)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">🚗 Carros Atendidos</span><span className="font-bold">{m.totalOS}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">$ Ticket Médio</span><span className="font-bold">{fmt(ticket)}</span></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Meta Mensal</span>
                      <span className={pct >= 100 ? "text-green-400" : pct >= 70 ? "text-amber-400" : "text-red-400"}>{pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground">{fmt(m.totalValor)}</span>
                      <span className="text-muted-foreground">Meta: R$ {(metaOsSemana * 4 * 60000).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs">
                    <span className="text-green-400">👍 {m.positivos}</span>
                    <span className="text-red-400">👎 {m.negativos}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
