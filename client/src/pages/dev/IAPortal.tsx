import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Brain, Bot, Zap, Activity, MessageSquare, Crown,
  ChevronRight, Cpu, Sparkles, CheckCircle2, Send,
  ArrowRight, RefreshCw, Database, TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type AgentId = "sophia" | "simone" | "raena";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agente?: AgentId;
  delegado?: boolean;
  motivo?: string;
  timestamp: Date;
  kommoContext?: { source: string; leadCount: number }; // contexto Kommo injetado
}

// ─── Configurações visuais dos agentes ───────────────────────────────────────
const AGENT_VISUAL: Record<AgentId, {
  name: string; emoji: string; role: string;
  color: string; bg: string; border: string; glow: string;
  dominio: string; descricao: string;
}> = {
  sophia: {
    name: "Sophia", emoji: "👑", role: "Orquestradora Central",
    color: "#c8a96e", bg: "rgba(200,169,110,0.08)", border: "rgba(200,169,110,0.3)", glow: "rgba(200,169,110,0.15)",
    dominio: "Estratégia & Delegação",
    descricao: "Recebe qualquer demanda, analisa e decide: Simone (sistema interno) ou Raena (Kommo CRM).",
  },
  simone: {
    name: "Simone", emoji: "🧠", role: "Inteligência Operacional",
    color: "#6eb5c8", bg: "rgba(110,181,200,0.08)", border: "rgba(110,181,200,0.3)", glow: "rgba(110,181,200,0.15)",
    dominio: "Sistema Interno",
    descricao: "OS ativas, pátio, mecânicos, agendamentos, faturamento, produtividade, pendências.",
  },
  raena: {
    name: "Raena", emoji: "🎯", role: "Inteligência Comercial",
    color: "#c86e9a", bg: "rgba(200,110,154,0.08)", border: "rgba(200,110,154,0.3)", glow: "rgba(200,110,154,0.15)",
    dominio: "Kommo CRM",
    descricao: "Leads, pipeline, qualificação de prospects, follow-up, distribuição para consultores.",
  },
};

// ─── Componente: Card do Agente ───────────────────────────────────────────────
function AgentCard({ agentId, config, isActive }: {
  agentId: AgentId;
  config?: { temperature: number; maxTokens: number; model: string; ativo: boolean };
  isActive: boolean;
}) {
  const v = AGENT_VISUAL[agentId];
  return (
    <Card
      className="relative overflow-hidden border transition-all"
      style={{
        borderColor: isActive ? v.color : v.border,
        background: v.bg,
        boxShadow: isActive ? `0 0 20px ${v.glow}` : undefined,
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: isActive ? `radial-gradient(circle at 50% 0%, ${v.glow} 0%, transparent 70%)` : undefined }} />
      <CardContent className="p-4 relative">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-xl border shrink-0"
            style={{ background: v.bg, borderColor: v.border }}>
            {v.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold" style={{ color: v.color }}>{v.name}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5"
                style={{ borderColor: v.border, color: v.color }}>
                {config?.ativo !== false ? "● ATIVO" : "○ PARADO"}
              </Badge>
              {isActive && (
                <Badge className="text-[10px] h-4 px-1.5 animate-pulse"
                  style={{ background: v.color, color: "#000" }}>
                  RESPONDENDO
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{v.role}</p>
            <p className="text-xs text-muted-foreground mt-1">{v.dominio}</p>
          </div>
        </div>
        {config && (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <div className="text-center p-1.5 rounded bg-background/50">
              <p className="text-[10px] text-muted-foreground font-mono">TEMP</p>
              <p className="text-xs font-bold" style={{ color: v.color }}>{config.temperature}</p>
            </div>
            <div className="text-center p-1.5 rounded bg-background/50">
              <p className="text-[10px] text-muted-foreground font-mono">TOKENS</p>
              <p className="text-xs font-bold" style={{ color: v.color }}>{config.maxTokens}</p>
            </div>
            <div className="text-center p-1.5 rounded bg-background/50">
              <p className="text-[10px] text-muted-foreground font-mono">MODELO</p>
              <p className="text-[10px] font-bold truncate" style={{ color: v.color }}>
                {config.model.split("-").slice(-1)[0]}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Componente: Mensagem do Chat ─────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const agente = msg.agente ? AGENT_VISUAL[msg.agente] : null;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm shrink-0 border ${
        isUser ? "bg-primary/10 border-primary/30" : ""
      }`}
        style={agente ? { background: agente.bg, borderColor: agente.border } : undefined}>
        {isUser ? "👤" : (agente?.emoji ?? "🤖")}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {/* Delegação badge */}
        {msg.delegado && msg.agente && msg.motivo && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span style={{ color: AGENT_VISUAL.sophia.color }}>Sophia</span>
            <ArrowRight className="h-2.5 w-2.5" />
            <span style={{ color: AGENT_VISUAL[msg.agente].color }}>{AGENT_VISUAL[msg.agente].name}</span>
            <span className="opacity-60">· {msg.motivo}</span>
          </div>
        )}
        {/* Badge Kommo Context — aparece quando Raena responde com dados reais */}
        {msg.agente === "raena" && msg.kommoContext && (
          <div className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border"
            style={{ borderColor: AGENT_VISUAL.raena.border, background: AGENT_VISUAL.raena.bg, color: AGENT_VISUAL.raena.color }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono font-bold">
              {msg.kommoContext.source === "kommo_api"
                ? `Kommo API · ${msg.kommoContext.leadCount} leads`
                : msg.kommoContext.source === "db_cache"
                ? "Banco local (cache)"
                : "Contexto indisponível"}
            </span>
          </div>
        )}

        <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        }`}
          style={!isUser && agente ? { borderLeft: `2px solid ${agente.color}` } : undefined}>
          {!isUser && agente && (
            <p className="text-[10px] font-mono font-bold mb-1 opacity-70" style={{ color: agente.color }}>
              {agente.name.toUpperCase()}
            </p>
          )}
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>

        <p className="text-[10px] text-muted-foreground px-1">
          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function IAPortal() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou a Sophia, orquestradora central do ecossistema de IAs da Doctor Auto Prime.\n\nPode me perguntar qualquer coisa — sobre OS ativas, leads no Kommo, produtividade, faturamento. Vou analisar e delegar para a Simone (sistema interno) ou Raena (CRM) conforme necessário.",
      agente: "sophia",
      delegado: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const [chatMode, setChatMode] = useState<"orquestrado" | AgentId>("orquestrado");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: agentConfigs, refetch: refetchConfigs } = trpc.agentes.list.useQuery();

  const orquestrarMutation = trpc.agentes.orquestrar.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `resp-${Date.now()}`,
          role: "assistant" as const,
          content: (data.resposta as string) || "",
          agente: data.agente as AgentId,
          delegado: data.delegado,
          motivo: data.motivo,
          timestamp: new Date(),
          kommoContext: data.kommoContext as { source: string; leadCount: number } | undefined,
        },
      ]);
      setActiveAgent(null);
    },
    onError: (err) => {
      toast.error("Erro ao processar mensagem", { description: err.message });
      setActiveAgent(null);
    },
  });

  const chatMutation = trpc.agentes.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `resp-${Date.now()}`,
          role: "assistant" as const,
          content: (data.resposta as string) || "",
          agente: data.agente as AgentId,
          delegado: false,
          timestamp: new Date(),
        },
      ]);
      setActiveAgent(null);
    },
    onError: (err) => {
      toast.error("Erro ao processar mensagem", { description: err.message });
      setActiveAgent(null);
    },
  });

  const isLoading = orquestrarMutation.isPending || chatMutation.isPending;

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const historico = messages
      .filter((m) => m.id !== "welcome")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    if (chatMode === "orquestrado") {
      setActiveAgent("sophia");
      orquestrarMutation.mutate({ mensagem: input.trim(), historico });
    } else {
      setActiveAgent(chatMode);
      chatMutation.mutate({ agentId: chatMode, mensagem: input.trim(), historico });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Chat limpo. Como posso ajudar?",
      agente: "sophia",
      delegado: false,
      timestamp: new Date(),
    }]);
  };

  const agentConfigMap = agentConfigs
    ? Object.fromEntries(agentConfigs.map((c) => [c.id, c]))
    : {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portal IA — Ecossistema de Agentes</h1>
            <p className="text-sm text-muted-foreground">Sophia orquestra · Simone monitora o sistema · Raena qualifica leads</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchConfigs()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar configs
        </Button>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-green-600 dark:text-green-400 font-semibold">3 AGENTES ATIVOS</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-xs text-muted-foreground">Modelo: gemini-2.5-flash</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-xs text-muted-foreground">System prompts: banco de dados</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-xs text-muted-foreground">Delegação: automática via Sophia</span>
      </div>

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="agentes">
            <Bot className="h-4 w-4 mr-2" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="fluxo">
            <Activity className="h-4 w-4 mr-2" />
            Fluxo de Delegação
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA CHAT ─────────────────────────────────────────────────────── */}
        <TabsContent value="chat" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Sidebar: seletor de agente */}
            <div className="space-y-3">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Modo de Chat</p>

              {/* Orquestrado */}
              <button
                onClick={() => setChatMode("orquestrado")}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  chatMode === "orquestrado"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">Orquestrado</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sophia decide para quem delegar</p>
              </button>

              <Separator />
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Direto</p>

              {(["sophia", "simone", "raena"] as AgentId[]).map((id) => {
                const v = AGENT_VISUAL[id];
                return (
                  <button
                    key={id}
                    onClick={() => setChatMode(id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      chatMode === id ? "border-current" : "border-border hover:border-current/50"
                    }`}
                    style={chatMode === id ? { borderColor: v.color, background: v.bg } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span>{v.emoji}</span>
                      <span className="text-sm font-semibold" style={{ color: v.color }}>{v.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.dominio}</p>
                  </button>
                );
              })}
            </div>

            {/* Chat principal */}
            <div className="lg:col-span-3 flex flex-col gap-3">
              {/* Indicador de agente ativo */}
              {activeAgent && (
                <div className="flex items-center gap-2 p-2 rounded-lg border animate-pulse"
                  style={{ borderColor: AGENT_VISUAL[activeAgent].border, background: AGENT_VISUAL[activeAgent].bg }}>
                  <Zap className="h-3.5 w-3.5" style={{ color: AGENT_VISUAL[activeAgent].color }} />
                  <span className="text-xs font-mono" style={{ color: AGENT_VISUAL[activeAgent].color }}>
                    {AGENT_VISUAL[activeAgent].name} está processando...
                  </span>
                </div>
              )}

              {/* Mensagens */}
              <Card className="flex-1">
                <ScrollArea className="h-[420px] p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <ChatBubble key={msg.id} msg={msg} />
                    ))}
                    {isLoading && !activeAgent && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm">🤖</div>
                        <div className="bg-muted rounded-xl px-4 py-2.5">
                          <div className="flex gap-1">
                            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    chatMode === "orquestrado"
                      ? "Pergunte qualquer coisa — Sophia vai decidir quem responde..."
                      : `Fale diretamente com ${AGENT_VISUAL[chatMode].name}...`
                  }
                  rows={2}
                  className="resize-none"
                  disabled={isLoading}
                />
                <div className="flex flex-col gap-2">
                  <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon" className="h-10 w-10">
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button onClick={clearChat} variant="outline" size="icon" className="h-10 w-10">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nova linha</p>
            </div>
          </div>
        </TabsContent>

        {/* ─── ABA AGENTES ──────────────────────────────────────────────────── */}
        <TabsContent value="agentes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["sophia", "simone", "raena"] as AgentId[]).map((id) => (
              <AgentCard
                key={id}
                agentId={id}
                config={agentConfigMap[id]}
                isActive={activeAgent === id}
              />
            ))}
          </div>

          {/* Descrições detalhadas */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["sophia", "simone", "raena"] as AgentId[]).map((id) => {
              const v = AGENT_VISUAL[id];
              return (
                <Card key={id} style={{ borderColor: v.border }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>{v.emoji}</span>
                      <span style={{ color: v.color }}>{v.name}</span>
                      <span className="text-muted-foreground font-normal">— {v.role}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>{v.descricao}</p>
                    <div className="flex items-center gap-2 pt-1">
                      {id === "simone" && <Database className="h-3.5 w-3.5" style={{ color: v.color }} />}
                      {id === "raena" && <TrendingUp className="h-3.5 w-3.5" style={{ color: v.color }} />}
                      {id === "sophia" && <Crown className="h-3.5 w-3.5" style={{ color: v.color }} />}
                      <span className="text-xs font-mono" style={{ color: v.color }}>{v.dominio}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 italic">
                      System prompt persistido no banco · chave: ia.agente.{id}.systemPrompt
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── ABA FLUXO ────────────────────────────────────────────────────── */}
        <TabsContent value="fluxo" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Fluxo de Orquestração e Delegação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Diagrama visual */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg border"
                  style={{ background: AGENT_VISUAL.sophia.bg, borderColor: AGENT_VISUAL.sophia.border }}>
                  <span className="text-lg">👑</span>
                  <div>
                    <p className="font-bold text-sm" style={{ color: AGENT_VISUAL.sophia.color }}>Sophia</p>
                    <p className="text-xs text-muted-foreground">Orquestradora</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg border"
                    style={{ background: AGENT_VISUAL.simone.bg, borderColor: AGENT_VISUAL.simone.border }}>
                    <span className="text-lg">🧠</span>
                    <div>
                      <p className="font-bold text-sm" style={{ color: AGENT_VISUAL.simone.color }}>Simone</p>
                      <p className="text-xs text-muted-foreground">OS, pátio, mecânicos, faturamento</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg border"
                    style={{ background: AGENT_VISUAL.raena.bg, borderColor: AGENT_VISUAL.raena.border }}>
                    <span className="text-lg">🎯</span>
                    <div>
                      <p className="font-bold text-sm" style={{ color: AGENT_VISUAL.raena.color }}>Raena</p>
                      <p className="text-xs text-muted-foreground">Leads, pipeline, qualificação</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-green-500/30 bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-bold text-sm text-green-600 dark:text-green-400">Resposta</p>
                    <p className="text-xs text-muted-foreground">Entregue ao usuário</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Regras de delegação */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">Regras de Delegação</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { trigger: "OS ativas, pátio, mecânicos", destino: "Simone", emoji: "🧠", color: AGENT_VISUAL.simone.color },
                    { trigger: "Agendamentos, produtividade", destino: "Simone", emoji: "🧠", color: AGENT_VISUAL.simone.color },
                    { trigger: "Faturamento, pendências internas", destino: "Simone", emoji: "🧠", color: AGENT_VISUAL.simone.color },
                    { trigger: "Leads no Kommo, pipeline", destino: "Raena", emoji: "🎯", color: AGENT_VISUAL.raena.color },
                    { trigger: "Qualificação de prospects", destino: "Raena", emoji: "🎯", color: AGENT_VISUAL.raena.color },
                    { trigger: "Follow-up, distribuição de leads", destino: "Raena", emoji: "🎯", color: AGENT_VISUAL.raena.color },
                    { trigger: "Estratégia, roadmap, ambíguo", destino: "Sophia", emoji: "👑", color: AGENT_VISUAL.sophia.color },
                    { trigger: "Preços e negociação → consultor humano", destino: "Bloqueado", emoji: "🚫", color: "#ef4444" },
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                      <span>{rule.emoji}</span>
                      <span className="text-muted-foreground flex-1">{rule.trigger}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-semibold shrink-0" style={{ color: rule.color }}>{rule.destino}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Configuração técnica */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Configuração Técnica</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(["sophia", "simone", "raena"] as AgentId[]).map((id) => {
                    const v = AGENT_VISUAL[id];
                    const cfg = agentConfigMap[id];
                    return (
                      <div key={id} className="p-3 rounded-lg border text-xs space-y-1.5"
                        style={{ borderColor: v.border, background: v.bg }}>
                        <p className="font-bold" style={{ color: v.color }}>{v.emoji} {v.name}</p>
                        <p className="text-muted-foreground">Temp: <span className="font-mono">{cfg?.temperature ?? "—"}</span></p>
                        <p className="text-muted-foreground">Max tokens: <span className="font-mono">{cfg?.maxTokens ?? "—"}</span></p>
                        <p className="text-muted-foreground">Modelo: <span className="font-mono">{cfg?.model ?? "—"}</span></p>
                        <p className="text-muted-foreground">Prompt: <span className="font-mono">ia.agente.{id}.systemPrompt</span></p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
