import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Car,
  User,
  Wrench,
  Clock,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  DollarSign,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";

const STATUS_BADGE: Record<string, string> = {
  "Diagnóstico": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Orçamento": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Aguardando Aprovação": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Aguardando Peças": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Em Execução": "bg-green-500/20 text-green-300 border-green-500/30",
  "Pronto": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Entregue": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "Cancelada": "bg-red-500/20 text-red-300 border-red-500/30",
};

const STATUS_FLOW = [
  "Diagnóstico",
  "Orçamento",
  "Aguardando Aprovação",
  "Aguardando Peças",
  "Em Execução",
  "Pronto",
  "Entregue",
];

function formatCurrency(v: string | number | null | undefined) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d as string).toLocaleDateString("pt-BR");
}

function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d as string).toLocaleString("pt-BR");
}

export default function OsDetail() {
  const [, params] = useRoute("/os/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id ?? "0");

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [obs, setObs] = useState("");
  const [valorFinalInput, setValorFinalInput] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.os.get.useQuery({ id }, { enabled: id > 0 });
  const { data: mecanicos } = trpc.mecanicos.list.useQuery();

  const updateStatus = trpc.os.updateStatus.useMutation({
    onSuccess: () => {
      utils.os.get.invalidate({ id });
      utils.os.patio.invalidate();
      utils.dashboard.kpis.invalidate();
      toast.success("Status atualizado!");
      setStatusDialogOpen(false);
      setObs("");
      setValorFinalInput("");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const updateOs = trpc.os.update.useMutation({
    onSuccess: () => {
      utils.os.get.invalidate({ id });
      toast.success("OS atualizada!");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">
          <p>OS não encontrada.</p>
          <Button variant="ghost" className="mt-4" asChild>
            <Link href="/os">Voltar para lista</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  type OsData = NonNullable<typeof data>;
  const { os, cliente, veiculo, mecanico, colaborador, historico, itens } = data as OsData;
  const currentStatusIdx = STATUS_FLOW.indexOf(os.status ?? "");

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    const payload: Parameters<typeof updateStatus.mutate>[0] = {
      id,
      status: newStatus,
      observacao: obs || undefined,
    };
    // If delivering, also update valorTotalOs
    if (newStatus === "Entregue" && valorFinalInput) {
      updateOs.mutate({ id, valorTotalOs: parseFloat(valorFinalInput) });
    }
    updateStatus.mutate(payload);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/os">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground font-mono">
                {os.numeroOs ?? `OS #${os.id}`}
              </h1>
              <Badge variant="outline" className={STATUS_BADGE[os.status ?? ""] ?? ""}>
                {os.status ?? "—"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Criada em {formatDateTime(os.createdAt)}
            </p>
          </div>
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Atualizar Status
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Atualizar Status da OS</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Novo Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="mt-1 border-border">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Diagnóstico", "Orçamento", "Aguardando Aprovação", "Aguardando Peças", "Em Execução", "Pronto", "Entregue", "Cancelada"]
                        .filter((s) => s !== os.status)
                        .map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {newStatus === "Entregue" && (
                  <div>
                    <Label>Valor Final (R$)</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      className="mt-1 border-border"
                      value={valorFinalInput}
                      onChange={(e) => setValorFinalInput(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <Label>Observação</Label>
                  <Textarea
                    placeholder="Observação sobre a mudança de status..."
                    className="mt-1 border-border resize-none"
                    rows={3}
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || updateStatus.isPending}
                >
                  {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirmar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Flow */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
              {STATUS_FLOW.map((s, i) => {
                const done = i < currentStatusIdx;
                const active = i === currentStatusIdx;
                return (
                  <div key={s} className="flex items-center gap-1 shrink-0">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                          ? "bg-green-500/20 text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done && <CheckCircle2 className="w-3 h-3" />}
                      {s}
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vehicle & Client */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                Veículo & Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-lg font-bold font-mono text-foreground">
                  {os.placa ?? veiculo?.placa ?? "—"}
                </p>
                {veiculo && (
                  <p className="text-sm text-muted-foreground">
                    {veiculo.marca} {veiculo.modelo} {veiculo.ano && `(${veiculo.ano})`}
                  </p>
                )}
                {os.km && (
                  <p className="text-xs text-muted-foreground">
                    KM: {os.km.toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
              {cliente && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {cliente.nomeCompleto}
                    </span>
                  </div>
                  {cliente.telefone && (
                    <p className="text-xs text-muted-foreground mt-1 ml-5">{cliente.telefone}</p>
                  )}
                  <Button variant="ghost" size="sm" className="mt-1 h-6 text-xs ml-4" asChild>
                    <Link href={`/crm/${os.clienteId}`}>Ver no CRM</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Info */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Informações do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Mecânico", value: (mecanico as any)?.nome ?? "—" },
                { label: "Consultor", value: (colaborador as any)?.nome ?? "—" },
                { label: "Motivo da Visita", value: os.motivoVisita ?? "—" },
                { label: "Veio de Promoção", value: os.veioDePromocao ? "Sim" : "Não" },
                { label: "Primeira Vez", value: os.primeiraVez ? "Sim" : "Não" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium text-right max-w-[60%] truncate">
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Entrada", value: formatDate(os.dataEntrada) },
                { label: "Saída / Entrega", value: formatDate(os.dataSaida) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Financial */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Orçamento Total", value: formatCurrency(os.totalOrcamento) },
                { label: "Valor Final OS", value: formatCurrency(os.valorTotalOs), highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span
                    className={`font-medium ${
                      highlight ? "text-green-400 text-base" : "text-foreground"
                    }`}
                  >
                    {value}
                  </span>
                </div>
              ))}
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">Atualizar Valor Final</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    placeholder="R$ 0,00"
                    className="border-border h-8 text-sm"
                    onChange={(e) => setValorFinalInput(e.target.value)}
                    value={valorFinalInput}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-border"
                    disabled={!valorFinalInput || updateOs.isPending}
                    onClick={() => {
                      if (valorFinalInput) {
                        updateOs.mutate({ id, valorTotalOs: parseFloat(valorFinalInput) });
                        setValorFinalInput("");
                      }
                    }}
                  >
                    {updateOs.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Observations */}
        {os.observacoes && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{os.observacoes}</p>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        {itens && itens.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Itens da OS ({itens.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(itens as any[]).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.tipo} · Qtd: {item.quantidade}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-400">
                        {formatCurrency(item.valorTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.valorUnitario)} un.
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-semibold">
                  <span className="text-sm text-foreground">Total Itens</span>
                  <span className="text-sm text-green-400">
                    {formatCurrency(
                      (itens as any[]).reduce((sum: number, i: any) => sum + Number(i.valorTotal ?? 0), 0)
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History Timeline */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Histórico de Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!historico || historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem histórico registrado.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {(historico as any[]).map((h: any) => (
                    <div key={h.id} className="flex gap-4 pl-7 relative">
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.statusAnterior && (
                            <>
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {h.statusAnterior}
                              </Badge>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            </>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 ${STATUS_BADGE[h.statusNovo ?? ""] ?? ""}`}
                          >
                            {h.statusNovo ?? "—"}
                          </Badge>
                        </div>
                        {h.observacao && (
                          <p className="text-xs text-muted-foreground mt-1">{h.observacao}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(h.dataAlteracao)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
