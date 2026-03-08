import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import {
  Settings2, Zap, Database, Globe, RefreshCw, Save, Plus, Trash2,
  CheckCircle2, XCircle, AlertCircle, Copy, Eye, EyeOff, Code2,
  Webhook, MessageSquare, Bot, BarChart3, Shield, Server, ScrollText,
  Filter, Eraser, Info, ChevronDown, ChevronRight, Users, Lock, Unlock,
  UserCheck, Wrench, ShoppingBag, Crown, Key
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────
type ConfigRow = {
  id: number;
  chave: string;
  valor: string | null;
  tipo: string | null;
  grupo: string | null;
  descricao: string | null;
  updatedAt: Date | null;
};

// ─── Integration card config ─────────────────────────────────────────────────
const INTEGRATIONS = [
  {
    id: "kommo",
    nome: "Kommo CRM",
    descricao: "Recebe leads em tempo real via webhook. Configure a URL abaixo no painel do Kommo.",
    icon: Webhook,
    cor: "blue",
    statusChave: "feature_kommo_webhook_ativo",
    campos: [
      { chave: "kommo_webhook_url", label: "URL do Webhook", tipo: "url", readonly: true },
    ],
    instrucoes: [
      "Acesse doctorautobosch.kommo.com",
      "Vá em Configurações → Integrações → Webhooks",
      "Cole a URL do webhook abaixo",
      "Ative os eventos: Leads Adicionar, Leads Atualizar, Leads Mudar Status",
    ],
  },
  {
    id: "trello",
    nome: "Trello",
    descricao: "Sincroniza OS entregues com cards do Trello para controle de qualidade.",
    icon: BarChart3,
    cor: "cyan",
    statusChave: "feature_trello_sync_ativo",
    campos: [
      { chave: "trello_board_id", label: "Board ID", tipo: "text", readonly: false },
    ],
    instrucoes: [
      "Acesse trello.com e abra o board desejado",
      "Copie o ID da URL: trello.com/b/[BOARD_ID]/...",
      "Cole o ID no campo abaixo e salve",
    ],
  },
  {
    id: "whatsapp",
    nome: "WhatsApp Business",
    descricao: "Envia notificações automáticas para clientes e equipe via WhatsApp.",
    icon: MessageSquare,
    cor: "green",
    statusChave: "feature_notificacoes_ativas",
    campos: [
      { chave: "whatsapp_token", label: "Token de Acesso", tipo: "password", readonly: false },
    ],
    instrucoes: [
      "Acesse developers.facebook.com",
      "Crie um app com WhatsApp Business API",
      "Gere o token de acesso permanente",
      "Cole o token no campo abaixo",
    ],
  },
  {
    id: "telegram",
    nome: "Telegram Bot",
    descricao: "Envia relatórios automáticos e alertas operacionais via Telegram.",
    icon: Bot,
    cor: "sky",
    statusChave: "feature_notificacoes_ativas",
    campos: [
      { chave: "telegram_bot_token", label: "Bot Token", tipo: "password", readonly: false },
    ],
    instrucoes: [
      "Abra o Telegram e fale com @BotFather",
      "Use /newbot para criar um novo bot",
      "Copie o token gerado",
      "Cole o token no campo abaixo",
    ],
  },
  {
    id: "openai",
    nome: "OpenAI API",
    descricao: "Chave alternativa para o motor de IA. Por padrão usa a API interna do Manus.",
    icon: Bot,
    cor: "purple",
    statusChave: "feature_ia_scoring_ativo",
    campos: [
      { chave: "openai_api_key", label: "API Key", tipo: "password", readonly: false },
    ],
    instrucoes: [
      "Acesse platform.openai.com",
      "Vá em API Keys → Create new secret key",
      "Cole a chave no campo abaixo",
      "Deixe vazio para usar a IA interna do sistema",
    ],
  },
];

// ─── Feature Flags ───────────────────────────────────────────────────────────
const FEATURE_FLAGS = [
  { chave: "feature_gestao_visivel", label: "Seção GESTÃO visível no sidebar", grupo: "Visibilidade" },
  { chave: "feature_dev_visivel", label: "Seção DEV visível no sidebar", grupo: "Visibilidade" },
  { chave: "feature_kommo_webhook_ativo", label: "Webhook Kommo ativo", grupo: "Integrações" },
  { chave: "feature_trello_sync_ativo", label: "Sincronização Trello ativa", grupo: "Integrações" },
  { chave: "feature_ia_scoring_ativo", label: "Lead Scoring por IA ativo", grupo: "IA" },
  { chave: "feature_notificacoes_ativas", label: "Notificações automáticas ativas", grupo: "IA" },
  { chave: "modo_manutencao", label: "Modo Manutenção (bloqueia usuários comuns)", grupo: "Sistema" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getVal(configs: ConfigRow[], chave: string): string {
  return configs.find((c) => c.chave === chave)?.valor ?? "";
}

function getBool(configs: ConfigRow[], chave: string): boolean {
  const v = getVal(configs, chave);
  return v === "true" || v === "1";
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DevPanel() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [logNivel, setLogNivel] = useState<"all" | "info" | "warn" | "error" | "success">("all");
  const [logFonte, setLogFonte] = useState("");
  const [logAutoRefresh, setLogAutoRefresh] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: logs = [], refetch: refetchLogs } = trpc.logs.list.useQuery(
    { nivel: logNivel, fonte: logFonte || undefined, limit: 200 },
    { refetchInterval: logAutoRefresh ? 5000 : false }
  );
  const addLog = trpc.logs.add.useMutation({ onSuccess: () => refetchLogs() });
  const clearAllLogs = trpc.logs.clearAll.useMutation({ onSuccess: () => { refetchLogs(); toast.success("Logs limpos!"); } });

  useEffect(() => {
    return () => { if (logIntervalRef.current) clearInterval(logIntervalRef.current); };
  }, []);

  const logNivelBadge = (nivel: string) => {
    const map: Record<string, { cls: string; icon: React.ReactNode }> = {
      info:    { cls: "bg-blue-500/20 text-blue-400 border-blue-500/30",    icon: <Info className="w-3 h-3" /> },
      warn:    { cls: "bg-amber-500/20 text-amber-400 border-amber-500/30",  icon: <AlertCircle className="w-3 h-3" /> },
      error:   { cls: "bg-red-500/20 text-red-400 border-red-500/30",        icon: <XCircle className="w-3 h-3" /> },
      success: { cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
    };
    const m = map[nivel] ?? map.info;
    return <Badge className={`${m.cls} gap-1 text-xs`}>{m.icon}{nivel}</Badge>;
  };
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [newChave, setNewChave] = useState("");
  const [newValor, setNewValor] = useState("");
  const [newDescricao, setNewDescricao] = useState("");

  const { data: configs = [], refetch } = trpc.config.list.useQuery();
  const setConfig = trpc.config.set.useMutation({ onSuccess: () => { refetch(); toast.success("Configuração salva!"); } });
  const setMany = trpc.config.setMany.useMutation({ onSuccess: () => { refetch(); toast.success("Configurações salvas!"); } });
  const deleteConfig = trpc.config.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Configuração removida."); } });

  const handleToggle = (chave: string, current: boolean) => {
    setConfig.mutate({ chave, valor: (!current).toString() });
  };

  const handleSaveField = (chave: string, valor: string) => {
    setConfig.mutate({ chave, valor });
  };

  const handleSaveAll = () => {
    const updates = Object.entries(editValues).map(([chave, valor]) => ({ chave, valor }));
    if (updates.length === 0) { toast.info("Nenhuma alteração pendente."); return; }
    setMany.mutate(updates);
    setEditValues({});
  };

  const handleAddNew = () => {
    if (!newChave.trim()) { toast.error("Chave obrigatória"); return; }
    setConfig.mutate({ chave: newChave.trim(), valor: newValor, descricao: newDescricao });
    setNewChave(""); setNewValor(""); setNewDescricao("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const getFieldValue = (chave: string) => editValues[chave] ?? getVal(configs, chave);

  const statusBadge = (ativo: boolean) => ativo
    ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Ativo</Badge>
    : <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30"><XCircle className="w-3 h-3 mr-1" />Inativo</Badge>;

  // Group configs by grupo
  const configsByGroup = configs.reduce((acc, c) => {
    const g = c.grupo ?? "geral";
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {} as Record<string, ConfigRow[]>);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Code2 className="w-6 h-6 text-violet-400" />
            Painel DEV
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Controle total do sistema — feature flags, integrações e configurações</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <Server className="w-3 h-3 mr-1" />
            v{getVal(configs, "versao_sistema") || "2.0.0"}
          </Badge>
          {getBool(configs, "modo_manutencao") && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse">
              <AlertCircle className="w-3 h-3 mr-1" />
              Manutenção
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="flags">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="flags" className="gap-1"><Zap className="w-3.5 h-3.5" />Feature Flags</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1"><Globe className="w-3.5 h-3.5" />Integrações</TabsTrigger>
          <TabsTrigger value="config" className="gap-1"><Settings2 className="w-3.5 h-3.5" />Configurações</TabsTrigger>
          <TabsTrigger value="banco" className="gap-1"><Database className="w-3.5 h-3.5" />Banco de Dados</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1"><ScrollText className="w-3.5 h-3.5" />Logs</TabsTrigger>
          <TabsTrigger value="acesso" className="gap-1"><Shield className="w-3.5 h-3.5" />Controle de Acesso</TabsTrigger>
        </TabsList>

        {/* ─── FEATURE FLAGS ─────────────────────────────────────────────────── */}
        <TabsContent value="flags" className="mt-4 space-y-4">
          <p className="text-zinc-400 text-sm">Ligue ou desligue funcionalidades do sistema em tempo real, sem precisar de deploy.</p>
          {["Visibilidade", "Integrações", "IA", "Sistema"].map((grupo) => {
            const flags = FEATURE_FLAGS.filter((f) => f.grupo === grupo);
            return (
              <Card key={grupo} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 font-semibold uppercase tracking-wider">{grupo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {flags.map((flag) => {
                    const ativo = getBool(configs, flag.chave);
                    return (
                      <div key={flag.chave} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                        <div>
                          <p className="text-sm text-white font-medium">{flag.label}</p>
                          <p className="text-xs text-zinc-500 font-mono">{flag.chave}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {statusBadge(ativo)}
                          <Switch
                            checked={ativo}
                            onCheckedChange={() => handleToggle(flag.chave, ativo)}
                            disabled={setConfig.isPending}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ─── INTEGRAÇÕES ───────────────────────────────────────────────────── */}
        <TabsContent value="integracoes" className="mt-4 space-y-4">
          <p className="text-zinc-400 text-sm">Configure as integrações externas. Tokens e chaves são salvos no banco de dados.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTEGRATIONS.map((integ) => {
              const ativo = getBool(configs, integ.statusChave);
              const Icon = integ.icon;
              return (
                <Card key={integ.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <CardTitle className="text-sm text-white">{integ.nome}</CardTitle>
                        </div>
                      </div>
                      {statusBadge(ativo)}
                    </div>
                    <CardDescription className="text-xs text-zinc-500 mt-1">{integ.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {integ.campos.map((campo) => {
                      const val = getFieldValue(campo.chave);
                      const isSecret = campo.tipo === "password";
                      const visible = showSecrets[campo.chave];
                      return (
                        <div key={campo.chave} className="space-y-1">
                          <Label className="text-xs text-zinc-400">{campo.label}</Label>
                          <div className="flex gap-2">
                            <Input
                              type={isSecret && !visible ? "password" : "text"}
                              value={val}
                              readOnly={campo.readonly}
                              onChange={(e) => !campo.readonly && setEditValues((p) => ({ ...p, [campo.chave]: e.target.value }))}
                              className="bg-zinc-800 border-zinc-700 text-white text-xs font-mono h-8"
                              placeholder={campo.readonly ? "—" : "Cole aqui..."}
                            />
                            {isSecret && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowSecrets((p) => ({ ...p, [campo.chave]: !p[campo.chave] }))}>
                                {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                            {campo.readonly ? (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(val)}>
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button size="sm" className="h-8 px-3 bg-violet-600 hover:bg-violet-700" onClick={() => handleSaveField(campo.chave, editValues[campo.chave] ?? val)}>
                                <Save className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 font-semibold mb-2">Como configurar:</p>
                      <ol className="space-y-1">
                        {integ.instrucoes.map((inst, i) => (
                          <li key={i} className="text-xs text-zinc-500 flex gap-2">
                            <span className="text-violet-400 font-mono shrink-0">{i + 1}.</span>
                            {inst}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── CONFIGURAÇÕES ─────────────────────────────────────────────────── */}
        <TabsContent value="config" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-zinc-400 text-sm">Todas as configurações do sistema. Edite e salve em lote.</p>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1" onClick={handleSaveAll} disabled={setMany.isPending || Object.keys(editValues).length === 0}>
              <Save className="w-3.5 h-3.5" />
              Salvar alterações {Object.keys(editValues).length > 0 && `(${Object.keys(editValues).length})`}
            </Button>
          </div>

          {Object.entries(configsByGroup).map(([grupo, rows]) => (
            <Card key={grupo} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-300 font-semibold uppercase tracking-wider">{grupo}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rows.map((row) => {
                    const isBool = row.tipo === "boolean";
                    const isEdited = editValues[row.chave] !== undefined;
                    return (
                      <div key={row.chave} className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-center py-2 border-b border-zinc-800 last:border-0">
                        <div>
                          <p className="text-xs font-mono text-zinc-300">{row.chave}</p>
                          {row.descricao && <p className="text-xs text-zinc-600 mt-0.5">{row.descricao}</p>}
                        </div>
                        {isBool ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={getBool(configs, row.chave)}
                              onCheckedChange={() => handleToggle(row.chave, getBool(configs, row.chave))}
                            />
                            <span className="text-xs text-zinc-400">{getBool(configs, row.chave) ? "true" : "false"}</span>
                          </div>
                        ) : (
                          <Input
                            value={getFieldValue(row.chave)}
                            onChange={(e) => setEditValues((p) => ({ ...p, [row.chave]: e.target.value }))}
                            className={`bg-zinc-800 border-zinc-700 text-white text-xs font-mono h-7 ${isEdited ? "border-violet-500" : ""}`}
                          />
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-zinc-600 hover:text-red-400"
                          onClick={() => deleteConfig.mutate({ chave: row.chave })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add new config */}
          <Card className="bg-zinc-900 border-zinc-800 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400 flex items-center gap-1"><Plus className="w-4 h-4" />Nova configuração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-zinc-500">Chave</Label>
                  <Input value={newChave} onChange={(e) => setNewChave(e.target.value)} placeholder="ex: meta_mensal" className="bg-zinc-800 border-zinc-700 text-white text-xs font-mono h-8 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-zinc-500">Valor</Label>
                  <Input value={newValor} onChange={(e) => setNewValor(e.target.value)} placeholder="ex: 250000" className="bg-zinc-800 border-zinc-700 text-white text-xs font-mono h-8 mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-zinc-500">Descrição</Label>
                  <Input value={newDescricao} onChange={(e) => setNewDescricao(e.target.value)} placeholder="ex: Meta mensal em R$" className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 mt-1" />
                </div>
              </div>
              <Button size="sm" className="mt-3 bg-violet-600 hover:bg-violet-700 gap-1" onClick={handleAddNew} disabled={setConfig.isPending}>
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── BANCO DE DADOS ────────────────────────────────────────────────── */}
        <TabsContent value="banco" className="mt-4 space-y-4">
          <p className="text-zinc-400 text-sm">Visão geral das tabelas do sistema.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { nome: "00_empresas", desc: "Empresas cadastradas" },
              { nome: "01_colaboradores", desc: "Equipe administrativa" },
              { nome: "03_mecanicos", desc: "Equipe técnica" },
              { nome: "07_clientes", desc: "Base de clientes" },
              { nome: "08_veiculos", desc: "Frota de veículos" },
              { nome: "09_ordens_servico", desc: "Ordens de serviço" },
              { nome: "10_ordens_servico_historico", desc: "Histórico de status" },
              { nome: "11_ordens_servico_itens", desc: "Itens de orçamento" },
              { nome: "12_agendamentos", desc: "Agenda de atendimentos" },
              { nome: "16_kommo_leads", desc: "Leads do Kommo CRM" },
              { nome: "system_config", desc: "Configurações do sistema" },
              { nome: "users", desc: "Usuários OAuth" },
            ].map((t) => (
              <Card key={t.nome} className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-default">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Database className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-mono text-white">{t.nome}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <Shield className="w-4 h-4 text-amber-400" />
                <p className="text-sm">Para executar queries SQL diretamente, use o painel <strong className="text-white">Database</strong> no menu de gerenciamento do projeto (ícone de banco de dados no painel lateral direito).</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LOGS ──────────────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="mt-4 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <Select value={logNivel} onValueChange={(v) => setLogNivel(v as typeof logNivel)}>
                <SelectTrigger className="w-32 h-8 text-xs bg-zinc-900 border-zinc-700">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Filtrar por fonte..."
              value={logFonte}
              onChange={(e) => setLogFonte(e.target.value)}
              className="h-8 w-44 text-xs bg-zinc-900 border-zinc-700"
            />
            <Button size="sm" variant="outline" onClick={() => refetchLogs()} className="h-8 gap-1 text-xs">
              <RefreshCw className="w-3 h-3" /> Atualizar
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-zinc-400 flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={logAutoRefresh}
                  onCheckedChange={setLogAutoRefresh}
                  className="scale-75"
                />
                Auto-refresh (5s)
              </label>
              <Button
                size="sm" variant="outline"
                onClick={() => { if (confirm("Limpar todos os logs?")) clearAllLogs.mutate(); }}
                className="h-8 gap-1 text-xs text-red-400 hover:text-red-300 border-red-900/40"
              >
                <Eraser className="w-3 h-3" /> Limpar tudo
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            {["info","warn","error","success"].map((n) => {
              const count = logs.filter((l) => l.nivel === n).length;
              return (
                <button key={n} onClick={() => setLogNivel(logNivel === n ? "all" : n as typeof logNivel)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    n === "info" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                    n === "warn" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                    n === "error" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  } ${logNivel === n ? "ring-1 ring-offset-1 ring-offset-zinc-950" : ""}`}
                >
                  {n} ({count})
                </button>
              );
            })}
            <span className="text-xs text-zinc-500 self-center ml-auto">{logs.length} registros</span>
          </div>

          {/* Log list */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                  <ScrollText className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">Nenhum log encontrado</p>
                  <p className="text-xs mt-1">Os logs aparecerão aqui quando as integrações forem ativadas</p>
                  <Button size="sm" variant="outline" className="mt-4 text-xs gap-1" onClick={() => {
                    addLog.mutate({ nivel: "info", fonte: "DevPanel", mensagem: "Teste de log manual", detalhes: JSON.stringify({ timestamp: new Date().toISOString(), user: "dev" }) });
                    toast.success("Log de teste criado!");
                  }}>
                    <Plus className="w-3 h-3" /> Criar log de teste
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {logs.map((log) => (
                    <div key={log.id} className="hover:bg-zinc-800/50 transition-colors">
                      <button
                        className="w-full flex items-start gap-3 px-4 py-3 text-left"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <span className="mt-0.5 shrink-0">{logNivelBadge(log.nivel)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-violet-400 shrink-0">{log.fonte}</span>
                            <span className="text-sm text-white truncate">{log.mensagem}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {new Date(log.timestamp).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        {log.detalhes && (
                          expandedLog === log.id
                            ? <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                            : <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                        )}
                      </button>
                      {expandedLog === log.id && log.detalhes && (
                        <div className="px-4 pb-3">
                          <pre className="text-xs text-zinc-400 bg-zinc-950 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                            {(() => { try { return JSON.stringify(JSON.parse(log.detalhes), null, 2); } catch { return log.detalhes; } })()
                            }
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ─── CONTROLE DE ACESSO ─────────────────────────────────────────────────────────────────────────────────────── */}
        <TabsContent value="acesso" className="mt-4 space-y-6">
          <p className="text-zinc-400 text-sm">Gerencie o que cada role pode ver e fazer no sistema. Somente o Dev pode alterar estas configurações.</p>

          {/* Credenciais dos roles */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-violet-400" />
                Credenciais de Acesso
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                Login e senha de cada role. Somente o Dev requer senha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { role: "dev", icon: Crown, label: "Dev", login: "Dev_thales", senha: "T060925@", cor: "violet", descricao: "Acesso total ao sistema + configurações" },
                  { role: "gestao", icon: BarChart3, label: "Gestão", login: "Acesso direto", senha: "Sem senha", cor: "blue", descricao: "POMBAL + GESTÃO" },
                  { role: "consultor", icon: UserCheck, label: "Consultor", login: "Acesso direto", senha: "Sem senha", cor: "emerald", descricao: "Apenas POMBAL (operacional)" },
                  { role: "mecanico", icon: Wrench, label: "Mecânico", login: "Acesso direto", senha: "Sem senha", cor: "amber", descricao: "Apenas POMBAL (pátio e OS)" },
                  { role: "cliente", icon: ShoppingBag, label: "Cliente", login: "Portal separado", senha: "Sem senha", cor: "sky", descricao: "Portal do cliente (em breve)" },
                ].map(({ role, icon: Icon, label, login, senha, cor, descricao }) => (
                  <div key={role} className={`flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${cor}-500/10`}>
                        <Icon className={`w-4 h-4 text-${cor}-400`} />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-zinc-400 text-xs">{descricao}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-300 text-xs font-mono">{login}</p>
                      <p className="text-zinc-500 text-xs font-mono">{senha}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Visível por role */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Visibilidade por Role
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                O que cada role vê no sidebar do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left text-zinc-400 pb-2 pr-4">Seção / Página</th>
                      <th className="text-center text-violet-400 pb-2 px-3">Dev</th>
                      <th className="text-center text-blue-400 pb-2 px-3">Gestão</th>
                      <th className="text-center text-emerald-400 pb-2 px-3">Consultor</th>
                      <th className="text-center text-amber-400 pb-2 px-3">Mecânico</th>
                      <th className="text-center text-sky-400 pb-2 px-3">Cliente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {[
                      { pagina: "Dashboard", dev: true, gestao: true, consultor: true, mecanico: false, cliente: false },
                      { pagina: "Pátio", dev: true, gestao: true, consultor: true, mecanico: true, cliente: false },
                      { pagina: "Agenda", dev: true, gestao: true, consultor: true, mecanico: false, cliente: false },
                      { pagina: "Clientes / OS", dev: true, gestao: true, consultor: true, mecanico: false, cliente: false },
                      { pagina: "Financeiro", dev: true, gestao: true, consultor: false, mecanico: false, cliente: false },
                      { pagina: "Produtividade", dev: true, gestao: true, consultor: false, mecanico: false, cliente: false },
                      { pagina: "QG das IAs", dev: true, gestao: true, consultor: false, mecanico: false, cliente: false },
                      { pagina: "Melhorias", dev: true, gestao: true, consultor: true, mecanico: false, cliente: false },
                      { pagina: "Sistema (config)", dev: true, gestao: false, consultor: false, mecanico: false, cliente: false },
                      { pagina: "GESTÃO — OS Ultimate", dev: true, gestao: true, consultor: false, mecanico: false, cliente: false },
                      { pagina: "GESTÃO — Visão Geral", dev: true, gestao: true, consultor: false, mecanico: false, cliente: false },
                      { pagina: "GESTÃO — Financeiro", dev: true, gestao: true, consultor: false, mecanico: false, cliente: false },
                      { pagina: "GESTÃO — Colaboradores", dev: true, gestao: true, consultor: false, mecanico: false, cliente: false },
                      { pagina: "GESTÃO — Metas", dev: true, gestao: true, consultor: false, mecanico: false, cliente: false },
                      { pagina: "DEV — Painel DEV", dev: true, gestao: false, consultor: false, mecanico: false, cliente: false },
                      { pagina: "Portal do Cliente", dev: true, gestao: false, consultor: false, mecanico: false, cliente: true },
                    ].map(({ pagina, ...roles }) => (
                      <tr key={pagina}>
                        <td className="text-zinc-300 py-2 pr-4">{pagina}</td>
                        {Object.entries(roles).map(([role, ativo]) => (
                          <td key={role} className="text-center py-2 px-3">
                            {ativo
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                              : <XCircle className="w-3.5 h-3.5 text-zinc-600 mx-auto" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Alterações permitidas por role */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Alterações Permitidas por Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { role: "Dev", cor: "violet", acoes: ["Alterar feature flags", "Configurar integrações (Kommo, Trello, WhatsApp)", "Gerenciar configurações do sistema", "Ver logs e banco de dados", "Criar/editar/excluir qualquer dado", "Controlar visibilidade por role"] },
                  { role: "Gestão", cor: "blue", acoes: ["Ver relatórios e KPIs", "Gerenciar metas e campanhas", "Visualizar OS Ultimate", "Exportar relatórios"] },
                  { role: "Consultor", cor: "emerald", acoes: ["Criar e editar OS", "Cadastrar clientes e veículos", "Gerenciar agenda", "Registrar feedback de mecânicos"] },
                  { role: "Mecânico", cor: "amber", acoes: ["Ver OS atribuídas", "Atualizar status de execução", "Visualizar pátio"] },
                  { role: "Cliente", cor: "sky", acoes: ["Ver histórico de OS", "Aprovar/recusar orçamento", "Acompanhar status do veículo"] },
                ].map(({ role, cor, acoes }) => (
                  <div key={role} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <p className={`text-${cor}-400 text-sm font-semibold mb-2`}>{role}</p>
                    <ul className="space-y-1">
                      {acoes.map((a) => (
                        <li key={a} className="flex items-center gap-2 text-zinc-300 text-xs">
                          <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
