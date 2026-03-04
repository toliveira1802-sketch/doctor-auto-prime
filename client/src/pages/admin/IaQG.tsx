/**
 * QG das IAs — Central de Comando dos Agentes de Inteligência Artificial
 * Abas: Agentes | Lead Scoring Dashboard
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend,
  LineChart, Line, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  Bot, Zap, Users, RefreshCw, Play, CheckCircle2, AlertCircle,
  Flame, Thermometer, Snowflake, ChevronRight, Loader2, Brain,
  MessageSquare, TrendingUp, TrendingDown, Target, Wifi, WifiOff, BarChart3,
  Trophy, Star, Trash2, DollarSign, History,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type LeadAnalysis = {
  leadId: number;
  name: string;
  temperature: "quente" | "morno" | "frio";
  serviceType: string;
  resumo: string;
  nextAction: string;
};

type LeadScore = {
  id: number;
  leadId: number;
  leadName: string | null;
  score: number;
  tier: string;
  temperature: string | null;
  serviceType: string | null;
  resumo: string | null;
  nextAction: string | null;
  breakdownValor: number | null;
  breakdownTemperatura: number | null;
  breakdownEngajamento: number | null;
  breakdownVeiculo: number | null;
  breakdownServico: number | null;
  breakdownRecencia: number | null;
  breakdownCompletude: number | null;
  consultorId: number | null;
  leadPrice: number | null;
  scoredAt: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const TEMP_CONFIG = {
  quente: { label: "Quente", icon: Flame,       color: "text-red-400",   bg: "bg-red-500/10 border-red-500/30",     badge: "bg-red-500/20 text-red-300",     chart: "#ef4444" },
  morno:  { label: "Morno",  icon: Thermometer, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "bg-amber-500/20 text-amber-300", chart: "#f59e0b" },
  frio:   { label: "Frio",   icon: Snowflake,   color: "text-blue-400",  bg: "bg-blue-500/10 border-blue-500/30",   badge: "bg-blue-500/20 text-blue-300",   chart: "#3b82f6" },
};

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; chart: string; min: number; max: number }> = {
  S: { label: "S-Tier", color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/40", chart: "#eab308", min: 90, max: 100 },
  A: { label: "A",      color: "text-green-400",  bg: "bg-green-500/20 border-green-500/40",   chart: "#22c55e", min: 75, max: 89  },
  B: { label: "B",      color: "text-blue-400",   bg: "bg-blue-500/20 border-blue-500/40",     chart: "#3b82f6", min: 55, max: 74  },
  C: { label: "C",      color: "text-orange-400", bg: "bg-orange-500/20 border-orange-500/40", chart: "#f97316", min: 35, max: 54  },
  D: { label: "D",      color: "text-zinc-400",   bg: "bg-zinc-500/20 border-zinc-500/40",     chart: "#71717a", min: 0,  max: 34  },
};

const SERVICE_LABELS: Record<string, string> = {
  rapido: "Rápido (≤2h)",
  medio: "Médio (2-8h)",
  projeto: "Projeto (8h+)",
  indefinido: "Indefinido",
};

const ACTION_LABELS: Record<string, string> = {
  schedule: "Agendar",
  handoff_consultant: "Passar p/ Consultor",
  nurture: "Nutrir",
};

const BREAKDOWN_LABELS = [
  { key: "breakdownValor",       label: "Valor",       max: 20,  color: "#22c55e" },
  { key: "breakdownTemperatura", label: "Temperatura", max: 25,  color: "#ef4444" },
  { key: "breakdownEngajamento", label: "Engajamento", max: 20,  color: "#8b5cf6" },
  { key: "breakdownVeiculo",     label: "Veículo",     max: 15,  color: "#3b82f6" },
  { key: "breakdownServico",     label: "Serviço",     max: 10,  color: "#f59e0b" },
  { key: "breakdownRecencia",    label: "Recência",    max: 10,  color: "#06b6d4" },
  { key: "breakdownCompletude",  label: "Completude",  max: 10,  color: "#ec4899" },
];

// ── Agent Card ─────────────────────────────────────────────────────────────────
function AgentCard({ name, description, icon: Icon, status, lastRun, metric, metricLabel, onRun, running, color }: {
  name: string; description: string; icon: React.ComponentType<any>;
  status: "active" | "idle" | "error"; lastRun?: string; metric?: number | string;
  metricLabel?: string; onRun?: () => void; running?: boolean; color: string;
}) {
  return (
    <Card className={`border ${color} relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${color.replace("border-", "bg-").split("/")[0]}`} />
      <CardHeader className="pb-2 pl-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${color.replace("border-", "bg-").split("/")[0]}/10`}>
              <Icon className={`h-5 w-5 ${color.replace("border-", "text-").split("/")[0]}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">{name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs ${
            status === "active" ? "border-green-500/50 text-green-400" :
            status === "error" ? "border-red-500/50 text-red-400" : "border-zinc-500/50 text-zinc-400"
          }`}>
            {status === "active" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : status === "error" ? <AlertCircle className="h-3 w-3 mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
            {status === "active" ? "Ativo" : status === "error" ? "Erro" : "Pronto"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pl-5 space-y-3">
        {metric !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{metric}</span>
            <span className="text-xs text-muted-foreground">{metricLabel}</span>
          </div>
        )}
        {lastRun && <p className="text-xs text-muted-foreground">Último disparo: {lastRun}</p>}
        {onRun && (
          <Button size="sm" variant="outline" className="w-full gap-2 mt-1" onClick={onRun} disabled={running}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {running ? "Executando..." : "Acionar Agente"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Score Badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG["D"]!;
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold ${cfg.bg} ${cfg.color}`}>
      {tier}
    </span>
  );
}

// ── Lead Score Row ─────────────────────────────────────────────────────────────
function ScoreRow({ score, rank, onDelete }: { score: LeadScore; rank: number; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const tempCfg = TEMP_CONFIG[score.temperature as keyof typeof TEMP_CONFIG];
  const TempIcon = tempCfg?.icon ?? Thermometer;

  const radarData = BREAKDOWN_LABELS.map((b) => ({
    subject: b.label,
    value: score[b.key as keyof LeadScore] as number ?? 0,
    fullMark: b.max,
  }));

  // Fetch history only when expanded
  const { data: historyData, isLoading: historyLoading } = trpc.leadScoring.history.useQuery(
    { leadId: score.leadId },
    { enabled: expanded, staleTime: 30_000 }
  );

  const historyChartData = (historyData ?? []).map((h: any) => ({
    date: new Date(h.scoredAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    score: h.score,
    tier: h.tier,
  }));

  const scoreDelta = historyChartData.length >= 2
    ? historyChartData[historyChartData.length - 1].score - historyChartData[historyChartData.length - 2].score
    : null;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Rank */}
        <span className="text-xs text-muted-foreground w-5 text-center flex-shrink-0">
          {rank <= 3 ? ["🥇","🥈","🥉"][rank - 1] : `#${rank}`}
        </span>

        {/* Tier badge */}
        <TierBadge tier={score.tier} />

        {/* Score bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">{score.leadName ?? `Lead #${score.leadId}`}</span>
            <span className="text-sm font-bold ml-2 flex-shrink-0">{score.score}/100</span>
          </div>
          <Progress value={score.score} className="h-1.5" />
        </div>

        {/* Temperature */}
        {tempCfg && (
          <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${tempCfg.color}`}>
            <TempIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tempCfg.label}</span>
          </div>
        )}

        {/* Valor */}
        {(score.leadPrice ?? 0) > 0 && (
          <span className="text-xs text-muted-foreground flex-shrink-0 hidden md:flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            R${(score.leadPrice ?? 0).toLocaleString("pt-BR")}
          </span>
        )}

        {/* Action */}
        <Badge variant="outline" className="text-xs flex-shrink-0 hidden sm:inline-flex">
          {ACTION_LABELS[score.nextAction ?? "nurture"] ?? score.nextAction}
        </Badge>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded: breakdown */}
      {expanded && (
        <div className="border-t border-border/50 p-4 bg-muted/10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Resumo */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Análise da IA</p>
            <p className="text-sm">{score.resumo ?? "—"}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-xs">{SERVICE_LABELS[score.serviceType ?? "indefinido"]}</Badge>
              <Badge variant="outline" className="text-xs">{ACTION_LABELS[score.nextAction ?? "nurture"]}</Badge>
            </div>
            {/* Breakdown bars */}
            <div className="space-y-1.5 mt-3">
              {BREAKDOWN_LABELS.map((b) => {
                const val = (score[b.key as keyof LeadScore] as number) ?? 0;
                const pct = Math.round((val / b.max) * 100);
                return (
                  <div key={b.key} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{b.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{val}/{b.max}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Radar chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#888" }} />
                <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* History chart — full width */}
          <div className="col-span-1 md:col-span-2 border-t border-border/30 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evolução do Score</p>
              </div>
              {scoreDelta !== null && (
                <div className={`flex items-center gap-1 text-xs font-semibold ${
                  scoreDelta > 0 ? "text-green-400" : scoreDelta < 0 ? "text-red-400" : "text-zinc-400"
                }`}>
                  {scoreDelta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : scoreDelta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                  {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts vs anterior
                </div>
              )}
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center h-28 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : historyChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-muted-foreground gap-2">
                <History className="h-6 w-6 opacity-40" />
                <p className="text-xs">Nenhum histórico ainda. Pontue este lead para iniciar o rastreamento.</p>
              </div>
            ) : historyChartData.length === 1 ? (
              <div className="flex flex-col items-center justify-center h-28 gap-1">
                <span className="text-3xl font-bold">{historyChartData[0].score}</span>
                <span className="text-xs text-muted-foreground">Primeira pontuação em {historyChartData[0].date}</span>
                <Badge variant="outline" className="text-xs mt-1">Pontue novamente para ver a evolução</Badge>
              </div>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#666" }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#666" }} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                      formatter={(val: any, _name: any, props: any) => [
                        <span key="val"><strong>{val}</strong>/100 — Tier <strong>{props.payload.tier}</strong></span>,
                        "Score"
                      ]}
                    />
                    <ReferenceLine y={score.score} stroke="#8b5cf6" strokeDasharray="4 2" label={{ value: "Atual", position: "right", fontSize: 9, fill: "#8b5cf6" }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#8b5cf6", stroke: "#18181b", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IaQG() {
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [analyses, setAnalyses] = useState<LeadAnalysis[]>([]);
  const [distributing, setDistributing] = useState<number | null>(null);
  const [distributorMap, setDistributorMap] = useState<Record<number, number>>({});
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterConsultor, setFilterConsultor] = useState<string>("all");
  const [scoringLeads, setScoringLeads] = useState(false);

  // Queries
  const { data: kommoStatus } = trpc.kommo.status.useQuery();
  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = trpc.kommo.leads.useQuery(
    { limit: 50, page: 1 },
    { enabled: !!kommoStatus?.connected, retry: false }
  );
  const { data: colaboradores } = trpc.colaboradores.list.useQuery(undefined);
  const { data: scoresData, isLoading: scoresLoading, refetch: refetchScores } = trpc.leadScoring.list.useQuery({
    tier: filterTier !== "all" ? filterTier : undefined,
    consultorId: filterConsultor !== "all" ? Number(filterConsultor) : undefined,
    limit: 100,
  });

  // Mutations
  const reactivation = trpc.kommo.runReactivation.useMutation({
    onSuccess: (r) => toast.success(`Reativação: ${r.sent} mensagens agendadas de ${r.processed} clientes.`),
    onError: (e) => toast.error(e.message),
  });

  const analisarLote = trpc.kommo.analisarLote.useMutation({
    onSuccess: (r) => {
      setAnalyses(r.results as LeadAnalysis[]);
      toast.success(`${r.total} leads analisados pela Ana!`);
    },
    onError: (e) => toast.error(e.message),
  });

  const distribuir = trpc.kommo.distribuir.useMutation({
    onSuccess: (r) => {
      toast.success(`Lead enviado para ${r.consultor}!`);
      setDistributing(null);
    },
    onError: (e) => { toast.error(e.message); setDistributing(null); },
  });

  const scoreLeads = trpc.leadScoring.scoreLeads.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.success} leads pontuados com sucesso!`);
      refetchScores();
      setScoringLeads(false);
    },
    onError: (e) => { toast.error(e.message); setScoringLeads(false); },
  });

  const deleteScore = trpc.leadScoring.deleteScore.useMutation({
    onSuccess: () => { toast.success("Score removido"); refetchScores(); },
    onError: (e) => toast.error(e.message),
  });

  const leads = leadsData?.leads ?? [];
  const consultores = (colaboradores ?? []).filter((c: any) => c.nivelAcessoId === 3 || c.nivelAcessoId === 1);
  const scores = scoresData?.scores ?? [];
  const stats = scoresData?.stats;

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) setSelectedLeads([]);
    else setSelectedLeads(leads.map((l: any) => l.id));
  };

  const handleAnalisar = () => {
    if (!selectedLeads.length) { toast.error("Selecione ao menos 1 lead"); return; }
    analisarLote.mutate({ leadIds: selectedLeads });
  };

  const handleDistribuir = (lead: LeadAnalysis) => {
    const consultorId = distributorMap[lead.leadId];
    if (!consultorId) { toast.error("Selecione um consultor"); return; }
    setDistributing(lead.leadId);
    distribuir.mutate({ leadId: lead.leadId, leadName: lead.name, consultorId, temperatura: lead.temperature, resumo: lead.resumo });
  };

  const handleScoreLeads = () => {
    if (!selectedLeads.length) { toast.error("Selecione ao menos 1 lead para pontuar"); return; }
    setScoringLeads(true);
    const leadsToScore = leads
      .filter((l: any) => selectedLeads.includes(l.id))
      .map((l: any) => ({
        id: l.id,
        name: l.name ?? "",
        price: l.price ?? 0,
        temperature: l.temperature ?? "morno",
        pipeline: l.pipeline ?? "",
        serviceType: l.serviceType ?? "",
        placa: l.placa ?? "",
        marca: l.marca ?? "",
        modelo: l.modelo ?? "",
        lastMessage: l.lastMessage ?? "",
        createdAt: l.created_at ?? undefined,
      }));
    scoreLeads.mutate({ leads: leadsToScore });
  };

  const analysisMap = Object.fromEntries(analyses.map((a) => [a.leadId, a]));

  // Chart data
  const tempChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Quente", value: stats.byTemp.quente ?? 0, color: "#ef4444" },
      { name: "Morno",  value: stats.byTemp.morno ?? 0,  color: "#f59e0b" },
      { name: "Frio",   value: stats.byTemp.frio ?? 0,   color: "#3b82f6" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const tierChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(TIER_CONFIG).map(([tier, cfg]) => ({
      tier,
      label: cfg.label,
      count: stats.byTier[tier] ?? 0,
      color: cfg.chart,
    }));
  }, [stats]);

  const avgBreakdownData = useMemo(() => {
    if (!scores.length) return [];
    return BREAKDOWN_LABELS.map((b) => {
      const avg = scores.reduce((sum: number, s: LeadScore) => sum + ((s[b.key as keyof LeadScore] as number) ?? 0), 0) / scores.length;
      return { subject: b.label, avg: Math.round(avg * 10) / 10, fullMark: b.max, fill: b.color };
    });
  }, [scores]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          QG das IAs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Central de comando dos agentes de inteligência artificial</p>
      </div>

      {/* Kommo status */}
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border w-fit ${
        kommoStatus?.connected ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}>
        {kommoStatus?.connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        Kommo: {kommoStatus?.connected ? `Conectado — ${kommoStatus.domain}` : "Desconectado — acesse Sistema → Integrações para conectar"}
      </div>

      <Tabs defaultValue="agentes">
        <TabsList className="mb-2">
          <TabsTrigger value="agentes" className="gap-2"><Bot className="h-4 w-4" />Agentes</TabsTrigger>
          <TabsTrigger value="scoring" className="gap-2"><BarChart3 className="h-4 w-4" />Lead Scoring</TabsTrigger>
        </TabsList>

        {/* ── ABA: AGENTES ─────────────────────────────────────────────────────── */}
        <TabsContent value="agentes" className="space-y-6 mt-0">
          {/* Agent Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AgentCard
              name="Ana — Qualificação"
              description="Classifica leads do WhatsApp em quente/morno/frio e coleta dados do veículo"
              icon={MessageSquare}
              status={kommoStatus?.connected ? "active" : "idle"}
              metric={leads.filter((l: any) => l.tags?.some((t: any) => t.name?.includes("Quente"))).length}
              metricLabel="leads quentes hoje"
              color="border-violet-500/30"
            />
            <AgentCard
              name="Reativação 90d"
              description="Varre clientes inativos há 90+ dias e cria tarefas de follow-up no Kommo"
              icon={RefreshCw}
              status="idle"
              metric="—"
              metricLabel="último disparo"
              onRun={() => reactivation.mutate()}
              running={reactivation.isPending}
              color="border-cyan-500/30"
            />
            <AgentCard
              name="Análise de Leads"
              description="IA analisa leads em lote, classifica temperatura e distribui para consultores"
              icon={TrendingUp}
              status={kommoStatus?.connected ? "active" : "idle"}
              metric={leads.length}
              metricLabel="leads no Kommo"
              color="border-amber-500/30"
            />
            <AgentCard name="Relatório Diário" description="Gera e envia resumo do dia: OS abertas, faturamento, alertas de atraso" icon={Target} status="idle" metric="Em breve" color="border-zinc-500/30" />
            <AgentCard name="Agendamento Inteligente" description="Sugere horários ideais com base na capacidade do pátio e perfil do serviço" icon={Zap} status="idle" metric="Em breve" color="border-zinc-500/30" />
            <AgentCard name="Upsell Automático" description="Identifica oportunidades de upsell em OS abertas e notifica o consultor" icon={Users} status="idle" metric="Em breve" color="border-zinc-500/30" />
          </div>

          {/* Leads Panel */}
          {kommoStatus?.connected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-400" />
                  Leads Kommo — Análise IA
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => refetchLeads()} disabled={leadsLoading}>
                    <RefreshCw className={`h-3.5 w-3.5 ${leadsLoading ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSelectAll}>
                    {selectedLeads.length === leads.length && leads.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-violet-600 hover:bg-violet-700"
                    onClick={handleAnalisar}
                    disabled={analisarLote.isPending || !selectedLeads.length}
                  >
                    {analisarLote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                    {analisarLote.isPending ? "Analisando..." : `Analisar ${selectedLeads.length > 0 ? `(${selectedLeads.length})` : ""}`}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-amber-600 hover:bg-amber-700"
                    onClick={handleScoreLeads}
                    disabled={scoringLeads || !selectedLeads.length}
                  >
                    {scoringLeads ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                    {scoringLeads ? "Pontuando..." : `Pontuar (${selectedLeads.length})`}
                  </Button>
                </div>
              </div>

              {leadsLoading && (
                <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Carregando leads do Kommo...
                </div>
              )}
              {!leadsLoading && leads.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhum lead encontrado no Kommo
                </div>
              )}
              {!leadsLoading && leads.length > 0 && (
                <div className="grid gap-2">
                  {leads.map((lead: any) => {
                    const analysis = analysisMap[lead.id];
                    const isSelected = selectedLeads.includes(lead.id);
                    const tempCfg = analysis ? TEMP_CONFIG[analysis.temperature as keyof typeof TEMP_CONFIG] : null;
                    const TempIcon = tempCfg?.icon;
                    return (
                      <div
                        key={lead.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border"
                        } ${analysis ? tempCfg?.bg : ""}`}
                        onClick={() => setSelectedLeads((prev) =>
                          prev.includes(lead.id) ? prev.filter((id) => id !== lead.id) : [...prev, lead.id]
                        )}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                          {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{lead.name || "Sem nome"}</span>
                            {lead.price > 0 && <span className="text-xs text-muted-foreground">R${lead.price?.toLocaleString("pt-BR")}</span>}
                            {lead.tags?.map((t: any) => <Badge key={t.id} variant="outline" className="text-xs h-4 px-1">{t.name}</Badge>)}
                          </div>
                          {lead.contacts?.length > 0 && <p className="text-xs text-muted-foreground truncate">{lead.contacts[0]?.name}</p>}
                        </div>
                        {analysis && (
                          <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right hidden sm:block">
                              <div className={`flex items-center gap-1 text-xs font-medium ${tempCfg?.color}`}>
                                {TempIcon && <TempIcon className="h-3.5 w-3.5" />}
                                {tempCfg?.label}
                              </div>
                              <p className="text-xs text-muted-foreground">{SERVICE_LABELS[analysis.serviceType]}</p>
                              <p className="text-xs text-muted-foreground max-w-[200px] truncate">{analysis.resumo}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">{ACTION_LABELS[analysis.nextAction]}</Badge>
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={distributorMap[lead.id] ? String(distributorMap[lead.id]) : ""}
                                onValueChange={(v) => setDistributorMap((prev) => ({ ...prev, [lead.id]: Number(v) }))}
                              >
                                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Consultor" /></SelectTrigger>
                                <SelectContent>
                                  {consultores.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => handleDistribuir(analysis)} disabled={distributing === lead.id || !distributorMap[lead.id]}>
                                {distributing === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                                Enviar
                              </Button>
                            </div>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground flex-shrink-0 hidden md:block">
                          {lead.created_at ? new Date(lead.created_at * 1000).toLocaleDateString("pt-BR") : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── ABA: LEAD SCORING ────────────────────────────────────────────────── */}
        <TabsContent value="scoring" className="space-y-6 mt-0">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Total Pontuados</p>
                <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Score Médio</p>
                <p className="text-2xl font-bold">{stats?.avgScore ?? 0}<span className="text-sm text-muted-foreground">/100</span></p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/30">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">S-Tier (Alta Prior.)</p>
                <p className="text-2xl font-bold text-yellow-400">{stats?.byTier?.S ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/30">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
                <p className="text-2xl font-bold text-green-400">
                  R${((stats?.totalValorEstimado ?? 0) / 1000).toFixed(1)}k
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Temperatura Pie */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-red-400" /> Temperatura
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tempChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={tempChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                        {tempChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                )}
              </CardContent>
            </Card>

            {/* Tier Bar */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-400" /> Distribuição por Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tierChartData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={tierChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="tier" tick={{ fontSize: 11, fill: "#888" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                      <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {tierChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                )}
              </CardContent>
            </Card>

            {/* Avg Breakdown Radar */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-violet-400" /> Perfil Médio de Engajamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {avgBreakdownData.length > 0 && scores.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <RadarChart data={avgBreakdownData}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#888" }} />
                      <Radar name="Média" dataKey="avg" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filters + Ranking */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                Ranking de Leads
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tiers</SelectItem>
                    {Object.entries(TIER_CONFIG).map(([t, cfg]) => (
                      <SelectItem key={t} value={t}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterConsultor} onValueChange={setFilterConsultor}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Consultor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {consultores.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => refetchScores()} disabled={scoresLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 ${scoresLoading ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              </div>
            </div>

            {scoresLoading && (
              <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Carregando scores...
              </div>
            )}

            {!scoresLoading && scores.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                <Star className="h-8 w-8 opacity-30" />
                <p>Nenhum lead pontuado ainda.</p>
                <p className="text-xs">Selecione leads na aba Agentes e clique em "Pontuar".</p>
              </div>
            )}

            {!scoresLoading && scores.length > 0 && (
              <div className="space-y-2">
                {scores.map((score: LeadScore, idx: number) => (
                  <ScoreRow
                    key={score.id}
                    score={score}
                    rank={idx + 1}
                    onDelete={() => deleteScore.mutate({ leadId: score.leadId })}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
