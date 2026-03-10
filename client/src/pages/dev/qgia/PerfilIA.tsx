import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Brain, Save, RefreshCw, Zap, MessageSquare, Bot } from "lucide-react";
import { toast } from "sonner";

const MODELOS = [
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet (Recomendado)", tier: "premium" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku (Rápido)", tier: "fast" },
  { value: "gpt-4o", label: "GPT-4o (OpenAI)", tier: "premium" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Econômico)", tier: "fast" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Google)", tier: "premium" },
];

export default function PerfilIA() {
  const [nome, setNome] = useState("Sophia");
  const [modelo, setModelo] = useState("claude-3-5-sonnet");
  const [temperatura, setTemperatura] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [idioma, setIdioma] = useState("pt-BR");
  const [modoDebug, setModoDebug] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    `Você é Sophia, a IA orquestradora central da Doctor Auto Prime. Você é estratégica, analítica e orientada a dados. Sua missão é apoiar a equipe com insights sobre leads, agendamentos e performance da oficina. Responda sempre em português brasileiro, de forma direta e objetiva.`
  );

  const handleSave = () => {
    toast.success("Perfil da IA salvo com sucesso", {
      description: `Modelo: ${modelo} · Temperatura: ${temperatura}`,
    });
  };

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
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Perfil
        </Button>
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
            </div>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              System Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="font-mono text-xs resize-none"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{systemPrompt.length} caracteres · ~{Math.ceil(systemPrompt.length / 4)} tokens</span>
              <Button variant="ghost" size="sm" onClick={() => setSystemPrompt("")}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
