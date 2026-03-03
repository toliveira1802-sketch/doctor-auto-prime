import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Car, User, Wrench, Clock, CheckCircle, AlertCircle, DollarSign, FileText } from "lucide-react";

const STATUSES = ["Diagnóstico", "Orçamento", "Aguardando Aprovação", "Aprovado", "Em Execução", "Aguardando Peça", "Pronto", "Entregue", "Cancelado"];

const STATUS_COLORS: Record<string, string> = {
  "Diagnóstico": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Orçamento": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Aguardando Aprovação": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Aprovado": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Em Execução": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Aguardando Peça": "bg-red-500/20 text-red-400 border-red-500/30",
  "Pronto": "bg-green-500/20 text-green-400 border-green-500/30",
  "Entregue": "bg-muted text-muted-foreground",
  "Cancelado": "bg-red-900/20 text-red-500",
};

export default function AdminOSDetalhes() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id ?? "0");

  const [newStatus, setNewStatus] = useState("");
  const [obs, setObs] = useState("");

  const { data: osData, refetch, isLoading } = trpc.os.get.useQuery({ id }, { enabled: !!id });
  const utils = trpc.useUtils();

  const updateStatus = trpc.os.updateStatus.useMutation({
    onSuccess: () => { refetch(); setNewStatus(""); toast.success("Status atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const addObs = trpc.os.addObservacao.useMutation({
    onSuccess: () => { refetch(); setObs(""); toast.success("Observação adicionada!"); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!osData) return <div className="p-6 text-muted-foreground">OS não encontrada</div>;

  const os = (osData as any).os ?? osData;
  const cliente = (osData as any).cliente;
  const veiculo = (osData as any).veiculo;
  const mecanico = (osData as any).mecanico;
  const colaborador = (osData as any).colaborador;
  const historico: any[] = (osData as any).historico ?? [];
  const itens: any[] = (osData as any).itens ?? [];

  const status = os.status;
  const createdAt = os.createdAt ? new Date(os.createdAt) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/os")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{os.numeroOs}</h1>
            <Badge className={`border ${STATUS_COLORS[status] ?? "bg-muted"}`}>{status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Aberta em {createdAt?.toLocaleDateString("pt-BR")} às {createdAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Mover para..." /></SelectTrigger>
            <SelectContent>{STATUSES.filter(s => s !== status).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => { if (newStatus) updateStatus.mutate({ id: os.id, status: newStatus }); }} disabled={!newStatus || updateStatus.isPending}>
            {updateStatus.isPending ? "..." : "Mover"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client & Vehicle */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-primary" />Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <div className="font-semibold">{cliente?.nomeCompleto ?? "—"}</div>
                <div className="text-sm text-muted-foreground">{cliente?.telefone}</div>
                <div className="text-sm text-muted-foreground">{cliente?.email}</div>
                {cliente?.id && (
                  <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate(`/admin/clientes/${cliente.id}`)}>
                    Ver perfil completo →
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4 text-primary" />Veículo</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <div className="font-mono font-bold text-primary">{veiculo?.placa ?? os.placa ?? "—"}</div>
                <div className="font-semibold">{veiculo?.marca} {veiculo?.modelo} {veiculo?.versao}</div>
                <div className="text-sm text-muted-foreground">{veiculo?.ano} · {veiculo?.combustivel}</div>
                <div className="text-sm text-muted-foreground">{(os.km ?? 0).toLocaleString()} km</div>
              </CardContent>
            </Card>
          </div>

          {/* Service Info */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" />Serviço</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Motivo da Visita</div>
                <div className="text-sm">{os.motivoVisita ?? "—"}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Consultor</div>
                  <div className="font-medium">{colaborador?.nome ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Mecânico</div>
                  <div className="font-medium">{mecanico?.nome ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tipo</div>
                  <div className="font-medium">{os.tipoServico1 ?? "—"}</div>
                </div>
              </div>
              {os.observacoes && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Observações</div>
                  <div className="text-sm text-muted-foreground">{os.observacoes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          {itens.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Itens da OS</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {itens.map((item: any, i: number) => (
                    <div key={i} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{item.descricao}</div>
                        <div className="text-xs text-muted-foreground">{item.tipo} · Qtd: {item.quantidade}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">R$ {Number(item.valorTotal ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                        <Badge variant={item.aprovado ? "default" : "outline"} className="text-xs">
                          {item.aprovado ? "Aprovado" : "Pendente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-green-400">R$ {Number(os.valorTotalOs ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Observation */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Adicionar Observação</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Digite uma observação sobre esta OS..." rows={3} />
              <Button size="sm" onClick={() => { if (obs.trim()) addObs.mutate({ id: os.id, observacao: obs }); }} disabled={!obs.trim() || addObs.isPending}>
                {addObs.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Timeline */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Histórico</CardTitle></CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">Sem histórico</div>
              ) : (
                <div className="space-y-3">
                  {historico.map((h: any, i: number) => {
                    const hDate = h.createdAt ? new Date(h.createdAt) : null;
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          {i < historico.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                        </div>
                        <div className="pb-3 flex-1">
                          <div className="text-xs font-medium">{h.acao ?? h.statusNovo ?? "Atualização"}</div>
                          {h.observacao && <div className="text-xs text-muted-foreground mt-0.5">{h.observacao}</div>}
                          <div className="text-xs text-muted-foreground mt-1">
                            {hDate?.toLocaleDateString("pt-BR")} {hDate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
