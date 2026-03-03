import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarClock, Plus, ChevronLeft, ChevronRight, Car, User, Loader2, Check, X } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  Confirmado: "bg-green-500/20 text-green-300 border-green-500/30",
  Pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Cancelado: "bg-red-500/20 text-red-300 border-red-500/30",
  Concluído: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    clienteSearch: "",
    selectedClienteId: null as number | null,
    selectedVeiculoId: null as number | null,
    mecanicoId: "",
    hora: "08:00",
    motivoVisita: "",
    status: "Pendente",
    observacoes: "",
  });

  const utils = trpc.useUtils();
  const dateStr = formatDate(selectedDate);

  const { data: agendamentos, isLoading } = trpc.agendamentos.list.useQuery({ data: dateStr });
  const { data: mecanicos } = trpc.mecanicos.list.useQuery();
  const { data: clienteResults } = trpc.clientes.list.useQuery(
    { search: form.clienteSearch, limit: 5 },
    { enabled: form.clienteSearch.length >= 2 }
  );
  const { data: veiculosCliente } = trpc.veiculos.list.useQuery(
    { clienteId: form.selectedClienteId! },
    { enabled: form.selectedClienteId !== null }
  );

  const createAgendamento = trpc.agendamentos.create.useMutation({
    onSuccess: () => {
      utils.agendamentos.list.invalidate();
      utils.dashboard.kpis.invalidate();
      toast.success("Agendamento criado!");
      setDialogOpen(false);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const updateStatus = trpc.agendamentos.updateStatus.useMutation({
    onSuccess: () => {
      utils.agendamentos.list.invalidate();
      toast.success("Status atualizado!");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const handleCreate = () => {
    createAgendamento.mutate({
      clienteId: form.selectedClienteId ?? undefined,
      veiculoId: form.selectedVeiculoId ?? undefined,
      mecanicoId: form.mecanicoId ? parseInt(form.mecanicoId) : undefined,
      data: dateStr,
      hora: form.hora,
      motivoVisita: form.motivoVisita || undefined,
      status: form.status as "Confirmado" | "Pendente" | "Cancelado" | "Concluído",
      observacoes: form.observacoes || undefined,
    });
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 3);
    return d;
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                {/* Client search */}
                <div>
                  <Label>Cliente</Label>
                  <Input
                    className="mt-1 border-border"
                    placeholder="Buscar cliente..."
                    value={form.clienteSearch}
                    onChange={(e) => setForm((p) => ({ ...p, clienteSearch: e.target.value, selectedClienteId: null }))}
                  />
                  {clienteResults && clienteResults.length > 0 && !form.selectedClienteId && (
                    <div className="border border-border rounded-lg mt-1 overflow-hidden">
                      {clienteResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b border-border last:border-0"
                          onClick={() => setForm((p) => ({ ...p, selectedClienteId: c.id, clienteSearch: c.nome }))}
                        >
                          {c.nome} · {c.telefone ?? "—"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vehicle */}
                {form.selectedClienteId && veiculosCliente && veiculosCliente.length > 0 && (
                  <div>
                    <Label>Veículo</Label>
                    <Select
                      value={form.selectedVeiculoId ? String(form.selectedVeiculoId) : ""}
                      onValueChange={(v) => setForm((p) => ({ ...p, selectedVeiculoId: parseInt(v) }))}
                    >
                      <SelectTrigger className="mt-1 border-border">
                        <SelectValue placeholder="Selecionar veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {veiculosCliente.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.placa} — {v.modelo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Mecânico</Label>
                    <Select value={form.mecanicoId} onValueChange={(v) => setForm((p) => ({ ...p, mecanicoId: v }))}>
                      <SelectTrigger className="mt-1 border-border">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {mecanicos?.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.emoji} {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      className="mt-1 border-border"
                      value={form.hora}
                      onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Motivo da Visita</Label>
                  <Input
                    className="mt-1 border-border"
                    placeholder="Revisão, diagnóstico, entrega..."
                    value={form.motivoVisita}
                    onChange={(e) => setForm((p) => ({ ...p, motivoVisita: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger className="mt-1 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Confirmado">Confirmado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleCreate} disabled={createAgendamento.isPending}>
                  {createAgendamento.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Criar Agendamento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Week navigation */}
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedDate((d) => addDays(d, -7))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {weekDays.map((d) => {
                  const isSelected = formatDate(d) === formatDate(selectedDate);
                  const isToday = formatDate(d) === formatDate(new Date());
                  return (
                    <button
                      key={formatDate(d)}
                      onClick={() => setSelectedDate(d)}
                      className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isToday
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      <span className="text-xs font-medium">
                        {d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                      </span>
                      <span className="text-sm font-bold">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedDate((d) => addDays(d, 7))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appointments */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !agendamentos || agendamentos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum agendamento para este dia</p>
            <Button variant="ghost" className="mt-3" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar agendamento
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {agendamentos.map(({ ag, cliente, veiculo, mecanico }) => (
              <Card key={ag.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Time */}
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-lg font-bold text-primary font-mono">
                        {String(ag.hora).slice(0, 5)}
                      </p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {veiculo && (
                          <div className="flex items-center gap-1">
                            <Car className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-mono font-bold text-foreground">{veiculo.placa}</span>
                            {veiculo.modelo && (
                              <span className="text-xs text-muted-foreground">{veiculo.modelo}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {cliente && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{cliente.nome}</span>
                        </div>
                      )}
                      {ag.motivoVisita && (
                        <p className="text-xs text-muted-foreground mt-1">{ag.motivoVisita}</p>
                      )}
                    </div>

                    {/* Mechanic */}
                    {mecanico && (
                      <div className="text-center shrink-0">
                        <p className="text-lg">{mecanico.emoji}</p>
                        <p className="text-xs text-muted-foreground">{mecanico.nome}</p>
                      </div>
                    )}

                    {/* Status + Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs ${STATUS_BADGE[ag.status ?? "Pendente"] ?? ""}`}>
                        {ag.status}
                      </Badge>
                      {ag.status !== "Concluído" && ag.status !== "Cancelado" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-400 hover:text-green-300"
                            onClick={() => updateStatus.mutate({ id: ag.id, status: "Concluído" })}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:text-red-300"
                            onClick={() => updateStatus.mutate({ id: ag.id, status: "Cancelado" })}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
