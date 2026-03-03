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
  Edit,
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
  const [valorFinal, setValorFinal] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.os.byId.useQuery({ id }, { enabled: id > 0 });
  const { data: mecanicos } = trpc.mecanicos.list.useQuery();

  const updateStatus = trpc.os.updateStatus.useMutation({
    onSuccess: () => {
      utils.os.byId.invalidate({ id });
      utils.os.patio.invalidate();
      utils.dashboard.kpis.invalidate();
      toast.success("Status atualizado!");
      setStatusDialogOpen(false);
      setObs("");
      setValorFinal("");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const updateOs = trpc.os.update.useMutation({
    onSuccess: () => {
      utils.os.byId.invalidate({ id });
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

  const { os, cliente, veiculo, mecanico, historico } = data;
  const currentStatusIdx = STATUS_FLOW.indexOf(os.status);

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    updateStatus.mutate({
      id,
      status: newStatus as Parameters<typeof updateStatus.mutate>[0]["status"],
      observacao: obs || undefined,
      valorFinal: valorFinal ? parseFloat(valorFinal) : undefined,
    });
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
              <h1 className="text-xl font-bold text-foreground font-mono">{os.numero}</h1>
              <Badge variant="outline" className={STATUS_BADGE[os.status] ?? ""}>
                {os.status}
              </Badge>
              {os.tipoServico && (
                <Badge variant="secondary" className="text-xs">
                  {os.tipoServico}
                </Badge>
              )}
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
                      value={valorFinal}
                      onChange={(e) => setValorFinal(e.target.value)}
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
              {veiculo && (
                <div>
                  <p className="text-lg font-bold font-mono text-foreground">{veiculo.placa}</p>
                  <p className="text-sm text-muted-foreground">
                    {veiculo.marca} {veiculo.modelo} {veiculo.ano && `(${veiculo.ano})`}
                  </p>
                  {veiculo.cor && <p className="text-xs text-muted-foreground">Cor: {veiculo.cor}</p>}
                </div>
              )}
              {cliente && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{cliente.nome}</span>
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
                { label: "Mecânico", value: mecanico ? `${mecanico.emoji} ${mecanico.nome}` : "—" },
                { label: "Consultor", value: os.consultorNome ?? "—" },
                { label: "Tipo", value: os.tipoServico ?? "—" },
                { label: "KM Entrada", value: os.kmEntrada ? `${os.kmEntrada.toLocaleString("pt-BR")} km` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium">{value}</span>
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
                { label: "Previsão Entrega", value: formatDate(os.dataPrevisaoEntrega) },
                { label: "Entrega Real", value: formatDate(os.dataEntrega) },
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
                { label: "Orçamento", value: formatCurrency(os.valorOrcamento) },
                { label: "Aprovado", value: formatCurrency(os.valorAprovado) },
                { label: "Valor Final", value: formatCurrency(os.valorFinal), highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-medium ${highlight ? "text-green-400 text-base" : "text-foreground"}`}>
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Problem Description */}
        {os.descricaoProblema && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Problema Relatado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{os.descricaoProblema}</p>
            </CardContent>
          </Card>
        )}

        {/* Services Performed */}
        {os.servicosRealizados && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Serviços Realizados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{os.servicosRealizados}</p>
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
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem histórico registrado.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {historico.map((h) => (
                    <div key={h.id} className="flex gap-4 pl-7 relative">
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {h.statusAnterior && (
                            <>
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {h.statusAnterior}
                              </Badge>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            </>
                          )}
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${STATUS_BADGE[h.statusNovo] ?? ""}`}>
                            {h.statusNovo}
                          </Badge>
                        </div>
                        {h.observacao && (
                          <p className="text-xs text-muted-foreground mt-1">{h.observacao}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {h.usuarioNome} · {formatDateTime(h.createdAt)}
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
