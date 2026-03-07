import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Wrench,
  DollarSign,
  TrendingUp,
  Car,
  ExternalLink,
  Zap,
  Timer,
  Trophy,
  AlertCircle,
  ChevronRight,
  Users,
  BarChart3,
  FileText,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS_ORDER = [
  "Diagnóstico",
  "Orçamento",
  "Aguardando Aprovação",
  "Aprovado",
  "Em Execução",
  "Aguardando Peça",
  "Pronto",
  "Entregue",
  "Cancelado",
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Diagnóstico":         { bg: "bg-amber-500/15",   text: "text-amber-400",   dot: "bg-amber-400" },
  "Orçamento":           { bg: "bg-orange-500/15",  text: "text-orange-400",  dot: "bg-orange-400" },
  "Aguardando Aprovação":{ bg: "bg-yellow-500/15",  text: "text-yellow-400",  dot: "bg-yellow-400" },
  "Aprovado":            { bg: "bg-sky-500/15",     text: "text-sky-400",     dot: "bg-sky-400" },
  "Em Execução":         { bg: "bg-purple-500/15",  text: "text-purple-400",  dot: "bg-purple-400" },
  "Aguardando Peça":     { bg: "bg-rose-500/15",    text: "text-rose-400",    dot: "bg-rose-400" },
  "Pronto":              { bg: "bg-green-500/15",   text: "text-green-400",   dot: "bg-green-400" },
  "Entregue":            { bg: "bg-slate-500/15",   text: "text-slate-400",   dot: "bg-slate-400" },
  "Cancelado":           { bg: "bg-red-500/15",     text: "text-red-400",     dot: "bg-red-400" },
};

const FUNIL_ATIVOS = [
  "Diagnóstico",
  "Orçamento",
  "Aguardando Aprovação",
  "Aprovado",
  "Em Execução",
  "Aguardando Peça",
  "Pronto",
];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function horasDesde(ts: string | Date | null | undefined): number {
  if (!ts) return 0;
  const diff = Date.now() - new Date(ts).getTime();
  return diff / (1000 * 60 * 60);
}

function fmtHoras(h: number): string {
  if (h < 24) return `${Math.floor(h)}h`;
  const d = Math.floor(h / 24);
  const hh = Math.floor(h % 24);
  return `${d}d ${hh}h`;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GestaoOSUltimate() {
  const [, navigate] = useLocation();
  const [filtroConsultor, setFiltroConsultor] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroMecanico, setFiltroMecanico] = useState("todos");
  const [mecanicoExpandido, setMecanicoExpandido] = useState<number | null>(null);

  // ── Dados ──────────────────────────────────────────────────────────────────
  const { data: osList, isLoading } = trpc.os.list.useQuery({ limit: 200 });
  const { data: mecanicosList } = trpc.mecanicos.list.useQuery();
  const { data: colaboradoresList } = trpc.colaboradores.list.useQuery();

  const rawItems: any[] = (osList as any)?.items ?? [];

  // Enriquece cada OS com dados planos
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
  })), [rawItems]);

  // Filtros
  const osFiltradas = useMemo(() => {
    let lista = osEnriquecidas;
    if (filtroConsultor !== "todos") lista = lista.filter(o => String(o.colaboradorId) === filtroConsultor);
    if (filtroStatus !== "todos") lista = lista.filter(o => o.status === filtroStatus);
    if (filtroMecanico !== "todos") lista = lista.filter(o => String(o.mecanicoId) === filtroMecanico);
    return lista;
  }, [osEnriquecidas, filtroConsultor, filtroStatus, filtroMecanico]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const ativas = osEnriquecidas.filter(o => !["Entregue", "Cancelado"].includes(o.status));
  const emExecucao = osEnriquecidas.filter(o => o.status === "Em Execução");
  const aguardAprov = osEnriquecidas.filter(o => o.status === "Aguardando Aprovação");
  const prontas = osEnriquecidas.filter(o => o.status === "Pronto");
  const entregues = osEnriquecidas.filter(o => o.status === "Entregue");
  const faturamentoMes = entregues.reduce((acc, o) => acc + o.valorTotalOs, 0);
  const orcamentoAtivo = ativas.reduce((acc, o) => acc + o.totalOrcamento, 0);
  const ticketMedio = entregues.length > 0 ? faturamentoMes / entregues.length : 0;

  // ── Funil de status ────────────────────────────────────────────────────────
  const funilData = FUNIL_ATIVOS.map(s => ({
    status: s,
    count: osEnriquecidas.filter(o => o.status === s).length,
    color: STATUS_COLORS[s],
  }));
  const maxFunil = Math.max(...funilData.map(f => f.count), 1);

  // ── Alertas ────────────────────────────────────────────────────────────────
  const alertasParadas = ativas.filter(o => o.horasNoPatio > 48);
  const alertasOrcamento = osEnriquecidas.filter(o => o.status === "Aguardando Aprovação" && o.horasNoPatio > 24);

  // ── Ranking mecânicos ──────────────────────────────────────────────────────
  const rankingMecanicos = useMemo(() => {
    const map: Record<number, { id: number; nome: string; qtde: number; valor: number; placas: string[] }> = {};
    osEnriquecidas.forEach(o => {
      if (!o.mecanicoId) return;
      if (!map[o.mecanicoId]) {
        const mec = (mecanicosList as any[])?.find((m: any) => m.id === o.mecanicoId);
        map[o.mecanicoId] = { id: o.mecanicoId, nome: mec?.nome ?? `Mec #${o.mecanicoId}`, qtde: 0, valor: 0, placas: [] };
      }
      map[o.mecanicoId].qtde++;
      map[o.mecanicoId].valor += o.valorTotalOs;
      if (o.placa && o.placa !== "--") map[o.mecanicoId].placas.push(o.placa);
    });
    return Object.values(map).sort((a, b) => b.qtde - a.qtde);
  }, [osEnriquecidas, mecanicosList]);

  // ── Mix de serviços (por motivo/tipo) ─────────────────────────────────────
  // Classificação simples por valor do orçamento
  const mixData = useMemo(() => {
    const rapido = ativas.filter(o => o.totalOrcamento < 1000);
    const medio = ativas.filter(o => o.totalOrcamento >= 1000 && o.totalOrcamento < 4000);
    const demorado = ativas.filter(o => o.totalOrcamento >= 4000 && o.totalOrcamento < 25000);
    const projeto = ativas.filter(o => o.totalOrcamento >= 25000);
    return [
      { label: "Rápido", count: rapido.length, meta: "R$1k–R$15k", color: "text-green-400", bg: "bg-green-500/10" },
      { label: "Médio", count: medio.length, meta: "R$4k–R$8k", color: "text-sky-400", bg: "bg-sky-500/10" },
      { label: "Demorado", count: demorado.length, meta: "R$25k+", color: "text-purple-400", bg: "bg-purple-500/10" },
      { label: "Projeto", count: projeto.length, meta: "Céu limite", color: "text-amber-400", bg: "bg-amber-500/10" },
    ];
  }, [ativas]);

  const colaboradores: any[] = (colaboradoresList as any) ?? [];
  const mecanicos: any[] = (mecanicosList as any) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">OS Ultimate</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Painel gerencial completo — ordens de serviço em tempo real
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/patio")}>
            <Car className="h-4 w-4 mr-1.5" />Pátio Kanban
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/os")}>
            <ExternalLink className="h-4 w-4 mr-1.5" />Lista de OS
          </Button>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard icon={<Car className="h-4 w-4 text-blue-400" />} label="No Pátio" value={ativas.length} color="text-blue-400" />
        <KpiCard icon={<Wrench className="h-4 w-4 text-purple-400" />} label="Em Execução" value={emExecucao.length} color="text-purple-400" />
        <KpiCard icon={<AlertTriangle className="h-4 w-4 text-yellow-400" />} label="Aguard. Aprovação" value={aguardAprov.length} color="text-yellow-400" />
        <KpiCard icon={<CheckCircle className="h-4 w-4 text-green-400" />} label="Prontos" value={prontas.length} color="text-green-400" />
        <KpiCard icon={<DollarSign className="h-4 w-4 text-emerald-400" />} label="Fat. Mês" value={fmtBRL(faturamentoMes)} color="text-emerald-400" small />
        <KpiCard icon={<TrendingUp className="h-4 w-4 text-sky-400" />} label="Ticket Médio" value={fmtBRL(ticketMedio)} color="text-sky-400" small />
      </div>

      {/* ── Alertas ────────────────────────────────────────────────────────── */}
      {(alertasParadas.length > 0 || alertasOrcamento.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {alertasParadas.length > 0 && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                  {alertasParadas.length} OS parada{alertasParadas.length > 1 ? "s" : ""} há mais de 48h
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5">
                {alertasParadas.slice(0, 4).map(o => (
                  <div key={o.id} className="flex items-center justify-between text-xs cursor-pointer hover:text-rose-300 transition-colors" onClick={() => navigate(`/admin/os/${o.id}`)}>
                    <span className="font-mono font-medium">{o.numeroOs}</span>
                    <span className="text-muted-foreground">{o.placa} · {o.status}</span>
                    <span className="text-rose-400 font-medium">{fmtHoras(o.horasNoPatio)}</span>
                  </div>
                ))}
                {alertasParadas.length > 4 && <p className="text-xs text-muted-foreground">+{alertasParadas.length - 4} mais...</p>}
              </CardContent>
            </Card>
          )}
          {alertasOrcamento.length > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
                  <Timer className="h-4 w-4" />
                  {alertasOrcamento.length} orçamento{alertasOrcamento.length > 1 ? "s" : ""} sem aprovação há +24h
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5">
                {alertasOrcamento.slice(0, 4).map(o => (
                  <div key={o.id} className="flex items-center justify-between text-xs cursor-pointer hover:text-yellow-300 transition-colors" onClick={() => navigate(`/admin/os/${o.id}`)}>
                    <span className="font-mono font-medium">{o.numeroOs}</span>
                    <span className="text-muted-foreground">{o.nomeCliente}</span>
                    <span className="text-yellow-400 font-medium">{fmtHoras(o.horasNoPatio)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Funil + Mix ────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Funil de status */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Funil de Status — OS Ativas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {funilData.map(f => (
              <div key={f.status} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-40 shrink-0">{f.status}</span>
                <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${f.color.dot}`}
                    style={{ width: `${Math.max((f.count / maxFunil) * 100, f.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className={`text-sm font-bold w-6 text-right ${f.color.text}`}>{f.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mix de serviços */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Mix de Serviços
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {mixData.map(m => (
              <div key={m.label} className={`rounded-lg p-3 ${m.bg}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${m.color}`}>{m.label}</span>
                  <span className={`text-xl font-bold ${m.color}`}>{m.count}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.meta}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Ranking de mecânicos ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Ranking de Mecânicos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {rankingMecanicos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum mecânico com OS atribuída.</p>
          ) : (
            <div className="space-y-2">
              {rankingMecanicos.map((m, i) => (
                <div key={m.id}>
                  <div
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => setMecanicoExpandido(mecanicoExpandido === m.id ? null : m.id)}
                  >
                    <span className={`text-sm font-bold w-5 text-center ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-600" : "text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium">{m.nome}</span>
                    <span className="text-xs text-muted-foreground">{m.qtde} OS</span>
                    <span className="text-xs font-medium text-emerald-400">{fmtBRL(m.valor)}</span>
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${mecanicoExpandido === m.id ? "rotate-90" : ""}`} />
                  </div>
                  {mecanicoExpandido === m.id && m.placas.length > 0 && (
                    <div className="ml-8 mt-1 mb-2 flex flex-wrap gap-1.5">
                      {m.placas.map(p => (
                        <span key={p} className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded border border-border">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tabela completa ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Todas as OS
              <span className="text-muted-foreground font-normal">({osFiltradas.length})</span>
            </CardTitle>
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="Consultor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos consultores</SelectItem>
                  {colaboradores.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroMecanico} onValueChange={setFiltroMecanico}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="Mecânico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos mecânicos</SelectItem>
                  {mecanicos.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-8 text-xs w-44">
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
            <div className="px-4 pb-4 text-sm text-muted-foreground">Carregando...</div>
          ) : osFiltradas.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground">Nenhuma OS encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs pl-4">OS</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Placa</TableHead>
                    <TableHead className="text-xs">Veículo</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Tempo</TableHead>
                    <TableHead className="text-xs text-right pr-4">Orçamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {osFiltradas.map(o => {
                    const sc = STATUS_COLORS[o.status] ?? { bg: "bg-muted/20", text: "text-muted-foreground", dot: "bg-muted" };
                    const alerta = o.horasNoPatio > 48 && !["Entregue", "Cancelado"].includes(o.status);
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
                        <TableCell className="text-xs">{o.marca} {o.modelo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{o.nomeCliente}</TableCell>
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

// ─── KPI Card helper ──────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color, small }: { icon: React.ReactNode; label: string; value: string | number; color: string; small?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground leading-tight">{label}</span>
          {icon}
        </div>
        <div className={`font-bold ${small ? "text-lg" : "text-2xl"} ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
