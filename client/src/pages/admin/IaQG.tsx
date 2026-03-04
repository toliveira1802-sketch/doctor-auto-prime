import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bot, Zap, Users, RefreshCw, Play, CheckCircle2, AlertCircle,
  Flame, Thermometer, Snowflake, ChevronRight, Loader2, Brain,
  MessageSquare, TrendingUp, Target, Wifi, WifiOff,
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

// ── Helpers ────────────────────────────────────────────────────────────────────
const TEMP_CONFIG = {
  quente: { label: "Quente", icon: Flame, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", badge: "bg-red-500/20 text-red-300" },
  morno:  { label: "Morno",  icon: Thermometer, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "bg-amber-500/20 text-amber-300" },
  frio:   { label: "Frio",   icon: Snowflake, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", badge: "bg-blue-500/20 text-blue-300" },
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

// ── Agent Card ─────────────────────────────────────────────────────────────────
function AgentCard({
  name, description, icon: Icon, status, lastRun, metric, metricLabel, onRun, running, color,
}: {
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
          <Badge
            variant="outline"
            className={`text-xs ${
              status === "active" ? "border-green-500/50 text-green-400" :
              status === "error" ? "border-red-500/50 text-red-400" :
              "border-zinc-500/50 text-zinc-400"
            }`}
          >
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IaQG() {
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [analyses, setAnalyses] = useState<LeadAnalysis[]>([]);
  const [distributing, setDistributing] = useState<number | null>(null);
  const [distributorMap, setDistributorMap] = useState<Record<number, number>>({});

  // Queries
  const { data: kommoStatus } = trpc.kommo.status.useQuery();
  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = trpc.kommo.leads.useQuery(
    { limit: 50, page: 1 },
    { enabled: !!kommoStatus?.connected, retry: false }
  );
  const { data: colaboradores } = trpc.colaboradores.list.useQuery(undefined);

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

  const leads = leadsData?.leads ?? [];
  const consultores = (colaboradores ?? []).filter((c: any) => c.nivelAcessoId === 3 || c.nivelAcessoId === 1);

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
    distribuir.mutate({
      leadId: lead.leadId,
      leadName: lead.name,
      consultorId,
      temperatura: lead.temperature,
      resumo: lead.resumo,
    });
  };

  const analysisMap = Object.fromEntries(analyses.map((a) => [a.leadId, a]));

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

      {/* Kommo connection status */}
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border w-fit ${
        kommoStatus?.connected ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}>
        {kommoStatus?.connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        Kommo: {kommoStatus?.connected ? `Conectado — ${kommoStatus.domain}` : "Desconectado — acesse Sistema → Integrações para conectar"}
      </div>

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
        <AgentCard
          name="Relatório Diário"
          description="Gera e envia resumo do dia: OS abertas, faturamento, alertas de atraso"
          icon={Target}
          status="idle"
          metric="Em breve"
          color="border-zinc-500/30"
        />
        <AgentCard
          name="Agendamento Inteligente"
          description="Sugere horários ideais com base na capacidade do pátio e perfil do serviço"
          icon={Zap}
          status="idle"
          metric="Em breve"
          color="border-zinc-500/30"
        />
        <AgentCard
          name="Upsell Automático"
          description="Identifica oportunidades de upsell em OS abertas e notifica o consultor"
          icon={Users}
          status="idle"
          metric="Em breve"
          color="border-zinc-500/30"
        />
      </div>

      {/* Leads Panel */}
      {kommoStatus?.connected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-400" />
              Leads Kommo — Análise IA
            </h2>
            <div className="flex items-center gap-2">
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
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-primary border-primary" : "border-border"
                    }`}>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </div>

                    {/* Lead info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{lead.name || "Sem nome"}</span>
                        {lead.price > 0 && (
                          <span className="text-xs text-muted-foreground">R${lead.price?.toLocaleString("pt-BR")}</span>
                        )}
                        {lead.tags?.map((t: any) => (
                          <Badge key={t.id} variant="outline" className="text-xs h-4 px-1">{t.name}</Badge>
                        ))}
                      </div>
                      {lead.contacts?.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">{lead.contacts[0]?.name}</p>
                      )}
                    </div>

                    {/* Analysis result */}
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
                            <SelectTrigger className="h-7 w-36 text-xs">
                              <SelectValue placeholder="Consultor" />
                            </SelectTrigger>
                            <SelectContent>
                              {consultores.map((c: any) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => handleDistribuir(analysis)}
                            disabled={distributing === lead.id || !distributorMap[lead.id]}
                          >
                            {distributing === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                            Enviar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Date */}
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
    </div>
  );
}
