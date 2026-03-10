import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle, Clock, CheckCircle, Wrench, DollarSign, TrendingUp,
  Car, ExternalLink, Timer, Trophy, AlertCircle, ChevronRight,
  BarChart3, FileText, ChevronLeft, Search, Download, Users,
  Zap, Target, Activity, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS_ORDER = [
  "Diagnóstico", "Orçamento", "Aguardando Aprovação", "Aprovado",
  "Em Execução", "Aguardando Peça", "Pronto", "Entregue", "Cancelado",
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  "Diagnóstico":          { bg: "bg-amber-500/15",   text: "text-amber-400",   dot: "bg-amber-400",   border: "border-amber-500/30" },
  "Orçamento":            { bg: "bg-orange-500/15",  text: "text-orange-400",  dot: "bg-orange-400",  border: "border-orange-500/30" },
  "Aguardando Aprovação": { bg: "bg-yellow-500/15",  text: "text-yellow-400",  dot: "bg-yellow-400",  border: "border-yellow-500/30" },
  "Aprovado":             { bg: "bg-sky-500/15",     text: "text-sky-400",     dot: "bg-sky-400",     border: "border-sky-500/30" },
  "Em Execução":          { bg: "bg-purple-500/15",  text: "text-purple-400",  dot: "bg-purple-400",  border: "border-purple-500/30" },
  "Aguardando Peça":      { bg: "bg-rose-500/15",    text: "text-rose-400",    dot: "bg-rose-400",    border: "border-rose-500/30" },
  "Pronto":               { bg: "bg-green-500/15",   text: "text-green-400",   dot: "bg-green-400",   border: "border-green-500/30" },
  "Entregue":             { bg: "bg-slate-500/15",   text: "text-slate-400",   dot: "bg-slate-400",   border: "border-slate-500/30" },
  "Cancelado":            { bg: "bg-red-500/15",     text: "text-red-400",     dot: "bg-red-400",     border: "border-red-500/30" },
};

const FUNIL_ATIVOS = [
  "Diagnóstico", "Orçamento", "Aguardando Aprovação", "Aprovado",
  "Em Execução", "Aguardando Peça", "Pronto",
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Mix de serviços com faixas de valor reais
const MIX_CONFIG = [
  { label: "Rápido",   min: 0,     max: 1000,  meta: "R$1k–R$15k",  color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  icon: Zap },
  { label: "Médio",    min: 1000,  max: 4000,  meta: "R$4k–R$8k",   color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/20",    icon: Activity },
  { label: "Demorado", min: 4000,  max: 25000, meta: "R$25k+",      color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: Clock },
  { label: "Projeto",  min: 25000, max: Infinity, meta: "Céu limite", color: "text-amber-400", bg: "bg-amber-500/10",  border: "border-amber-500/20",  icon: Trophy },
];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtBRLShort(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmtBRL(v);
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
function dentroDoMes(ts: string | Date | null | undefined, year: number, month: number): boolean {
  if (!ts) return false;
  const d = new Date(ts);
  return d.getFullYear() === year && d.getMonth() === month;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GestaoOSUltimate() {
  const [, navigate] = useLocation();
  const hoje = new Date();

  // Período
  const [periodoMes, setPeriodoMes] = useState(hoje.getMonth());
  const [periodoAno, setPeriodoAno] = useState(hoje.getFullYear());

  // Filtros
  const [filtroConsultor, setFiltroConsultor] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroMecanico, setFiltroMecanico] = useState("todos");
  const [busca, setBusca] = useState("");
  const [mecanicoExpandido, setMecanicoExpandido] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"tabela" | "funil">("tabela");

  // ── Dados ──────────────────────────────────────────────────────────────────
  const { data: osList, isLoading } = trpc.os.list.useQuery({ limit: 1000 });
  const { data: mecanicosList } = trpc.mecanicos.list.useQuery();
  const { data: colaboradoresList } = trpc.colaboradores.list.useQuery();

  const rawItems: any[] = (osList as any)?.items ?? [];

  // Enriquece cada OS
  const osEnriquecidas = useMemo(() => rawItems.map((r: any) => ({
    id: r.os.id,
    numeroOs: r.os.numeroOs ?? `OS-${String(r.os.id).padStart(5, "0")}`,
    status: r.os.status ?? "Diagnóstico",
    placa: r.os.placa ?? r.veiculo?.placa ?? "--",
    marca: r.veiculo?.marca ?? "--",
    modelo: r.veiculo?.modelo ?? "--",
    nomeCliente: r.cliente?.nomeCompleto ?? "--",
    colaboradorId: r.os.colaboradorId,
    mecanicoId: r.os.mecanicoId,
    totalOrcamento: Number(r.os.totalOrcamento ?? 0),
    valorTotalOs: Number(r.os.valorTotalOs ?? 0),
    dataEntrada: r.os.dataEntrada,
    dataSaida: r.os.dataSaida,
    createdAt: r.os.createdAt,
    updatedAt: r.os.updatedAt,
    horasNoPatio: horasDesde(r.os.dataEntrada),
    motivoVisita: r.os.motivoVisita ?? "--",
  })), [rawItems]);

  // ── Período ────────────────────────────────────────────────────────────────
  const osDoPeriodo = useMemo(() =>
    osEnriquecidas.filter(o => dentroDoMes(o.dataEntrada, periodoAno, periodoMes)),
    [osEnriquecidas, periodoAno, periodoMes]
  );

  // Período anterior para comparação
  const mesAnteriorNum = periodoMes === 0 ? 11 : periodoMes - 1;
  const anoAnteriorNum = periodoMes === 0 ? periodoAno - 1 : periodoAno;
  const osMesAnterior = useMemo(() =>
    osEnriquecidas.filter(o => dentroDoMes(o.dataEntrada, anoAnteriorNum, mesAnteriorNum)),
    [osEnriquecidas, anoAnteriorNum, mesAnteriorNum]
  );

  const entreguesDoPeriodo = useMemo(() =>
    osEnriquecidas.filter(o =>
      o.status === "Entregue" && dentroDoMes(o.dataSaida ?? o.dataEntrada, periodoAno, periodoMes)
    ),
    [osEnriquecidas, periodoAno, periodoMes]
  );

  const entreguesMesAnterior = useMemo(() =>
    osEnriquecidas.filter(o =>
      o.status === "Entregue" && dentroDoMes(o.dataSaida ?? o.dataEntrada, anoAnteriorNum, mesAnteriorNum)
    ),
    [osEnriquecidas, anoAnteriorNum, mesAnteriorNum]
  );

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const ativasDoPeriodo = osDoPeriodo.filter(o => !["Entregue", "Cancelado"].includes(o.status));
  const emExecucao = osDoPeriodo.filter(o => o.status === "Em Execução");
  const aguardAprov = osDoPeriodo.filter(o => o.status === "Aguardando Aprovação");
  const prontas = osDoPeriodo.filter(o => o.status === "Pronto");
  const faturamentoPeriodo = entreguesDoPeriodo.reduce((acc, o) => acc + o.valorTotalOs, 0);
  const faturamentoAnterior = entreguesMesAnterior.reduce((acc, o) => acc + o.valorTotalOs, 0);
  const ticketMedio = entreguesDoPeriodo.length > 0 ? faturamentoPeriodo / entreguesDoPeriodo.length : 0;
  const varFaturamento = faturamentoAnterior > 0 ? ((faturamentoPeriodo - faturamentoAnterior) / faturamentoAnterior) * 100 : 0;
  const varOS = osMesAnterior.length > 0 ? ((osDoPeriodo.length - osMesAnterior.length) / osMesAnterior.length) * 100 : 0;

  // ── Funil ──────────────────────────────────────────────────────────────────
  const funilData = FUNIL_ATIVOS.map(s => ({
    status: s,
    count: osDoPeriodo.filter(o => o.status === s).length,
    valor: osDoPeriodo.filter(o => o.status === s).reduce((acc, o) => acc + o.totalOrcamento, 0),
    color: STATUS_COLORS[s],
  }));
  const maxFunil = Math.max(...funilData.map(f => f.count), 1);

  // ── Alertas (tempo real) ───────────────────────────────────────────────────
  const ativasGlobal = osEnriquecidas.filter(o => !["Entregue", "Cancelado"].includes(o.status));
  const alertasParadas = ativasGlobal.filter(o => o.horasNoPatio > 48);
  const alertasOrcamento = osEnriquecidas.filter(o => o.status === "Aguardando Aprovação" && o.horasNoPatio > 24);
  const alertasProntas = osEnriquecidas.filter(o => o.status === "Pronto" && o.horasNoPatio > 24);

  // ── Ranking mecânicos ──────────────────────────────────────────────────────
  const rankingMecanicos = useMemo(() => {
    const map: Record<number, { id: number; nome: string; qtde: number; valor: number; placas: string[]; emExecucao: number }> = {};
    osDoPeriodo.forEach(o => {
      if (!o.mecanicoId) return;
      if (!map[o.mecanicoId]) {
        const mec = (mecanicosList as any[])?.find((m: any) => m.id === o.mecanicoId);
        map[o.mecanicoId] = { id: o.mecanicoId, nome: mec?.nome ?? `Mec #${o.mecanicoId}`, qtde: 0, valor: 0, placas: [], emExecucao: 0 };
      }
      map[o.mecanicoId].qtde++;
      map[o.mecanicoId].valor += o.valorTotalOs;
      if (o.placa && o.placa !== "--") map[o.mecanicoId].placas.push(o.placa);
      if (o.status === "Em Execução") map[o.mecanicoId].emExecucao++;
    });
    return Object.values(map).sort((a, b) => b.qtde - a.qtde);
  }, [osDoPeriodo, mecanicosList]);

  // ── Mix de serviços ────────────────────────────────────────────────────────
  const mixData = useMemo(() => MIX_CONFIG.map(cfg => ({
    ...cfg,
    count: osDoPeriodo.filter(o => o.totalOrcamento >= cfg.min && o.totalOrcamento < cfg.max).length,
    valor: osDoPeriodo.filter(o => o.totalOrcamento >= cfg.min && o.totalOrcamento < cfg.max)
      .reduce((acc, o) => acc + o.totalOrcamento, 0),
  })), [osDoPeriodo]);

  // ── Tabela filtrada ────────────────────────────────────────────────────────
  const osFiltradas = useMemo(() => {
    let lista = osDoPeriodo;
    if (filtroConsultor !== "todos") lista = lista.filter(o => String(o.colaboradorId) === filtroConsultor);
    if (filtroStatus !== "todos") lista = lista.filter(o => o.status === filtroStatus);
    if (filtroMecanico !== "todos") lista = lista.filter(o => String(o.mecanicoId) === filtroMecanico);
    if (busca.trim()) {
      const b = busca.toLowerCase();
      lista = lista.filter(o =>
        o.numeroOs.toLowerCase().includes(b) ||
        o.placa.toLowerCase().includes(b) ||
        o.nomeCliente.toLowerCase().includes(b) ||
        o.marca.toLowerCase().includes(b) ||
        o.modelo.toLowerCase().includes(b)
      );
    }
    return lista;
  }, [osDoPeriodo, filtroConsultor, filtroStatus, filtroMecanico, busca]);

  const colaboradores: any[] = (colaboradoresList as any) ?? [];
  const mecanicos: any[] = (mecanicosList as any) ?? [];

  // ── Navegação de período ───────────────────────────────────────────────────
  function irMesAnterior() {
    if (periodoMes === 0) { setPeriodoMes(11); setPeriodoAno(y => y - 1); }
    else setPeriodoMes(m => m - 1);
  }
  function irMesSeguinte() {
    if (periodoMes === 11) { setPeriodoMes(0); setPeriodoAno(y => y + 1); }
    else setPeriodoMes(m => m + 1);
  }
  const ehMesAtual = periodoMes === hoje.getMonth() && periodoAno === hoje.getFullYear();

  // ── Exportar CSV ───────────────────────────────────────────────────────────
  function exportarCSV() {
    const header = "OS,Status,Placa,Veículo,Cliente,Tempo (h),Orçamento,Valor Final\n";
    const rows = osFiltradas.map(o =>
      `${o.numeroOs},${o.status},${o.placa},"${o.marca} ${o.modelo}","${o.nomeCliente}",${Math.floor(o.horasNoPatio)},${o.totalOrcamento},${o.valorTotalOs}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `os-${MESES[periodoMes].toLowerCase()}-${periodoAno}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">OS Ultimate</h1>
            {ehMesAtual && <Badge variant="outline" className="text-xs text-green-400 border-green-500/30">Mês vigente</Badge>}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Painel gerencial completo — ordens de serviço
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/os/nova")} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Nova OS
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        </div>
      </div>

      {/* ── Seletor de período ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={irMesAnterior}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select value={`${periodoMes}`} onValueChange={v => setPeriodoMes(Number(v))}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((m, i) => <SelectItem key={i} value={`${i}`}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={`${periodoAno}`} onValueChange={v => setPeriodoAno(Number(v))}>
          <SelectTrigger className="h-8 w-24 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: hoje.getFullYear() - 2023 }, (_, i) => 2024 + i).map(y => (
              <SelectItem key={y} value={`${y}`}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={irMesSeguinte}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!ehMesAtual && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setPeriodoMes(hoje.getMonth()); setPeriodoAno(hoje.getFullYear()); }}>
            Voltar ao mês atual
          </Button>
        )}
      </div>

      {/* ── Alertas críticos ───────────────────────────────────────────────── */}
      {(alertasParadas.length > 0 || alertasOrcamento.length > 0 || alertasProntas.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {alertasParadas.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-rose-500/30 bg-rose-500/5">
              <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-400">{alertasParadas.length} OS paradas +48h</p>
                <p className="text-xs text-muted-foreground">Requerem atenção imediata</p>
              </div>
            </div>
          )}
          {alertasOrcamento.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-400">{alertasOrcamento.length} aguardando aprovação +24h</p>
                <p className="text-xs text-muted-foreground">Contato com cliente necessário</p>
              </div>
            </div>
          )}
          {alertasProntas.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-400">{alertasProntas.length} prontos aguardando retirada</p>
                <p className="text-xs text-muted-foreground">Avisar cliente para retirada</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPIs principais ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<DollarSign className="h-4 w-4 text-green-400" />}
          label="Faturamento do Período"
          value={fmtBRLShort(faturamentoPeriodo)}
          color="text-green-400"
          delta={varFaturamento}
          sub={`${entreguesDoPeriodo.length} OS entregues`}
        />
        <KpiCard
          icon={<FileText className="h-4 w-4 text-primary" />}
          label="OS no Período"
          value={osDoPeriodo.length}
          color="text-primary"
          delta={varOS}
          sub={`${ativasDoPeriodo.length} ainda ativas`}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-sky-400" />}
          label="Ticket Médio"
          value={fmtBRLShort(ticketMedio)}
          color="text-sky-400"
          sub={`${emExecucao.length} em execução`}
        />
        <KpiCard
          icon={<Timer className="h-4 w-4 text-amber-400" />}
          label="Aguard. Aprovação"
          value={aguardAprov.length}
          color="text-amber-400"
          sub={`${prontas.length} prontas p/ entrega`}
        />
      </div>

      {/* ── Funil + Mix ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Funil de status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Funil de Status — {MESES[periodoMes]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {funilData.map(f => (
              <div key={f.status} className="flex items-center gap-3 group cursor-pointer"
                onClick={() => setFiltroStatus(filtroStatus === f.status ? "todos" : f.status)}>
                <span className="text-xs text-muted-foreground w-36 truncate group-hover:text-foreground transition-colors">{f.status}</span>
                <div className="flex-1 h-5 bg-muted/20 rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${f.color.bg} transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max((f.count / maxFunil) * 100, f.count > 0 ? 8 : 0)}%` }}
                  >
                    {f.count > 0 && <span className={`text-[10px] font-bold ${f.color.text}`}>{f.count}</span>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right">{f.valor > 0 ? fmtBRLShort(f.valor) : "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mix de serviços */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Mix de Serviços — {MESES[periodoMes]}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {mixData.map(m => {
              const Icon = m.icon;
              return (
                <div key={m.label} className={`p-3 rounded-lg border ${m.border} ${m.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${m.color}`}>{m.label}</span>
                    <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                  </div>
                  <div className={`text-2xl font-bold ${m.color}`}>{m.count}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.meta}</div>
                  {m.valor > 0 && <div className={`text-xs font-medium ${m.color} mt-1`}>{fmtBRLShort(m.valor)}</div>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── Ranking mecânicos ──────────────────────────────────────────────── */}
      {rankingMecanicos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Ranking Mecânicos — {MESES[periodoMes]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rankingMecanicos.map((m, i) => (
                <div key={m.id}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/20 cursor-pointer transition-all"
                    onClick={() => setMecanicoExpandido(mecanicoExpandido === m.id ? null : m.id)}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? "bg-amber-500/20 text-amber-400" :
                      i === 1 ? "bg-slate-500/20 text-slate-300" :
                      i === 2 ? "bg-orange-500/20 text-orange-400" :
                      "bg-muted/30 text-muted-foreground"
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">{m.qtde} OS · {fmtBRLShort(m.valor)}</p>
                    </div>
                    {m.emExecucao > 0 && (
                      <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30 flex-shrink-0">
                        {m.emExecucao} ativo
                      </Badge>
                    )}
                  </div>
                  {mecanicoExpandido === m.id && m.placas.length > 0 && (
                    <div className="mt-1 p-2 rounded-lg bg-muted/10 border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1.5">Placas trabalhadas:</p>
                      <div className="flex flex-wrap gap-1">
                        {m.placas.map(p => (
                          <span key={p} className="text-xs font-mono bg-muted/30 px-2 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabela de OS ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              Ordens de Serviço
              <Badge variant="secondary" className="text-xs">{osFiltradas.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar OS, placa, cliente..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="h-8 pl-7 text-xs w-48"
                />
              </div>
              {/* Filtro consultor */}
              <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <Users className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Consultor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos consultores</SelectItem>
                  {colaboradores.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Filtro mecânico */}
              <Select value={filtroMecanico} onValueChange={setFiltroMecanico}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <Wrench className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Mecânico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos mecânicos</SelectItem>
                  {mecanicos.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Filtro status */}
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {STATUS_ORDER.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="px-4 pb-6 space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-10 bg-muted/20 rounded animate-pulse" />
              ))}
            </div>
          ) : osFiltradas.length === 0 ? (
            <div className="px-4 pb-8 text-center py-8">
              <Car className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma OS em {MESES[periodoMes]} {periodoAno}.</p>
              <p className="text-xs text-muted-foreground mt-1">Tente navegar para outro mês ou remover os filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs pl-4 w-24">OS</TableHead>
                    <TableHead className="text-xs w-44">Status</TableHead>
                    <TableHead className="text-xs w-24">Placa</TableHead>
                    <TableHead className="text-xs">Veículo</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Mecânico</TableHead>
                    <TableHead className="text-xs w-20">Tempo</TableHead>
                    <TableHead className="text-xs text-right pr-4 w-28">Orçamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {osFiltradas.map(o => {
                    const sc = STATUS_COLORS[o.status] ?? { bg: "bg-muted/20", text: "text-muted-foreground", dot: "bg-muted", border: "" };
                    const alerta = o.horasNoPatio > 48 && !["Entregue", "Cancelado"].includes(o.status);
                    const mec = mecanicos.find((m: any) => m.id === o.mecanicoId);
                    return (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => navigate(`/admin/os/${o.id}`)}
                      >
                        <TableCell className="pl-4 font-mono text-xs font-semibold text-primary">{o.numeroOs}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">{o.placa}</TableCell>
                        <TableCell className="text-xs">{o.marca !== "--" ? `${o.marca} ${o.modelo}` : o.motivoVisita}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{o.nomeCliente}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{mec?.nome ?? "—"}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${alerta ? "text-rose-400" : "text-muted-foreground"}`}>
                            {alerta && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                            {fmtHoras(o.horasNoPatio)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right pr-4 font-medium">
                          {o.totalOrcamento > 0 ? fmtBRL(o.totalOrcamento) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color, delta, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  delta?: number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground leading-tight">{label}</span>
          {icon}
        </div>
        <div className={`font-bold text-2xl ${color}`}>{value}</div>
        <div className="flex items-center justify-between mt-1">
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          {delta !== undefined && Math.abs(delta) > 0.5 && (
            <span className={`text-xs font-medium flex items-center gap-0.5 ${delta >= 0 ? "text-green-400" : "text-rose-400"}`}>
              {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(0)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
