import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Car,
  ClipboardList,
  Bell,
  Star,
  MessageSquare,
  Shield,
  Eye,
  EyeOff,
  Smartphone,
  Globe,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings,
  Palette,
  Link,
} from "lucide-react";

// Funcionalidades planejadas para o portal do cliente
const FUNCIONALIDADES = [
  {
    id: "historico_os",
    icon: ClipboardList,
    titulo: "Histórico de OS",
    descricao: "Cliente vê todas as ordens de serviço passadas com status, valor e data",
    status: "planejado",
    prioridade: "alta",
    tabela: "09_ordens_servico + 08_veiculos",
  },
  {
    id: "status_atual",
    icon: Car,
    titulo: "Status do Veículo em Tempo Real",
    descricao: "Acompanhamento do status atual da OS aberta (Diagnóstico → Entregue)",
    status: "planejado",
    prioridade: "alta",
    tabela: "09_ordens_servico",
  },
  {
    id: "aprovacao_orcamento",
    icon: CheckCircle2,
    titulo: "Aprovação de Orçamento Online",
    descricao: "Cliente aprova ou recusa orçamento diretamente pelo portal sem precisar ligar",
    status: "planejado",
    prioridade: "alta",
    tabela: "09_ordens_servico",
  },
  {
    id: "notificacoes",
    icon: Bell,
    titulo: "Notificações Push / WhatsApp",
    descricao: "Alertas automáticos quando o status da OS muda (ex: 'Seu carro está pronto!')",
    status: "planejado",
    prioridade: "alta",
    tabela: "09_ordens_servico + 07_clientes",
  },
  {
    id: "perfil_veiculo",
    icon: Car,
    titulo: "Perfil do Veículo",
    descricao: "Histórico completo do veículo: KM, revisões, serviços realizados, próxima revisão",
    status: "planejado",
    prioridade: "media",
    tabela: "08_veiculos + 09_ordens_servico",
  },
  {
    id: "avaliacao",
    icon: Star,
    titulo: "Avaliação do Serviço",
    descricao: "NPS e avaliação de 1-5 estrelas após entrega do veículo",
    status: "planejado",
    prioridade: "media",
    tabela: "nova tabela: 24_avaliacoes",
  },
  {
    id: "chat",
    icon: MessageSquare,
    titulo: "Chat com a Oficina",
    descricao: "Comunicação direta com o consultor responsável pela OS",
    status: "futuro",
    prioridade: "baixa",
    tabela: "nova tabela: 25_mensagens_cliente",
  },
  {
    id: "agendamento",
    icon: Clock,
    titulo: "Agendamento Online",
    descricao: "Cliente agenda revisão ou serviço diretamente pelo portal",
    status: "futuro",
    prioridade: "media",
    tabela: "12_agendamentos",
  },
];

const STATUS_COR: Record<string, string> = {
  planejado: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  em_desenvolvimento: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  pronto: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  futuro: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const PRIORIDADE_COR: Record<string, string> = {
  alta: "text-red-400",
  media: "text-amber-400",
  baixa: "text-zinc-400",
};

// Configurações do portal do cliente
const CONFIG_INICIAL = {
  nomePortal: "Doctor Auto Prime — Portal do Cliente",
  urlSlug: "cliente",
  logoUrl: "",
  corPrimaria: "#ef4444",
  mensagemBoas_vindas: "Bem-vindo ao seu portal de acompanhamento de serviços.",
  mostrarValores: true,
  mostrarMecanico: false,
  permitirAgendamento: false,
  notificacoesWhatsApp: false,
  notificacoesEmail: true,
  ativo: false,
};

export default function ClientePortal() {
  const [config, setConfig] = useState(CONFIG_INICIAL);
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    setSalvando(true);
    // TODO: persistir via tRPC config.savePortalCliente
    await new Promise((r) => setTimeout(r, 800));
    setSalvando(false);
  };

  const funcPorStatus = (status: string) =>
    FUNCIONALIDADES.filter((f) => f.status === status);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-sky-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Portal do Cliente</h1>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">Em Planejamento</Badge>
          </div>
          <p className="text-zinc-400 text-sm ml-13">
            Configuração e roadmap do portal de autoatendimento para clientes da Doctor Auto Prime
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`border ${config.ativo ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800 text-zinc-500 border-zinc-700"}`}>
            {config.ativo ? "Portal Ativo" : "Portal Inativo"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="roadmap">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="roadmap">Roadmap de Funcionalidades</TabsTrigger>
          <TabsTrigger value="config">Configurações do Portal</TabsTrigger>
          <TabsTrigger value="acesso">Controle de Acesso</TabsTrigger>
          <TabsTrigger value="tabelas">Tabelas Necessárias</TabsTrigger>
        </TabsList>

        {/* ── ROADMAP ─────────────────────────────────────────────── */}
        <TabsContent value="roadmap" className="mt-4 space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total de Funcionalidades", valor: FUNCIONALIDADES.length, cor: "text-white" },
              { label: "Alta Prioridade", valor: FUNCIONALIDADES.filter(f => f.prioridade === "alta").length, cor: "text-red-400" },
              { label: "Planejadas", valor: funcPorStatus("planejado").length, cor: "text-blue-400" },
              { label: "Futuras", valor: funcPorStatus("futuro").length, cor: "text-zinc-400" },
            ].map((stat) => (
              <Card key={stat.label} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.cor}`}>{stat.valor}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Funcionalidades por status */}
          {["planejado", "em_desenvolvimento", "pronto", "futuro"].map((status) => {
            const funcs = funcPorStatus(status);
            if (funcs.length === 0) return null;
            const labels: Record<string, string> = {
              planejado: "Planejadas (próxima onda)",
              em_desenvolvimento: "Em Desenvolvimento",
              pronto: "Prontas",
              futuro: "Futuras (backlog)",
            };
            return (
              <div key={status}>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  {labels[status]}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {funcs.map((func) => {
                    const Icon = func.icon;
                    return (
                      <Card key={func.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Icon className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white">{func.titulo}</span>
                                <Badge className={`text-xs border ${STATUS_COR[func.status]}`}>
                                  {func.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-zinc-500 mb-2">{func.descricao}</p>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${PRIORIDADE_COR[func.prioridade]}`}>
                                  ● {func.prioridade}
                                </span>
                                <span className="text-xs text-zinc-600">·</span>
                                <span className="text-xs text-zinc-600 font-mono">{func.tabela}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ── CONFIGURAÇÕES ─────────────────────────────────────────── */}
        <TabsContent value="config" className="mt-4 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-400" />
                Configurações Gerais do Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Nome do Portal</Label>
                  <Input
                    value={config.nomePortal}
                    onChange={(e) => setConfig({ ...config, nomePortal: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">URL do Portal</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-sm">doctorautoprime.manus.space/</span>
                    <Input
                      value={config.urlSlug}
                      onChange={(e) => setConfig({ ...config, urlSlug: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Mensagem de Boas-Vindas</Label>
                <Textarea
                  value={config.mensagemBoas_vindas}
                  onChange={(e) => setConfig({ ...config, mensagemBoas_vindas: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Cor Primária</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.corPrimaria}
                      onChange={(e) => setConfig({ ...config, corPrimaria: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                    />
                    <Input
                      value={config.corPrimaria}
                      onChange={(e) => setConfig({ ...config, corPrimaria: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-zinc-400" />
                Visibilidade de Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "mostrarValores", label: "Exibir valores das OS para o cliente" },
                { key: "mostrarMecanico", label: "Exibir nome do mecânico responsável" },
                { key: "permitirAgendamento", label: "Permitir agendamento online pelo portal" },
                { key: "notificacoesWhatsApp", label: "Notificações via WhatsApp" },
                { key: "notificacoesEmail", label: "Notificações via E-mail" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <Label className="text-sm text-zinc-300 cursor-pointer">{label}</Label>
                  <Switch
                    checked={config[key as keyof typeof config] as boolean}
                    onCheckedChange={(v) => setConfig({ ...config, [key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-sky-600 hover:bg-sky-500 text-white"
            >
              {salvando ? "Salvando..." : "Salvar Configurações"}
            </Button>
            <p className="text-xs text-zinc-500">
              As configurações serão aplicadas quando o portal for ativado
            </p>
          </div>
        </TabsContent>

        {/* ── CONTROLE DE ACESSO ────────────────────────────────────── */}
        <TabsContent value="acesso" className="mt-4 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-zinc-400" />
                Como o Cliente Acessa o Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    icon: Smartphone,
                    titulo: "Link por WhatsApp",
                    descricao: "Ao criar a OS, o sistema envia automaticamente um link único para o WhatsApp do cliente",
                    status: "planejado",
                  },
                  {
                    icon: Globe,
                    titulo: "Portal Web",
                    descricao: "Cliente acessa doctorautoprime.manus.space/cliente e faz login com CPF ou e-mail",
                    status: "planejado",
                  },
                  {
                    icon: Link,
                    titulo: "QR Code na OS",
                    descricao: "QR code impresso na etiqueta do para-brisa leva direto para o status da OS",
                    status: "futuro",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.titulo} className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center mb-3">
                          <Icon className="w-4 h-4 text-zinc-300" />
                        </div>
                        <h4 className="text-sm font-medium text-white mb-1">{item.titulo}</h4>
                        <p className="text-xs text-zinc-500 mb-2">{item.descricao}</p>
                        <Badge className={`text-xs border ${STATUS_COR[item.status]}`}>
                          {item.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-400 mb-1">Autenticação do Cliente</p>
                    <p className="text-xs text-zinc-400">
                      O cliente não usa username/senha — ele acessa via <strong>token único por OS</strong> (link enviado por WhatsApp) ou via <strong>CPF + placa</strong> no portal web. Isso elimina a necessidade de cadastro de senha pelo cliente.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TABELAS ──────────────────────────────────────────────── */}
        <TabsContent value="tabelas" className="mt-4 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Tabelas Necessárias para o Portal do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    tabela: "09_ordens_servico",
                    status: "✅ Existe",
                    uso: "Status da OS, valor, data de entrada/saída — leitura pelo cliente",
                    cor: "text-emerald-400",
                  },
                  {
                    tabela: "07_clientes",
                    status: "✅ Existe",
                    uso: "CPF, e-mail, telefone — autenticação do cliente no portal",
                    cor: "text-emerald-400",
                  },
                  {
                    tabela: "08_veiculos",
                    status: "✅ Existe",
                    uso: "Placa, modelo, KM — exibição no perfil do veículo",
                    cor: "text-emerald-400",
                  },
                  {
                    tabela: "12_agendamentos",
                    status: "✅ Existe",
                    uso: "Agendamento online pelo cliente (quando habilitado)",
                    cor: "text-emerald-400",
                  },
                  {
                    tabela: "24_avaliacoes",
                    status: "❌ Criar",
                    uso: "NPS + avaliação de 1-5 estrelas por OS entregue",
                    cor: "text-red-400",
                  },
                  {
                    tabela: "25_mensagens_cliente",
                    status: "❌ Criar (futuro)",
                    uso: "Chat entre cliente e consultor dentro do portal",
                    cor: "text-zinc-500",
                  },
                  {
                    tabela: "26_tokens_acesso_cliente",
                    status: "❌ Criar",
                    uso: "Tokens únicos por OS para acesso sem senha (link WhatsApp)",
                    cor: "text-red-400",
                  },
                ].map((item) => (
                  <div key={item.tabela} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
                    <span className={`text-xs font-mono font-medium ${item.cor} w-48 flex-shrink-0 mt-0.5`}>
                      {item.tabela}
                    </span>
                    <span className={`text-xs ${item.cor} w-24 flex-shrink-0 mt-0.5`}>{item.status}</span>
                    <span className="text-xs text-zinc-400">{item.uso}</span>
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
