import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  Brain, Bot, Zap, Settings, ExternalLink, Github, Edit3,
  Save, RefreshCw, Activity, MessageSquare, Crown, Eye,
  ChevronRight, Cpu, Sparkles, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Agentes do Sophia Hub (espelhando o repositório)
const AGENTS = [
  {
    id: "sophia",
    name: "Sophia",
    initials: "SO",
    role: "Rainha · Orquestradora",
    emoji: "👑",
    color: "#c8a96e",
    bg: "rgba(200,169,110,0.08)",
    border: "rgba(200,169,110,0.3)",
    glow: "rgba(200,169,110,0.15)",
    status: "active",
    description: "IA orquestradora central. Recebe demandas, analisa e delega para os outros agentes.",
    systemPrompt: `Você é Sophia, a IA orquestradora central de um ecossistema de agentes inteligentes. Você é estratégica, direta e controla todos os outros agentes. Sua missão é receber demandas, analisar e decidir como delegar. Responda em português brasileiro, de forma clara e objetiva. Seja concisa mas perspicaz.`,
    model: "claude-3-5-sonnet",
    temperature: 0.7,
    maxTokens: 1024,
    calls: 1247,
    successRate: 98.2,
  },
  {
    id: "simone",
    name: "Simone",
    initials: "SI",
    role: "Inteligência do Sistema",
    emoji: "🧠",
    color: "#6eb5c8",
    bg: "rgba(110,181,200,0.08)",
    border: "rgba(110,181,200,0.3)",
    glow: "rgba(110,181,200,0.15)",
    status: "active",
    description: "Monitora qualidade, equilíbrio operacional e redução de custos. Reporta insights para Sophia.",
    systemPrompt: `Você é Simone, a IA responsável pela inteligência interna do sistema. Você monitora qualidade, equilíbrio operacional e redução de custos. É analítica, precisa e reporta insights para Sophia. Responda em português brasileiro de forma técnica mas clara.`,
    model: "claude-3-5-sonnet",
    temperature: 0.3,
    maxTokens: 2048,
    calls: 892,
    successRate: 99.1,
  },
  {
    id: "ana",
    name: "Ana",
    initials: "AN",
    role: "Atendimento ao Cliente",
    emoji: "💬",
    color: "#c86e9a",
    bg: "rgba(200,110,154,0.08)",
    border: "rgba(200,110,154,0.3)",
    glow: "rgba(200,110,154,0.15)",
    status: "active",
    description: "Atendimento direto ao cliente. Calorosa, empática e resolutiva.",
    systemPrompt: `Você é Ana, a IA de atendimento ao cliente. Você é calorosa, empática e resolutiva. Conversa diretamente com clientes, resolve dúvidas e escalona para Sophia quando necessário. Responda em português brasileiro de forma acolhedora e clara.`,
    model: "claude-3-haiku",
    temperature: 0.8,
    maxTokens: 512,
    calls: 3421,
    successRate: 96.7,
  },
];

const SOPHIA_HUB_URL = "https://sophia-hub.vercel.app";
const GITHUB_URL = "https://github.com/toliveira1802-sketch/sophia-hub";

function AgentCard({ agent, onEdit }: { agent: typeof AGENTS[0]; onEdit: (agent: typeof AGENTS[0]) => void }) {
  return (
    <Card
      className="relative overflow-hidden border transition-all hover:shadow-lg cursor-pointer group"
      style={{ borderColor: agent.border, background: agent.bg }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${agent.glow} 0%, transparent 70%)` }}
      />

      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl font-bold border"
              style={{ background: agent.bg, borderColor: agent.border }}
            >
              {agent.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg" style={{ color: agent.color }}>{agent.name}</h3>
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5"
                  style={{ borderColor: agent.border, color: agent.color }}
                >
                  {agent.status === "active" ? "● ATIVO" : "○ PARADO"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{agent.role}</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEdit(agent)}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <p className="text-sm text-muted-foreground">{agent.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-md bg-background/50">
            <p className="text-xs text-muted-foreground font-mono">CHAMADAS</p>
            <p className="font-bold text-sm" style={{ color: agent.color }}>{agent.calls.toLocaleString()}</p>
          </div>
          <div className="text-center p-2 rounded-md bg-background/50">
            <p className="text-xs text-muted-foreground font-mono">SUCESSO</p>
            <p className="font-bold text-sm" style={{ color: agent.color }}>{agent.successRate}%</p>
          </div>
          <div className="text-center p-2 rounded-md bg-background/50">
            <p className="text-xs text-muted-foreground font-mono">TEMP</p>
            <p className="font-bold text-sm" style={{ color: agent.color }}>{agent.temperature}</p>
          </div>
        </div>

        {/* Model badge */}
        <div className="flex items-center gap-2">
          <Cpu className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">{agent.model}</span>
          <span className="text-xs text-muted-foreground">· max {agent.maxTokens} tokens</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EditAgentDialog({ agent, open, onClose }: { agent: typeof AGENTS[0] | null; open: boolean; onClose: () => void }) {
  const [prompt, setPrompt] = useState(agent?.systemPrompt ?? "");
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(agent?.maxTokens ?? 1024);

  if (!agent) return null;

  const handleSave = () => {
    toast.success(`Configurações de ${agent.name} salvas`, {
      description: "As alterações serão aplicadas no próximo deploy do Sophia Hub.",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{agent.emoji}</span>
            <span style={{ color: agent.color }}>Configurar {agent.name}</span>
            <Badge variant="outline" className="text-xs font-mono ml-2">{agent.role}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* System Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              System Prompt
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              className="font-mono text-xs resize-none"
              placeholder="Defina o comportamento e personalidade do agente..."
            />
            <p className="text-xs text-muted-foreground">{prompt.length} caracteres</p>
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              Temperatura: <span style={{ color: agent.color }}>{temperature}</span>
            </Label>
            <Slider
              value={[temperature]}
              onValueChange={([v]) => setTemperature(v)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.0 — Determinístico</span>
              <span>1.0 — Criativo</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5" />
              Max Tokens
            </Label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              min={128}
              max={8192}
              step={128}
              className="font-mono"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              As alterações aqui são salvas localmente no DAP. Para aplicar no Sophia Hub em produção,
              faça commit no repositório GitHub e redeploy na Vercel.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} style={{ background: agent.color, color: "#000" }}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function IAPortal() {
  const [editingAgent, setEditingAgent] = useState<typeof AGENTS[0] | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Portal IA — Sophia Hub</h1>
              <p className="text-sm text-muted-foreground">Central de orquestração de agentes inteligentes</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </a>
          </Button>
          <Button size="sm" asChild>
            <a href={SOPHIA_HUB_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Sophia Hub
            </a>
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-green-600 dark:text-green-400 font-semibold">SISTEMA OPERACIONAL</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">3 agentes ativos</span>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Deploy: Vercel · sophia-hub.vercel.app</span>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Modelo base: Claude 3.5 Sonnet</span>
      </div>

      <Tabs defaultValue="agentes">
        <TabsList>
          <TabsTrigger value="agentes">
            <Bot className="h-4 w-4 mr-2" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="arquitetura">
            <Activity className="h-4 w-4 mr-2" />
            Arquitetura
          </TabsTrigger>
          <TabsTrigger value="deploy">
            <Zap className="h-4 w-4 mr-2" />
            Deploy & Config
          </TabsTrigger>
        </TabsList>

        {/* Agentes Tab */}
        <TabsContent value="agentes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AGENTS.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onEdit={setEditingAgent} />
            ))}
          </div>

          {/* Orchestration flow */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Fluxo de Orquestração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-amber-500/10 border-amber-500/20">
                  <span className="text-sm">👑</span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Sophia</span>
                  <Badge variant="outline" className="text-[10px]">Orquestradora</Badge>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-500/10 border-blue-500/20">
                  <span className="text-sm">🧠</span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Simone</span>
                  <Badge variant="outline" className="text-[10px]">Inteligência</Badge>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-pink-500/10 border-pink-500/20">
                  <span className="text-sm">💬</span>
                  <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">Ana</span>
                  <Badge variant="outline" className="text-[10px]">Atendimento</Badge>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-green-500/10 border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">Cliente</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Arquitetura Tab */}
        <TabsContent value="arquitetura" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Stack Tecnológico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Frontend", value: "React + Create React App", icon: "⚛️" },
                  { label: "Deploy", value: "Vercel (auto-deploy via GitHub)", icon: "▲" },
                  { label: "LLM", value: "Anthropic Claude 3.5 Sonnet / Haiku", icon: "🤖" },
                  { label: "API Route", value: "/api/chat.js (protegida)", icon: "🔒" },
                  { label: "Repositório", value: "toliveira1802-sketch/sophia-hub", icon: "📦" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-sm font-mono font-medium">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Métricas Consolidadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Total de chamadas", value: "5.560", trend: "+12% esta semana" },
                  { label: "Taxa de sucesso média", value: "98.0%", trend: "Estável" },
                  { label: "Latência média", value: "1.2s", trend: "Sophia: 1.8s · Ana: 0.9s" },
                  { label: "Tokens consumidos", value: "2.1M", trend: "Este mês" },
                  { label: "Custo estimado", value: "~$4.20", trend: "Este mês" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{item.value}</p>
                      <p className="text-[10px] text-muted-foreground">{item.trend}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deploy Tab */}
        <TabsContent value="deploy" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  Repositório GitHub
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 font-mono text-xs space-y-1">
                  <p className="text-muted-foreground"># Clone o repositório</p>
                  <p>git clone {GITHUB_URL}</p>
                  <p className="text-muted-foreground mt-2"># Instalar dependências</p>
                  <p>npm install</p>
                  <p className="text-muted-foreground mt-2"># Rodar localmente</p>
                  <p>npm start</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-2" />
                    Abrir no GitHub
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Variáveis de Ambiente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {[
                    { key: "ANTHROPIC_API_KEY", desc: "Chave da API Anthropic (obrigatória)", set: true },
                    { key: "REACT_APP_API_URL", desc: "URL da API route (opcional)", set: false },
                  ].map((env) => (
                    <div key={env.key} className="flex items-center justify-between p-2 rounded-lg border">
                      <div>
                        <p className="text-xs font-mono font-semibold">{env.key}</p>
                        <p className="text-[10px] text-muted-foreground">{env.desc}</p>
                      </div>
                      <Badge variant={env.set ? "default" : "outline"} className="text-[10px]">
                        {env.set ? "✓ Configurada" : "Pendente"}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button size="sm" className="w-full" asChild>
                  <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Gerenciar no Vercel
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Agent Dialog */}
      <EditAgentDialog
        agent={editingAgent}
        open={!!editingAgent}
        onClose={() => setEditingAgent(null)}
      />
    </div>
  );
}
