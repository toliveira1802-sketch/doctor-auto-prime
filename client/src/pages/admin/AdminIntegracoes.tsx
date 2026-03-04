import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Bot,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Users,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminIntegracoes() {
  const [location] = useLocation();
  const [kommoStatus, setKommoStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [connecting, setConnecting] = useState(false);

  // Check Kommo connection status
  const checkKommoStatus = async () => {
    try {
      const res = await fetch("/api/kommo/status");
      const data = await res.json();
      setKommoStatus(data.connected ? "connected" : "disconnected");
    } catch {
      setKommoStatus("disconnected");
    }
  };

  useEffect(() => {
    checkKommoStatus();
  }, []);

  // Handle OAuth callback result from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const kommoParam = params.get("kommo");
    if (kommoParam === "success") {
      toast.success("Kommo conectado com sucesso!");
      setKommoStatus("connected");
    } else if (kommoParam === "error") {
      const msg = params.get("msg") || "Erro desconhecido";
      toast.error(`Erro ao conectar Kommo: ${msg}`);
      setKommoStatus("disconnected");
    }
  }, []);

  const handleConnectKommo = async () => {
    setConnecting(true);
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/kommo/auth-url?origin=${encodeURIComponent(origin)}`);
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      toast.error("Erro ao gerar link de autorização");
      setConnecting(false);
    }
  };

  // AI Agent config via tRPC
  const configQuery = trpc.config.get.useQuery({ chave: "ia_atendimento_ativo" });
  const reativacaoQuery = trpc.config.get.useQuery({ chave: "ia_reativacao_ativa" });
  const configSet = trpc.config.set.useMutation({
    onSuccess: () => {
      configQuery.refetch();
      reativacaoQuery.refetch();
    },
  });

  const iaAtivo = configQuery.data?.valor === "true";
  const reativacaoAtiva = reativacaoQuery.data?.valor === "true";

  const toggleIA = (key: string, current: boolean) => {
    configSet.mutate({
      chave: key,
      valor: (!current).toString(),
      descricao: key === "ia_atendimento_ativo"
        ? "Agente de IA para atendimento de leads no Kommo"
        : "Agente de IA para reativação de clientes inativos",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrações</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Conecte o sistema com o Kommo CRM e configure os agentes de IA.
        </p>
      </div>

      {/* Kommo Connection Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF5722]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FF5722]" />
              </div>
              <div>
                <CardTitle className="text-white text-base">Kommo CRM</CardTitle>
                <CardDescription className="text-zinc-400 text-xs">
                  doctorautobosch.kommo.com
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {kommoStatus === "checking" && (
                <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verificando...
                </Badge>
              )}
              {kommoStatus === "connected" && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
                </Badge>
              )}
              {kommoStatus === "disconnected" && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                  <XCircle className="w-3 h-3 mr-1" /> Desconectado
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-400 text-sm">
            Conecte o Kommo para sincronizar leads, disparar mensagens via WhatsApp e ativar os agentes de IA de atendimento e reativação.
          </p>

          {kommoStatus === "disconnected" && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-300">
                <p className="font-medium">Autorização necessária</p>
                <p className="text-amber-400/80 mt-0.5">
                  Clique em "Conectar Kommo" e autorize o acesso na janela que abrir. Você será redirecionado de volta automaticamente.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {kommoStatus !== "connected" ? (
              <Button
                onClick={handleConnectKommo}
                disabled={connecting}
                className="bg-[#FF5722] hover:bg-[#E64A19] text-white"
              >
                {connecting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecionando...</>
                ) : (
                  <><ExternalLink className="w-4 h-4 mr-2" /> Conectar Kommo</>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={checkKommoStatus}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Verificar conexão
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Agents Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-white text-base">Agentes de IA</CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                Automação de atendimento e reativação via Kommo + WhatsApp
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Agente 1: Atendimento de Leads */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mt-0.5">
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Agente de Atendimento</p>
                <p className="text-zinc-400 text-xs mt-0.5 max-w-sm">
                  Responde leads novos no WhatsApp, coleta nome, placa e sintoma, classifica o serviço (Rápido / Médio / Projeto) e detecta temperatura do lead. Nunca passa preço.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {["Qualificação", "Triagem técnica", "Pré-agendamento", "Handoff consultor"].map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Label htmlFor="ia-atendimento" className="text-xs text-zinc-400">
                {iaAtivo ? "Ativo" : "Inativo"}
              </Label>
              <Switch
                id="ia-atendimento"
                checked={iaAtivo}
                onCheckedChange={() => toggleIA("ia_atendimento_ativo", iaAtivo)}
                disabled={kommoStatus !== "connected" || configSet.isPending}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Agente 2: Reativação */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mt-0.5">
                <RotateCcw className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Agente de Reativação</p>
                <p className="text-zinc-400 text-xs mt-0.5 max-w-sm">
                  Varre clientes inativos há 90+ dias e leads que não fecharam. Envia mensagem personalizada no WhatsApp com o último serviço e um gancho de retorno. Roda automaticamente às 5h.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {["Clientes inativos 90d+", "Leads esfriados", "Mensagem personalizada", "Roda às 5h"].map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Label htmlFor="ia-reativacao" className="text-xs text-zinc-400">
                {reativacaoAtiva ? "Ativo" : "Inativo"}
              </Label>
              <Switch
                id="ia-reativacao"
                checked={reativacaoAtiva}
                onCheckedChange={() => toggleIA("ia_reativacao_ativa", reativacaoAtiva)}
                disabled={kommoStatus !== "connected" || configSet.isPending}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Agente 3: Leads Kommo */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mt-0.5">
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Sincronização de Leads</p>
                <p className="text-zinc-400 text-xs mt-0.5 max-w-sm">
                  Importa leads do Kommo para o sistema, classifica por temperatura (Quente / Morno / Frio) e cria agendamentos automaticamente quando o lead confirma.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {["Importação automática", "Temperatura do lead", "Criação de agendamento"].map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
                Em breve
              </Badge>
            </div>
          </div>

          {kommoStatus !== "connected" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0" />
              <p className="text-xs text-zinc-500">
                Conecte o Kommo acima para ativar os agentes de IA.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
