import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import {
  CheckCircle, AlertTriangle, Clock, Wrench, Car,
  ChevronDown, ChevronUp, RefreshCw, Zap,
} from "lucide-react";

const STATUS_CARDS = [
  { status: "Diagnóstico",          label: "Diagnóstico",          sub: "em análise",           color: "text-gray-300",   bg: "bg-gray-500/10 border-gray-500/20" },
  { status: "Orçamento Pendente",   label: "Orçamentos Pendentes", sub: "aguardando consultor",  color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  { status: "Aguardando Aprovação", label: "Aguard. Aprovação",    sub: "pendente",              color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { status: "Aguardando Peças",     label: "Aguard. Peças",        sub: "esperando",             color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  { status: "Pronto pra Iniciar",   label: "Pronto pra Iniciar",   sub: "aguardando",            color: "text-lime-400",   bg: "bg-lime-500/10 border-lime-500/20" },
  { status: "Em Execução",          label: "Em Execução",          sub: "trabalhando",           color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20" },
  { status: "Pronto",               label: "Prontos",              sub: "aguardando retirada",   color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  { status: "Agendado",             label: "Agendados Hoje",       sub: "para entrar",           color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
];

const CAPACITY_MAX = 20;

export default function Operacional() {
  const [consultor, setConsultor] = useState("todos");
  const [showAtrasados, setShowAtrasados] = useState(true);
  const [showTempo, setShowTempo] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const { data: patioData = [], isLoading, refetch } = trpc.os.patio.useQuery();
  const { data: colaboradoresList = [] } = trpc.colaboradores.list.useQuery();
  const { data: agendamentosHoje = [] } = trpc.agendamentos.list.useQuery({
    data: now.toISOString().split("T")[0],
  });

  const filtered = consultor === "todos"
    ? patioData as any[]
    : (patioData as any[]).filter((r: any) => r.os.colaboradorId?.toString() === consultor);

  const countByStatus = (status: string) =>
    status === "Agendado"
      ? agendamentosHoje.length
      : filtered.filter((r: any) => r.os.status === status).length;

  const totalNoPatio = filtered.length;
  const capacidadePercent = Math.min(Math.round((totalNoPatio / CAPACITY_MAX) * 100), 100);
  const emExecucao = filtered.filter((r: any) => r.os.status === "Em Execução");
  const retorno = filtered.filter((r: any) => r.os.retorno === true);
  const foraLoja = filtered.filter((r: any) => r.os.status === "Aguardando Peças");

  const atrasados = filtered.filter((r: any) => {
    if (!r.os.previsaoEntrega) return false;
    return new Date(r.os.previsaoEntrega) < now;
  });

  const tempoMedioByStatus = STATUS_CARDS.slice(0, 6).map((s) => {
    const osInStatus = filtered.filter((r: any) => r.os.status === s.status);
    if (osInStatus.length === 0) return null;
    const totalHours = osInStatus.reduce((acc: number, r: any) => {
      const entrada = r.os.dataEntrada ? new Date(r.os.dataEntrada) : new Date(r.os.createdAt);
      return acc + (now.getTime() - entrada.getTime()) / (1000 * 60 * 60);
    }, 0);
    return { status: s.label, horas: Math.round(totalHours / osInStatus.length), count: osInStatus.length };
  }).filter(Boolean) as { status: string; horas: number; count: number }[];

  const avgTotal = tempoMedioByStatus.length > 0
    ? Math.round(tempoMedioByStatus.reduce((a, t) => a + t.horas, 0) / tempoMedioByStatus.length)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-bold text-base">Oficina Doctor Auto</h1>
          <p className="text-xs text-muted-foreground">Gestão de Pátio em Tempo Real</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Capacidade */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            capacidadePercent < 70
              ? "bg-green-500/10 border-green-500/40 text-green-400"
              : capacidadePercent < 90
              ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
              : "bg-red-500/10 border-red-500/40 text-red-400"
          }`}>
            <CheckCircle className="h-3.5 w-3.5" />
            <span>{capacidadePercent < 70 ? "CAPACIDADE OK" : capacidadePercent < 90 ? "ATENÇÃO" : "LOTADO"}</span>
            <span className="opacity-60">Capacidade: {totalNoPatio}/{CAPACITY_MAX} ({capacidadePercent}%)</span>
          </div>
          {/* Fluxo */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border bg-green-500/10 border-green-500/40 text-green-400">
            <Zap className="h-3.5 w-3.5" />
            <span>FLUXO OK</span>
            <span className="opacity-60">Em Execução: {emExecucao.length}</span>
          </div>
          {/* Retorno */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border bg-muted border-border">
            <span className="text-lg font-bold">{retorno.length}</span>
            <div>
              <p className="leading-none">RETORNO</p>
              <p className="text-muted-foreground leading-none text-[10px]">Na oficina</p>
            </div>
          </div>
          {/* Fora da Loja */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border bg-muted border-border">
            <span className="text-lg font-bold">{foraLoja.length}</span>
            <div>
              <p className="leading-none">FORA DA LOJA</p>
              <p className="text-muted-foreground leading-none text-[10px]">Externo</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* ─── Status Pátio ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              Status Pátio
            </h2>
            <Select value={consultor} onValueChange={setConsultor}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Todos Consultores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Consultores</SelectItem>
                {(colaboradoresList as any[]).map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {STATUS_CARDS.map((card) => {
              const count = countByStatus(card.status);
              return (
                <div key={card.status} className="p-5 bg-card hover:bg-accent/10 transition-colors cursor-default">
                  <p className={`text-xs font-semibold mb-2 ${card.color}`}>{card.label}</p>
                  <p className={`text-4xl font-bold leading-none ${card.color}`}>{count}</p>
                  <p className="text-xs text-muted-foreground mt-2">{card.sub}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Veículos Atrasados ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 border-b border-border hover:bg-accent/10 transition-colors"
            onClick={() => setShowAtrasados((v) => !v)}
          >
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Veículos Atrasados
            </h2>
            {showAtrasados ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showAtrasados && (
            atrasados.length === 0 ? (
              <div className="flex items-center gap-4 px-5 py-4">
                <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">VEÍCULOS ATRASADOS</p>
                  <p className="text-xs text-muted-foreground">Previsão de entrega ultrapassada</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">críticos</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {atrasados.map((r: any) => (
                  <Link key={r.os.id} href={`/admin/os/${r.os.id}`}>
                    <div className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors cursor-pointer">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{r.veiculo?.placa ?? "—"} — {r.veiculo?.marca} {r.veiculo?.modelo}</p>
                        <p className="text-xs text-muted-foreground">{r.cliente?.nomeCompleto ?? "—"} · Previsão: {r.os.previsaoEntrega}</p>
                      </div>
                      <Badge variant="outline" className="text-xs text-red-400 border-red-500/40 bg-red-500/10 shrink-0">
                        {r.os.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>

        {/* ─── Tempo Médio de Permanência por Etapa ───────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 border-b border-border hover:bg-accent/10 transition-colors"
            onClick={() => setShowTempo((v) => !v)}
          >
            <div className="text-left">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Tempo Médio de Permanência por Etapa
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Análise de gargalos operacionais</p>
            </div>
            {showTempo ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
          </button>

          {showTempo && (
            <div className="p-5">
              {tempoMedioByStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Gargalos identificados: Etapas marcadas com{" "}
                  <AlertTriangle className="h-3 w-3 text-amber-400 mx-0.5" />
                  {" "}estão acima do tempo médio geral e requerem atenção.
                </p>
              ) : (
                <div className="space-y-3">
                  {tempoMedioByStatus.map((t) => {
                    const isGargalo = t.horas > avgTotal * 1.3;
                    return (
                      <div key={t.status} className="flex items-center gap-3">
                        {isGargalo
                          ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          : <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                        <span className="text-sm w-44 truncate">{t.status}</span>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${isGargalo ? "bg-amber-400" : "bg-primary"}`}
                            style={{ width: `${Math.min((t.horas / Math.max(avgTotal * 2, 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-20 text-right">{t.horas}h · {t.count} OS</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
