import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Car, Calendar, AlertTriangle, CheckCircle, Clock, DollarSign,
  Wrench, ChevronRight, Activity, TrendingUp, Users, Zap,
  AlertCircle, Timer, BarChart3,
} from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Diagnóstico":          { bg: "bg-amber-500/15",   text: "text-amber-400",   dot: "bg-amber-400" },
  "Orçamento":            { bg: "bg-orange-500/15",  text: "text-orange-400",  dot: "bg-orange-400" },
  "Aguardando Aprovação": { bg: "bg-yellow-500/15",  text: "text-yellow-400",  dot: "bg-yellow-400" },
  "Aprovado":             { bg: "bg-sky-500/15",     text: "text-sky-400",     dot: "bg-sky-400" },
  "Em Execução":          { bg: "bg-purple-500/15",  text: "text-purple-400",  dot: "bg-purple-400" },
  "Aguardando Peça":      { bg: "bg-rose-500/15",    text: "text-rose-400",    dot: "bg-rose-400" },
  "Pronto":               { bg: "bg-green-500/15",   text: "text-green-400",   dot: "bg-green-400" },
  "Entregue":             { bg: "bg-slate-500/15",   text: "text-slate-400",   dot: "bg-slate-400" },
  "Cancelado":            { bg: "bg-red-500/15",     text: "text-red-400",     dot: "bg-red-400" },
};

function fmtBRLShort(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function horasDesde(ts: string | Date | null | undefined): number {
  if (!ts) return 0;
  return (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60);
}

function fmtHoras(h: number): string {
  if (h < 1) return `${Math.floor(h * 60)}min`;
  if (h < 24) return `${Math.floor(h)}h`;
  const d = Math.floor(h / 24);
  const hh = Math.floor(h % 24);
  return hh > 0 ? `${d}d ${hh}h` : `${d}d`;
}

function fmtHora(ts: string | Date | null | undefined): string {
  if (!ts) return "--";
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function VisaoGeral() {
  const [, navigate] = useLocation();
  const hoje = new Date();
  const diaSemana = hoje.toLocaleDateString("pt-BR", { weekday: "long" });
  const dataFormatada = hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // ── Dados ──────────────────────────────────────────────────────────────────
  const { data: patioData, isLoading: loadingPatio } = trpc.os.patio.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: agendamentosData } = trpc.agendamentos.list.useQuery(undefined, { staleTime: 60_000 });
  const { data: kpis } = trpc.dashboard.kpis.useQuery(undefined, { staleTime: 60_000 });
  const { data: financeiro } = trpc.dashboard.financeiro.useQuery(undefined, { staleTime: 60_000 });

  const patio: any[] = (patioData as any[]) ?? [];
  const agendamentos: any[] = (agendamentosData as any[]) ?? [];

  // ── Pátio stats ────────────────────────────────────────────────────────────
  const emExecucao = patio.filter(r => r.os.status === "Em Execução");
  const prontas = patio.filter(r => r.os.status === "Pronto");
  const aguardAprov = patio.filter(r => r.os.status === "Aguardando Aprovação");
  const aguardPeca = patio.filter(r => r.os.status === "Aguardando Peça");
  const paradas48h = patio.filter(r => horasDesde(r.os.dataEntrada) > 48);

  // ── Agendamentos de hoje ───────────────────────────────────────────────────
  const agendamentosHoje = agendamentos.filter(a => {
    if (!a.dataHora) return false;
    const d = new Date(a.dataHora);
    return d.toDateString() === hoje.toDateString();
  }).sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

  const agendamentosConfirmados = agendamentosHoje.filter(a => a.status === "confirmado" || a.status === "Confirmado");
  const agendamentosPendentes = agendamentosHoje.filter(a => a.status === "pendente" || a.status === "Pendente");

  // ── Pendências críticas ────────────────────────────────────────────────────
  const pendenciasCriticas = [
    ...patio.filter(r => r.os.status === "Aguardando Aprovação" && horasDesde(r.os.dataEntrada) > 24)
      .map(r => ({ tipo: "Aprovação", placa: r.os.placa ?? r.veiculo?.placa ?? "--", horas: horasDesde(r.os.dataEntrada), id: r.os.id })),
    ...patio.filter(r => r.os.status === "Pronto" && horasDesde(r.os.dataEntrada) > 24)
      .map(r => ({ tipo: "Retirada", placa: r.os.placa ?? r.veiculo?.placa ?? "--", horas: horasDesde(r.os.dataEntrada), id: r.os.id })),
    ...patio.filter(r => horasDesde(r.os.dataEntrada) > 72 && !["Entregue", "Cancelado"].includes(r.os.status))
      .map(r => ({ tipo: "Parada +72h", placa: r.os.placa ?? r.veiculo?.placa ?? "--", horas: horasDesde(r.os.dataEntrada), id: r.os.id })),
  ].slice(0, 8);

  // ── Distribuição de status ─────────────────────────────────────────────────
  const statusDist = Object.entries(
    patio.reduce((acc: Record<string, number>, r) => {
      const s = r.os.status ?? "Diagnóstico";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
            <Badge variant="outline" className="text-xs text-green-400 border-green-500/30">Ao vivo</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5 capitalize">
            {diaSemana}, {dataFormatada}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/patio")} className="gap-1.5">
            <Car className="h-3.5 w-3.5" /> Ver Pátio
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/agenda")} className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Ver Agenda
          </Button>
        </div>
      </div>

      {/* ── KPIs do dia ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">No Pátio</span>
              <Car className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{patio.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{emExecucao.length} em execução</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Prontos p/ Entrega</span>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{prontas.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Aguardando retirada</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Agenda Hoje</span>
              <Calendar className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-sky-400">{agendamentosHoje.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{agendamentosConfirmados.length} confirmados</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Fat. do Mês</span>
              <DollarSign className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{fmtBRLShort(financeiro?.fatMensal ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {financeiro?.percentual ?? 0}% da meta
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Alertas críticos ───────────────────────────────────────────────── */}
      {pendenciasCriticas.length > 0 && (
        <Card className="border-rose-500/20 bg-rose-500/3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              Pendências Críticas ({pendenciasCriticas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {pendenciasCriticas.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg border border-rose-500/20 bg-rose-500/5 cursor-pointer hover:bg-rose-500/10 transition-colors"
                  onClick={() => navigate(`/admin/os/${p.id}`)}
                >
                  <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-bold truncate">{p.placa}</p>
                    <p className="text-xs text-rose-400/80">{p.tipo} · {fmtHoras(p.horas)}</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Grid principal ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pátio — distribuição de status */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                Pátio Agora
              </span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => navigate("/admin/patio")}>
                Abrir <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {loadingPatio ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-8 bg-muted/20 rounded animate-pulse" />)}
              </div>
            ) : patio.length === 0 ? (
              <div className="text-center py-6">
                <Car className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Pátio vazio</p>
              </div>
            ) : (
              <>
                {statusDist.map(([status, count]) => {
                  const sc = STATUS_COLORS[status] ?? { bg: "bg-muted/20", text: "text-muted-foreground", dot: "bg-muted" };
                  const pct = Math.round((count / patio.length) * 100);
                  return (
                    <div key={status} className="flex items-center gap-2 cursor-pointer hover:bg-muted/10 rounded p-1 transition-colors"
                      onClick={() => navigate("/admin/patio")}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                      <span className="text-xs flex-1 truncate">{status}</span>
                      <span className={`text-xs font-bold ${sc.text}`}>{count}</span>
                      <div className="w-16 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                        <div className={`h-full ${sc.dot} opacity-60 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total no pátio</span>
                  <span className="text-sm font-bold text-primary">{patio.length}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* OS em execução — lista rápida */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-purple-400" />
                Em Execução ({emExecucao.length})
              </span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => navigate("/gestao/os-ultimate")}>
                Ver todas <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {emExecucao.length === 0 ? (
              <div className="text-center py-6">
                <Wrench className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma em execução</p>
              </div>
            ) : (
              emExecucao.slice(0, 6).map(r => {
                const horas = horasDesde(r.os.dataEntrada);
                const alerta = horas > 48;
                return (
                  <div
                    key={r.os.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border/30 hover:border-purple-500/30 hover:bg-purple-500/5 cursor-pointer transition-all"
                    onClick={() => navigate(`/admin/os/${r.os.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-purple-400">{r.os.placa ?? r.veiculo?.placa ?? "--"}</span>
                        {r.mecanico && <span className="text-xs text-muted-foreground truncate">· {r.mecanico.nome}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{r.veiculo?.marca} {r.veiculo?.modelo}</p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${alerta ? "text-rose-400" : "text-muted-foreground"}`}>
                      {alerta && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                      {fmtHoras(horas)}
                    </span>
                  </div>
                );
              })
            )}
            {emExecucao.length > 6 && (
              <p className="text-xs text-center text-muted-foreground pt-1">+{emExecucao.length - 6} mais</p>
            )}
          </CardContent>
        </Card>

        {/* Agenda do dia */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-400" />
                Agenda Hoje ({agendamentosHoje.length})
              </span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => navigate("/admin/agenda")}>
                Ver agenda <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agendamentosHoje.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sem agendamentos hoje</p>
              </div>
            ) : (
              agendamentosHoje.slice(0, 7).map((a: any) => {
                const confirmado = ["confirmado", "Confirmado"].includes(a.status);
                return (
                  <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/30 hover:bg-muted/10 cursor-pointer transition-colors"
                    onClick={() => navigate("/admin/agenda")}>
                    <div className={`w-1 h-8 rounded-full flex-shrink-0 ${confirmado ? "bg-green-400" : "bg-yellow-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{a.nomeCliente ?? a.cliente?.nomeCompleto ?? "Cliente"}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.servico ?? a.motivoVisita ?? "Serviço"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono font-bold">{fmtHora(a.dataHora)}</p>
                      <Badge variant="outline" className={`text-[10px] ${confirmado ? "text-green-400 border-green-500/30" : "text-yellow-400 border-yellow-500/30"}`}>
                        {confirmado ? "Conf." : "Pend."}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
            {agendamentosHoje.length > 7 && (
              <p className="text-xs text-center text-muted-foreground pt-1">+{agendamentosHoje.length - 7} mais</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Prontos p/ entrega ─────────────────────────────────────────────── */}
      {prontas.length > 0 && (
        <Card className="border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-400">
              <CheckCircle className="h-4 w-4" />
              Prontos para Entrega ({prontas.length}) — Avisar Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {prontas.map(r => {
                const horas = horasDesde(r.os.dataEntrada);
                return (
                  <div
                    key={r.os.id}
                    className="p-2 rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 cursor-pointer transition-colors text-center"
                    onClick={() => navigate(`/admin/os/${r.os.id}`)}
                  >
                    <p className="text-xs font-mono font-bold text-green-400">{r.os.placa ?? r.veiculo?.placa ?? "--"}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.veiculo?.modelo ?? "--"}</p>
                    <p className="text-xs text-muted-foreground">{fmtHoras(horas)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Meta do mês ────────────────────────────────────────────────────── */}
      {financeiro && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Meta do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{fmtBRLShort(financeiro.fatMensal)}</span>
              <span className="text-sm text-muted-foreground">Meta: {fmtBRLShort(financeiro.metaMes)}</span>
            </div>
            <div className="w-full h-3 bg-muted/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  financeiro.percentual >= 100 ? "bg-green-500" :
                  financeiro.percentual >= 70 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(financeiro.percentual, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-xs font-bold ${
                financeiro.percentual >= 100 ? "text-green-400" :
                financeiro.percentual >= 70 ? "text-amber-400" : "text-rose-400"
              }`}>{financeiro.percentual}%</span>
              {(financeiro.diasRestantes ?? 0) > 0 && (financeiro.mediaDiaParaAtingir ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground">
                  Precisa {fmtBRLShort(financeiro.mediaDiaParaAtingir ?? 0)}/dia · {financeiro.diasRestantes ?? 0}d restantes
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
