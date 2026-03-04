/**
 * MecanicoView — Tela dedicada para mecânicos
 * Otimizada para tablet/celular, focada nas OS do dia e atualização de status.
 * Sem sidebar — interface limpa e direta.
 */
import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const STATUS_OPTIONS = [
  "Diagnóstico",
  "Aguardando Aprovação",
  "Aprovado",
  "Em Execução",
  "Aguardando Peças",
  "Pronto para Entrega",
  "Entregue",
];

const STATUS_COLOR: Record<string, string> = {
  "Diagnóstico": "bg-gray-500/20 text-gray-300 border-gray-500/30",
  "Aguardando Aprovação": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Aprovado": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Em Execução": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Aguardando Peças": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Pronto para Entrega": "bg-green-500/20 text-green-300 border-green-500/30",
  "Entregue": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const PRIORIDADE_COLOR: Record<string, string> = {
  alta: "text-red-400",
  media: "text-yellow-400",
  baixa: "text-green-400",
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

export default function MecanicoView() {
  const { user, loading, logout } = useAuth();
  const [selectedOs, setSelectedOs] = useState<OsItem | null>(null);
  const [novoStatus, setNovoStatus] = useState("");
  const [observacao, setObservacao] = useState("");
  const [atualizando, setAtualizando] = useState(false);

  // Busca OS ativas (excluindo Entregue e Cancelada)
  const { data: patioData, refetch, isLoading } = trpc.os.patio.useQuery(undefined, {
    refetchInterval: 30000, // auto-refresh a cada 30s
  });

  const utils = trpc.useUtils();
  const updateStatus = trpc.os.updateStatus.useMutation({
    onSuccess: () => {
      utils.os.patio.invalidate();
      toast.success("Status atualizado com sucesso!");
      setSelectedOs(null);
      setNovoStatus("");
      setObservacao("");
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  // Se não logado, redireciona para seleção de perfil
  if (!loading && !user) {
    window.location.replace("/selecionar-perfil");
    return null;
  }

  const osList = patioData ?? [];

  // Agrupa por status para exibição organizada
  const emExecucao = osList.filter(o => o.os.status === "Em Execução");
  const aguardando = osList.filter(o => ["Aguardando Aprovação", "Aguardando Peças"].includes(o.os.status ?? ""));
  const outras = osList.filter(o => !["Em Execução", "Aguardando Aprovação", "Aguardando Peças", "Pronto para Entrega"].includes(o.os.status ?? ""));
  const prontas = osList.filter(o => o.os.status === "Pronto para Entrega");

  function handleAtualizarStatus() {
    if (!selectedOs || !novoStatus) return;
    setAtualizando(true);
    updateStatus.mutate(
      { id: selectedOs.os.id, status: novoStatus, observacao: observacao || undefined },
      { onSettled: () => setAtualizando(false) }
    );
  }

  function OsCard({ item }: { item: OsItem }) {
    const statusClass = STATUS_COLOR[item.os.status ?? ""] ?? "bg-gray-500/20 text-gray-300";
    const prioridade = (item.os as { prioridade?: string }).prioridade ?? "media";
    const previsaoEntrega = (item.os as { previsaoEntrega?: string }).previsaoEntrega ?? null;
    const prioridadeClass = PRIORIDADE_COLOR[prioridade] ?? "text-yellow-400";
    return (
      <button
        onClick={() => {
          setSelectedOs(item);
          setNovoStatus(item.os.status ?? "");
          setObservacao("");
        }}
        className="w-full text-left bg-[#161b22] border border-white/8 rounded-xl p-4 hover:border-primary/40 hover:bg-[#1c2330] transition-all active:scale-[0.98]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Placa + Veículo */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-bold text-white text-base tracking-wider">
                {item.os.placa ?? item.veiculo?.placa ?? "—"}
              </span>
              <span className={cn("text-xs font-medium", prioridadeClass)}>
                ● {prioridade}
              </span>
            </div>
            <p className="text-sm text-gray-300 truncate">
              {[item.veiculo?.marca, item.veiculo?.modelo].filter(Boolean).join(" ") || "Veículo não informado"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {item.cliente?.nomeCompleto ?? "Cliente não informado"}
            </p>
            {item.os.diagnostico && (
              <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 italic">
                "{item.os.diagnostico}"
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={cn("text-xs border", statusClass)}>
              {item.os.status}
            </Badge>
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>
        </div>
        {previsaoEntrega && (
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            Previsão: {previsaoEntrega}
          </div>
        )}
      </button>
    );
  }

  function Section({ title, icon: Icon, items, color }: {
    title: string;
    icon: React.ElementType;
    items: OsItem[];
    color: string;
  }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <div className={cn("flex items-center gap-2 mb-3 text-sm font-semibold", color)}>
          <Icon className="w-4 h-4" />
          {title}
          <span className="ml-auto bg-white/10 text-white text-xs px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {items.map(item => <OsCard key={item.os.id} item={item} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0d1117]/95 backdrop-blur border-b border-white/8 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-none">Doctor Auto</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {loading ? "Carregando..." : user?.name ?? "Mecânico"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg hover:bg-white/8 text-gray-400 hover:text-white transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
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
      </div>

      {/* Resumo rápido */}
      <div className="px-4 pt-4 pb-2 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">{emExecucao.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Em Execução</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{aguardando.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Aguardando</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{prontas.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Prontas</p>
          </div>
        </div>

        {/* Lista de OS */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-[#161b22] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : osList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Car className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">Nenhuma OS no pátio</p>
            <p className="text-gray-600 text-sm mt-1">Todas as OS foram entregues ou canceladas</p>
          </div>
        ) : (
          <>
            <Section title="Em Execução" icon={Wrench} items={emExecucao} color="text-orange-400" />
            <Section title="Prontas para Entrega" icon={CheckCircle2} items={prontas} color="text-green-400" />
            <Section title="Aguardando" icon={AlertTriangle} items={aguardando} color="text-yellow-400" />
            <Section title="Outras" icon={Car} items={outras} color="text-gray-400" />
          </>
        )}
      </div>

      {/* Modal de atualização de status */}
      <Dialog open={!!selectedOs} onOpenChange={(open) => !open && setSelectedOs(null)}>
        <DialogContent className="bg-[#161b22] border-white/10 max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              {selectedOs?.os.placa ?? "OS"} — Atualizar Status
            </DialogTitle>
          </DialogHeader>

          {selectedOs && (
            <div className="space-y-4">
              {/* Info do veículo */}
              <div className="bg-white/5 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium text-white">
                  {[selectedOs.veiculo?.marca, selectedOs.veiculo?.modelo].filter(Boolean).join(" ") || "Veículo não informado"}
                </p>
                <p className="text-xs text-gray-400">{selectedOs.cliente?.nomeCompleto ?? "—"}</p>
                {selectedOs.os.diagnostico && (
                  <p className="text-xs text-gray-400 italic mt-1">"{selectedOs.os.diagnostico}"</p>
                )}
              </div>

              {/* Status atual */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Status atual</p>
                <Badge className={cn("border", STATUS_COLOR[selectedOs.os.status ?? ""] ?? "bg-gray-500/20 text-gray-300")}>
                  {selectedOs.os.status}
                </Badge>
              </div>

              {/* Novo status */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Novo status</p>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecionar novo status..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c2330] border-white/10">
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-white/10">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Observação */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Observação (opcional)</p>
                <Textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Descreva o que foi feito ou o motivo da mudança..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 resize-none"
                  rows={3}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 text-gray-400 hover:text-white"
                  onClick={() => setSelectedOs(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  disabled={!novoStatus || novoStatus === selectedOs.os.status || atualizando}
                  onClick={handleAtualizarStatus}
                >
                  {atualizando ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Atualizar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
