/**
 * MecanicoView — Tela dedicada para mecânicos
 * Conceito: "Caminho de Aprendizado" — interface gamificada que guia o mecânico
 * pelas etapas do trabalho de forma visual e progressiva.
 * Otimizada para tablet/celular.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Wrench,
  Car,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  LogOut,
  User,
  CalendarDays,
  Phone,
  Flame,
  Trophy,
  Star,
  Zap,
  Target,
  ArrowRight,
  CircleDot,
  CheckCheck,
  Timer,
  Package,
  Hammer,
  ClipboardCheck,
  TrendingUp,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  "Diagnóstico",
  "Aguardando Aprovação",
  "Aprovado",
  "Em Execução",
  "Aguardando Peças",
  "Pronto para Entrega",
  "Entregue",
];

// Caminho de aprendizado: cada status é uma "etapa" do processo
const CAMINHO_ETAPAS = [
  { status: "Diagnóstico", icon: Target, label: "Diagnóstico", cor: "from-purple-600 to-purple-800", corBg: "bg-purple-500/10", corBorder: "border-purple-500/30", corText: "text-purple-400", xp: 10 },
  { status: "Aguardando Aprovação", icon: ClipboardCheck, label: "Aguard. Aprovação", cor: "from-yellow-600 to-yellow-800", corBg: "bg-yellow-500/10", corBorder: "border-yellow-500/30", corText: "text-yellow-400", xp: 15 },
  { status: "Aprovado", icon: CheckCircle2, label: "Aprovado", cor: "from-blue-600 to-blue-800", corBg: "bg-blue-500/10", corBorder: "border-blue-500/30", corText: "text-blue-400", xp: 20 },
  { status: "Em Execução", icon: Hammer, label: "Em Execução", cor: "from-orange-600 to-orange-800", corBg: "bg-orange-500/10", corBorder: "border-orange-500/30", corText: "text-orange-400", xp: 30 },
  { status: "Aguardando Peças", icon: Package, label: "Aguard. Peças", cor: "from-red-600 to-red-800", corBg: "bg-red-500/10", corBorder: "border-red-500/30", corText: "text-red-400", xp: 5 },
  { status: "Pronto para Entrega", icon: CheckCheck, label: "Pronto p/ Entrega", cor: "from-green-600 to-green-800", corBg: "bg-green-500/10", corBorder: "border-green-500/30", corText: "text-green-400", xp: 50 },
];

const STATUS_MECANICO_COLOR: Record<string, string> = {
  pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  confirmado: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  concluido: "bg-green-500/20 text-green-300 border-green-500/30",
};

const STATUS_MECANICO_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  concluido: "Concluído",
};

type OsItem = {
  os: {
    id: number;
    numeroOs: string | null;
    placa: string | null;
    status: string | null;
    diagnostico: string | null;
    observacoes: string | null;
    dataEntrada: Date | null;
    valorTotalOs: string | null;
    [key: string]: unknown;
  };
  cliente: { id: number; nomeCompleto: string; telefone: string | null } | null;
  veiculo: { id: number; marca: string | null; modelo: string | null; placa: string | null } | null;
  mecanico: { id: number; nome: string } | null;
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function MecanicoView() {
  const { user, loading, logout } = useAuth();
  const { roleInfo } = useRole();
  const [activeTab, setActiveTab] = useState<"caminho" | "agenda">("caminho");
  const [selectedOs, setSelectedOs] = useState<OsItem | null>(null);
  const [novoStatus, setNovoStatus] = useState("");
  const [observacao, setObservacao] = useState("");
  const [atualizando, setAtualizando] = useState(false);
  const [agendaDate, setAgendaDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedAgendamento, setSelectedAgendamento] = useState<any | null>(null);
  const [novoStatusMecanico, setNovoStatusMecanico] = useState<"pendente" | "confirmado" | "concluido">("pendente");
  const [obsAgendamento, setObsAgendamento] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState<string | null>(null);

  const mecanicoRefId = roleInfo?.mecanicoRefId ?? null;

  // Busca OS ativas
  const { data: patioData, refetch, isLoading } = trpc.os.patio.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Busca agenda do mecânico logado
  const { data: agendaData, refetch: refetchAgenda, isLoading: isLoadingAgenda } = trpc.agendamentos.listByMecanico.useQuery(
    { mecanicoId: mecanicoRefId ?? 0, data: agendaDate },
    { enabled: !!mecanicoRefId, refetchInterval: 60000 }
  );

  const utils = trpc.useUtils();
  const updateStatus = trpc.os.updateStatus.useMutation({
    onSuccess: () => {
      utils.os.patio.invalidate();
      toast.success("Status atualizado! +XP ganho 🎯");
      setSelectedOs(null);
      setNovoStatus("");
      setObservacao("");
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const updateStatusMecanico = trpc.agendamentos.updateStatusMecanico.useMutation({
    onSuccess: () => {
      utils.agendamentos.listByMecanico.invalidate();
      toast.success("Agendamento atualizado!");
      setSelectedAgendamento(null);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const osList = patioData ?? [];

  // Calcula XP total baseado nas OS concluídas hoje (simulado)
  const xpTotal = useMemo(() => {
    const prontas = osList.filter(o => o.os.status === "Pronto para Entrega").length;
    const emExec = osList.filter(o => o.os.status === "Em Execução").length;
    return prontas * 50 + emExec * 30;
  }, [osList]);

  // Nível baseado no XP
  const nivel = useMemo(() => {
    if (xpTotal >= 200) return { nivel: 5, titulo: "Mestre", cor: "text-yellow-400", icon: Trophy };
    if (xpTotal >= 100) return { nivel: 4, titulo: "Expert", cor: "text-purple-400", icon: Star };
    if (xpTotal >= 50) return { nivel: 3, titulo: "Avançado", cor: "text-blue-400", icon: Zap };
    if (xpTotal >= 20) return { nivel: 2, titulo: "Intermediário", cor: "text-green-400", icon: TrendingUp };
    return { nivel: 1, titulo: "Iniciante", cor: "text-gray-400", icon: Flame };
  }, [xpTotal]);

  // Agrupa OS por etapa do caminho
  const osPorEtapa = useMemo(() => {
    const grupos: Record<string, OsItem[]> = {};
    for (const etapa of CAMINHO_ETAPAS) {
      grupos[etapa.status] = osList.filter(o => o.os.status === etapa.status);
    }
    return grupos;
  }, [osList]);

  // OS filtradas pela etapa selecionada
  const osFiltradas = useMemo(() => {
    if (!etapaFiltro) return osList;
    return osList.filter(o => o.os.status === etapaFiltro);
  }, [osList, etapaFiltro]);

  function handleAtualizarStatus() {
    if (!selectedOs || !novoStatus) return;
    setAtualizando(true);
    updateStatus.mutate(
      { id: selectedOs.os.id, status: novoStatus, observacao: observacao || undefined },
      { onSettled: () => setAtualizando(false) }
    );
  }

  function handleAtualizarAgendamento() {
    if (!selectedAgendamento) return;
    updateStatusMecanico.mutate({
      id: selectedAgendamento.id,
      statusMecanico: novoStatusMecanico,
      observacoesMecanico: obsAgendamento || undefined,
    });
  }

  if (!loading && !user) {
    window.location.replace("/selecionar-perfil");
    return null;
  }

  const NivelIcon = nivel.icon;

  return (
    <div className="min-h-screen bg-[#0a0d12] text-white">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#0a0d12]/95 backdrop-blur border-b border-white/8">
        <div className="px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo + Nome */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c8a96e] to-[#a07840] flex items-center justify-center shadow-lg">
                  <Wrench className="w-5 h-5 text-black" />
                </div>
                {/* Badge de nível */}
                <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0a0d12] border-2 border-[#0a0d12] flex items-center justify-center text-[9px] font-black", nivel.cor)}>
                  {nivel.nivel}
                </div>
              </div>
              <div>
                <h1 className="font-bold text-white text-sm leading-none">
                  {loading ? "..." : roleInfo?.nome?.split(" ")[0] ?? "Mecânico"}
                </h1>
                <div className={cn("flex items-center gap-1 mt-0.5", nivel.cor)}>
                  <NivelIcon className="w-3 h-3" />
                  <span className="text-[10px] font-semibold">{nivel.titulo}</span>
                  <span className="text-[10px] text-gray-500">· {xpTotal} XP</span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => activeTab === "caminho" ? refetch() : refetchAgenda()}
                className="p-2 rounded-lg hover:bg-white/8 text-gray-400 hover:text-white transition-colors"
                title="Atualizar"
              >
                <RefreshCw className={cn("w-4 h-4", (isLoading || isLoadingAgenda) && "animate-spin")} />
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-white/8 text-gray-400 hover:text-white transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── BARRA DE XP ──────────────────────────────────────────────── */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
              <span>Progresso do dia</span>
              <span className="text-[#c8a96e]">{xpTotal} / {nivel.nivel < 5 ? [20, 50, 100, 200][nivel.nivel - 1] : 200} XP</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c8a96e] to-[#f0c87a] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (xpTotal / ([20, 50, 100, 200, 200][nivel.nivel - 1])) * 100)}%` }}
              />
            </div>
          </div>

          {/* ── TABS ─────────────────────────────────────────────────────── */}
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setActiveTab("caminho")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                activeTab === "caminho"
                  ? "bg-[#c8a96e]/15 text-[#c8a96e] border border-[#c8a96e]/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Target className="w-4 h-4" />
              Caminho
              {osList.length > 0 && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full", activeTab === "caminho" ? "bg-[#c8a96e]/20 text-[#c8a96e]" : "bg-white/10 text-gray-400")}>
                  {osList.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("agenda")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                activeTab === "agenda"
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <CalendarDays className="w-4 h-4" />
              Agenda
              {(agendaData ?? []).length > 0 && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full", activeTab === "agenda" ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-gray-400")}>
                  {(agendaData ?? []).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA CAMINHO DE APRENDIZADO */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "caminho" && (
          <>
            {/* ── CAMINHO VISUAL ─────────────────────────────────────────── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-[#c8a96e]" />
                <span className="text-sm font-semibold text-[#c8a96e]">Caminho do Mecânico</span>
                <span className="text-xs text-gray-500 ml-auto">Toque para filtrar</span>
              </div>

              {/* Trilha de etapas */}
              <div className="relative">
                {/* Linha conectora */}
                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-white/10 to-transparent" />

                <div className="flex flex-col gap-2">
                  {CAMINHO_ETAPAS.map((etapa, idx) => {
                    const count = osPorEtapa[etapa.status]?.length ?? 0;
                    const isAtiva = etapaFiltro === etapa.status;
                    const Icon = etapa.icon;
                    const isLast = idx === CAMINHO_ETAPAS.length - 1;

                    return (
                      <button
                        key={etapa.status}
                        onClick={() => setEtapaFiltro(isAtiva ? null : etapa.status)}
                        className={cn(
                          "relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                          isAtiva
                            ? cn(etapa.corBg, etapa.corBorder, "shadow-lg scale-[1.01]")
                            : count > 0
                              ? "bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15"
                              : "bg-transparent border-transparent opacity-40 cursor-default"
                        )}
                        disabled={count === 0}
                      >
                        {/* Ícone da etapa */}
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                          isAtiva ? `bg-gradient-to-br ${etapa.cor}` : "bg-white/5"
                        )}>
                          <Icon className={cn("w-5 h-5", isAtiva ? "text-white" : etapa.corText)} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-medium", isAtiva ? "text-white" : count > 0 ? "text-gray-200" : "text-gray-600")}>
                              {etapa.label}
                            </span>
                            {count > 0 && (
                              <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold", isAtiva ? "bg-white/20 text-white" : "bg-white/10 text-gray-300")}>
                                {count}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Zap className="w-3 h-3 text-[#c8a96e]" />
                            <span className="text-[10px] text-[#c8a96e]/70">+{etapa.xp} XP ao avançar</span>
                          </div>
                        </div>

                        {/* Seta */}
                        {count > 0 && (
                          <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", isAtiva ? etapa.corText : "text-gray-600", isAtiva && "rotate-90")} />
                        )}

                        {/* Conector para próxima etapa */}
                        {!isLast && count > 0 && (
                          <ArrowRight className="absolute -bottom-3 left-5 w-3 h-3 text-white/10 rotate-90" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── LISTA DE OS ────────────────────────────────────────────── */}
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-[#161b22] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : osFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                {etapaFiltro ? (
                  <>
                    <CircleDot className="w-10 h-10 text-gray-600 mb-3" />
                    <p className="text-gray-400 font-medium">Nenhuma OS nesta etapa</p>
                    <button onClick={() => setEtapaFiltro(null)} className="text-xs text-[#c8a96e] mt-2 hover:underline">
                      Ver todas as OS
                    </button>
                  </>
                ) : (
                  <>
                    <Car className="w-10 h-10 text-gray-600 mb-3" />
                    <p className="text-gray-400 font-medium">Nenhuma OS no pátio</p>
                    <p className="text-gray-600 text-sm mt-1">Todas as OS foram entregues</p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {etapaFiltro && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {osFiltradas.length} OS em <strong className="text-white">{etapaFiltro}</strong>
                    </span>
                    <button onClick={() => setEtapaFiltro(null)} className="text-xs text-[#c8a96e] hover:underline">
                      Limpar filtro
                    </button>
                  </div>
                )}
                {osFiltradas.map(item => <OsCard key={item.os.id} item={item} onSelect={(os) => { setSelectedOs(os); setNovoStatus(os.os.status ?? ""); setObservacao(""); }} />)}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ABA AGENDA */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "agenda" && (
          <>
            {/* Seletor de data */}
            <div className="flex items-center gap-3 mb-5 bg-[#161b22] border border-white/8 rounded-xl p-3">
              <CalendarDays className="w-4 h-4 text-blue-400 shrink-0" />
              <input
                type="date"
                value={agendaDate}
                onChange={e => setAgendaDate(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none flex-1"
              />
              {agendaDate === new Date().toISOString().split("T")[0] && (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Hoje</span>
              )}
            </div>

            {!mecanicoRefId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-300 font-semibold">Mecânico não vinculado</p>
                <p className="text-gray-500 text-sm mt-2 max-w-xs leading-relaxed">
                  Peça ao Dev para vincular seu usuário ao mecânico correspondente no Painel DEV → Usuários
                </p>
              </div>
            ) : isLoadingAgenda ? (
              <div className="flex flex-col gap-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-[#161b22] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (agendaData ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-300 font-semibold">Nenhum agendamento</p>
                <p className="text-gray-500 text-sm mt-1">Agendamentos atribuídos a você aparecerão aqui</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(agendaData ?? []).map((ag: any) => (
                  <AgendamentoCard
                    key={ag.id}
                    ag={ag}
                    onSelect={() => {
                      setSelectedAgendamento(ag);
                      setNovoStatusMecanico((ag.statusMecanico ?? "pendente") as any);
                      setObsAgendamento(ag.observacoesMecanico ?? "");
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── DIALOG: ATUALIZAR OS ──────────────────────────────────────────────── */}
      <Dialog open={!!selectedOs} onOpenChange={(open) => !open && setSelectedOs(null)}>
        <DialogContent className="bg-[#0f1318] border border-white/10 max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#c8a96e]/10 flex items-center justify-center">
                <Car className="w-4 h-4 text-[#c8a96e]" />
              </div>
              <div>
                <span className="text-white">{selectedOs?.os.placa ?? "OS"}</span>
                <p className="text-xs text-gray-400 font-normal mt-0.5">Atualizar status da OS</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedOs && (
            <div className="space-y-4">
              {/* Info do veículo */}
              <div className="bg-white/3 rounded-xl p-3 space-y-1.5 border border-white/5">
                <p className="text-sm font-medium text-white">
                  {[selectedOs.veiculo?.marca, selectedOs.veiculo?.modelo].filter(Boolean).join(" ") || "Veículo não informado"}
                </p>
                <p className="text-xs text-gray-400">{selectedOs.cliente?.nomeCompleto ?? "Cliente não informado"}</p>
                {selectedOs.os.diagnostico && (
                  <p className="text-xs text-gray-500 italic border-t border-white/5 pt-1.5 mt-1.5">
                    {selectedOs.os.diagnostico}
                  </p>
                )}
              </div>

              {/* XP Preview */}
              {novoStatus && novoStatus !== selectedOs.os.status && (
                <div className="flex items-center gap-2 bg-[#c8a96e]/5 border border-[#c8a96e]/20 rounded-lg px-3 py-2">
                  <Zap className="w-4 h-4 text-[#c8a96e]" />
                  <span className="text-xs text-[#c8a96e]">
                    +{CAMINHO_ETAPAS.find(e => e.status === novoStatus)?.xp ?? 10} XP ao confirmar
                  </span>
                </div>
              )}

              {/* Select de status */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Novo Status</label>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger className="bg-[#161b22] border-white/10 text-white">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161b22] border-white/10">
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-white/5">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Observação */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Observação (opcional)</label>
                <Textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Descreva o que foi feito..."
                  className="bg-[#161b22] border-white/10 text-white resize-none h-20 text-sm"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 text-gray-400 hover:text-white bg-transparent"
                  onClick={() => setSelectedOs(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-[#c8a96e] hover:bg-[#b8994e] text-black font-semibold"
                  onClick={handleAtualizarStatus}
                  disabled={!novoStatus || atualizando || updateStatus.isPending}
                >
                  {atualizando || updateStatus.isPending ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCheck className="w-4 h-4 mr-1.5" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: ATUALIZAR AGENDAMENTO ────────────────────────────────────── */}
      <Dialog open={!!selectedAgendamento} onOpenChange={(open) => !open && setSelectedAgendamento(null)}>
        <DialogContent className="bg-[#0f1318] border border-white/10 max-w-sm mx-4 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Timer className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="text-white">Agendamento</span>
                <p className="text-xs text-gray-400 font-normal mt-0.5">{selectedAgendamento?.horaAgendamento}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <div className="space-y-4">
              <div className="bg-white/3 rounded-xl p-3 space-y-1.5 border border-white/5">
                <p className="text-sm font-medium text-white">{selectedAgendamento.clienteNome}</p>
                <p className="text-xs text-gray-400">{selectedAgendamento.veiculoModelo} · {selectedAgendamento.veiculoPlaca}</p>
                {selectedAgendamento.motivoVisita && (
                  <p className="text-xs text-gray-500 italic border-t border-white/5 pt-1.5 mt-1.5">{selectedAgendamento.motivoVisita}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Status do Agendamento</label>
                <Select value={novoStatusMecanico} onValueChange={(v) => setNovoStatusMecanico(v as any)}>
                  <SelectTrigger className="bg-[#161b22] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161b22] border-white/10">
                    <SelectItem value="pendente" className="text-white hover:bg-white/5">Pendente</SelectItem>
                    <SelectItem value="confirmado" className="text-white hover:bg-white/5">Confirmado</SelectItem>
                    <SelectItem value="concluido" className="text-white hover:bg-white/5">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Observações (opcional)</label>
                <Textarea
                  value={obsAgendamento}
                  onChange={e => setObsAgendamento(e.target.value)}
                  placeholder="Anotações sobre o agendamento..."
                  className="bg-[#161b22] border-white/10 text-white resize-none h-20 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1 border-white/10 text-gray-400 hover:text-white bg-transparent" onClick={() => setSelectedAgendamento(null)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleAtualizarAgendamento}
                  disabled={updateStatusMecanico.isPending}
                >
                  {updateStatusMecanico.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── SUB-COMPONENTES ─────────────────────────────────────────────────────────

function OsCard({ item, onSelect }: { item: OsItem; onSelect: (item: OsItem) => void }) {
  const etapa = CAMINHO_ETAPAS.find(e => e.status === item.os.status);
  const prioridade = (item.os as { prioridade?: string }).prioridade ?? "media";
  const previsaoEntrega = (item.os as { previsaoEntrega?: string }).previsaoEntrega ?? null;
  const Icon = etapa?.icon ?? Car;

  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left bg-[#0f1318] border border-white/8 rounded-xl p-4 hover:border-white/15 hover:bg-[#161b22] transition-all active:scale-[0.98] group"
    >
      <div className="flex items-start gap-3">
        {/* Ícone da etapa */}
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", etapa?.corBg ?? "bg-gray-500/10", etapa?.corBorder ?? "border-gray-500/30", "border")}>
          <Icon className={cn("w-5 h-5", etapa?.corText ?? "text-gray-400")} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-white text-base tracking-wider">
              {item.os.placa ?? item.veiculo?.placa ?? "—"}
            </span>
            <span className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              prioridade === "alta" ? "bg-red-500/20 text-red-400" :
              prioridade === "media" ? "bg-yellow-500/20 text-yellow-400" :
              "bg-green-500/20 text-green-400"
            )}>
              {prioridade}
            </span>
          </div>
          <p className="text-sm text-gray-300 truncate">
            {[item.veiculo?.marca, item.veiculo?.modelo].filter(Boolean).join(" ") || "Veículo não informado"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {item.cliente?.nomeCompleto ?? "Cliente não informado"}
          </p>
          {item.os.diagnostico && (
            <p className="text-xs text-gray-400 mt-1.5 line-clamp-1 italic">
              "{item.os.diagnostico}"
            </p>
          )}
        </div>

        {/* Seta */}
        <ChevronRight className="w-4 h-4 text-gray-600 shrink-0 group-hover:text-gray-400 transition-colors mt-1" />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-white/5">
        <div className={cn("flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border", etapa?.corBg ?? "bg-gray-500/10", etapa?.corBorder ?? "border-gray-500/30", etapa?.corText ?? "text-gray-400")}>
          <Icon className="w-3 h-3" />
          {item.os.status}
        </div>
        {previsaoEntrega && (
          <div className="flex items-center gap-1 text-[10px] text-gray-500 ml-auto">
            <Clock className="w-3 h-3" />
            {previsaoEntrega}
          </div>
        )}
        <div className="flex items-center gap-1 text-[10px] text-[#c8a96e]/60 ml-auto">
          <Zap className="w-3 h-3" />
          +{etapa?.xp ?? 10} XP
        </div>
      </div>
    </button>
  );
}

function AgendamentoCard({ ag, onSelect }: { ag: any; onSelect: () => void }) {
  const statusConfig = {
    pendente: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", label: "Pendente" },
    confirmado: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", label: "Confirmado" },
    concluido: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", label: "Concluído" },
  };
  const s = statusConfig[ag.statusMecanico as keyof typeof statusConfig] ?? statusConfig.pendente;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-[#0f1318] border border-white/8 rounded-xl p-4 hover:border-white/15 hover:bg-[#161b22] transition-all active:scale-[0.98] group"
    >
      <div className="flex items-start gap-3">
        {/* Horário */}
        <div className="w-14 shrink-0 text-center">
          <span className="text-lg font-black text-white leading-none">{ag.horaAgendamento?.slice(0, 5)}</span>
          <div className={cn("text-[9px] font-semibold mt-1 px-1 py-0.5 rounded-full border", s.bg, s.border, s.text)}>
            {s.label}
          </div>
        </div>

        {/* Divisor */}
        <div className="w-px bg-white/8 self-stretch shrink-0" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{ag.clienteNome}</p>
          <p className="text-xs text-gray-400 mt-0.5">{ag.veiculoModelo} · {ag.veiculoPlaca}</p>
          {ag.motivoVisita && (
            <p className="text-xs text-gray-500 mt-1 italic truncate">{ag.motivoVisita}</p>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {ag.clienteTelefone && ag.clienteTelefone !== "—" && (
            <a
              href={`tel:${ag.clienteTelefone}`}
              onClick={e => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
        </div>
      </div>
    </button>
  );
}
