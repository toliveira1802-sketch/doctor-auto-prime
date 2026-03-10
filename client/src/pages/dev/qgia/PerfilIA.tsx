import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Brain, Save, RefreshCw, Zap, MessageSquare, Bot, Loader2, CheckCircle2, Database, Activity, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const MODELOS = [
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet (Recomendado)", tier: "premium" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku (Rápido)", tier: "fast" },
  { value: "gpt-4o", label: "GPT-4o (OpenAI)", tier: "premium" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Econômico)", tier: "fast" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Google)", tier: "premium" },
];

const DEFAULT_SYSTEM_PROMPT = `Você é Sophia, a IA orquestradora central da Doctor Auto Prime. Você é estratégica, analítica e orientada a dados. Sua missão é apoiar a equipe com insights sobre leads, agendamentos e performance da oficina. Responda sempre em português brasileiro, de forma direta e objetiva.`;

const CHAVES = {
  nome: "ia.perfil.nome",
  modelo: "ia.perfil.modelo",
  temperatura: "ia.perfil.temperatura",
  maxTokens: "ia.perfil.maxTokens",
  idioma: "ia.perfil.idioma",
  modoDebug: "ia.perfil.modoDebug",
  systemPrompt: "ia.perfil.systemPrompt",
};

export default function PerfilIA() {
  const [nome, setNome] = useState("Sophia");
  const [modelo, setModelo] = useState("claude-3-5-sonnet");
  const [temperatura, setTemperatura] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [idioma, setIdioma] = useState("pt-BR");
  const [modoDebug, setModoDebug] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [loaded, setLoaded] = useState(false);

  // Busca todas as configs do grupo ia.perfil
  const { data: configList, isLoading } = trpc.config.list.useQuery();
  // Busca a config ativa que o invokeLLM está usando agora (com cache de 60s)
  const { data: perfilAtivo, refetch: refetchPerfil } = trpc.config.getPerfilIA.useQuery();
  const utils = trpc.useUtils();

  const setMany = trpc.config.setMany.useMutation({
    onSuccess: () => {
      toast.success("Perfil da IA salvo no banco", {
        description: `Modelo: ${modelo} · Temperatura: ${temperatura}`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
      utils.config.list.invalidate();
      // Aguarda 1.5s para o cache do servidor expirar e refaz a query de config ativa
      setTimeout(() => refetchPerfil(), 1500);
    },
    onError: (e) => toast.error("Erro ao salvar: " + e.message),
  });

  // Carrega configs do banco quando disponíveis
  useEffect(() => {
    if (!configList || loaded) return;
    const map: Record<string, string> = {};
    for (const row of configList) {
      map[row.chave] = row.valor ?? "";
    }
    if (map[CHAVES.nome]) setNome(map[CHAVES.nome]);
    if (map[CHAVES.modelo]) setModelo(map[CHAVES.modelo]);
    if (map[CHAVES.temperatura]) setTemperatura(parseFloat(map[CHAVES.temperatura]));
    if (map[CHAVES.maxTokens]) setMaxTokens(parseInt(map[CHAVES.maxTokens]));
    if (map[CHAVES.idioma]) setIdioma(map[CHAVES.idioma]);
    if (map[CHAVES.modoDebug]) setModoDebug(map[CHAVES.modoDebug] === "true");
    if (map[CHAVES.systemPrompt]) setSystemPrompt(map[CHAVES.systemPrompt]);
    setLoaded(true);
  }, [configList, loaded]);

  const handleSave = () => {
    setMany.mutate([
      { chave: CHAVES.nome, valor: nome },
      { chave: CHAVES.modelo, valor: modelo },
      { chave: CHAVES.temperatura, valor: String(temperatura) },
      { chave: CHAVES.maxTokens, valor: String(maxTokens) },
      { chave: CHAVES.idioma, valor: idioma },
      { chave: CHAVES.modoDebug, valor: String(modoDebug) },
      { chave: CHAVES.systemPrompt, valor: systemPrompt },
    ]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando configurações do banco...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Perfil da IA</h1>
            <p className="text-sm text-muted-foreground">Configure a identidade e parâmetros do agente principal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <Database className="h-3 w-3" />
            system_config
          </Badge>
          <Button onClick={handleSave} disabled={setMany.isPending}>
            {setMany.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Perfil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identidade */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Identidade do Agente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Agente</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Sophia" />
            </div>
            <div className="space-y-2">
              <Label>Idioma Principal</Label>
              <Select value={idioma} onValueChange={setIdioma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português Brasileiro</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Modo Debug</Label>
                <p className="text-xs text-muted-foreground">Exibe tokens e latência nas respostas</p>
              </div>
              <Switch checked={modoDebug} onCheckedChange={setModoDebug} />
            </div>
          </CardContent>
        </Card>

        {/* Modelo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Modelo de Linguagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo Ativo</Label>
              <Select value={modelo} onValueChange={setModelo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                        <Badge variant="outline" className="text-[10px]">{m.tier}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Temperatura: <span className="text-primary font-bold">{temperatura}</span></Label>
              <Slider
                value={[temperatura]}
                onValueChange={([v]) => setTemperatura(v)}
                min={0} max={1} step={0.05}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Determinístico</span>
                <span>Criativo</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Tokens: <span className="text-primary font-bold">{maxTokens}</span></Label>
              <Slider
                value={[maxTokens]}
                onValueChange={([v]) => setMaxTokens(v)}
                min={256} max={8192} step={256}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>256</span>
                <span>8192</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              System Prompt
              <Badge variant="secondary" className="text-[10px] ml-auto">
                chave: ia.perfil.systemPrompt
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="font-mono text-xs resize-none"
              placeholder="Instruções do sistema para o agente de IA..."
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{systemPrompt.length} caracteres · ~{Math.ceil(systemPrompt.length / 4)} tokens</span>
              <Button variant="ghost" size="sm" onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Restaurar padrão
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Config Ativa no Servidor */}
        <Card className="md:col-span-2 bg-emerald-950/20 border-emerald-800/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Configuração Ativa no Servidor
              <Badge variant="outline" className="text-[10px] ml-auto border-emerald-700 text-emerald-400">
                invokeLLM usa estes valores
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perfilAtivo ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Modelo</p>
                  <p className="text-sm font-mono font-medium text-emerald-300">{perfilAtivo.modelo}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Temperatura</p>
                  <p className="text-sm font-mono font-medium text-emerald-300">{perfilAtivo.temperatura}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Max Tokens</p>
                  <p className="text-sm font-mono font-medium text-emerald-300">{perfilAtivo.maxTokens.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Modo Debug</p>
                  <p className="text-sm font-mono font-medium text-emerald-300">{perfilAtivo.modoDebug ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="col-span-2 md:col-span-4 space-y-1">
                  <p className="text-xs text-muted-foreground">System Prompt (primeiros 120 chars)</p>
                  <p className="text-xs font-mono text-zinc-400 bg-zinc-900/50 rounded p-2 truncate">
                    {perfilAtivo.systemPrompt.slice(0, 120)}{perfilAtivo.systemPrompt.length > 120 ? "..." : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <AlertCircle className="h-4 w-4" />
                Carregando configuração ativa...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chaves no banco */}
        <Card className="md:col-span-2 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Database className="h-3.5 w-3.5" />
              Chaves salvas na tabela system_config
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CHAVES).map(([campo, chave]) => (
                <Badge key={chave} variant="outline" className="text-[10px] font-mono">
                  {chave}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
