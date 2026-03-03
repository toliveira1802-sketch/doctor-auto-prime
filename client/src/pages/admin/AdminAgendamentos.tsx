import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Calendar, Clock, Car, User, Wrench } from "lucide-react";

const HOURS = Array.from({ length: 11 }, (_, i) => `${(8 + i).toString().padStart(2, "0")}:00`);

export default function AdminAgendamentos() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clienteId: "", veiculoId: "", colaboradorId: "", mecanicoId: "",
    dataAgendamento: today, horaAgendamento: "09:00", motivoVisita: "", tipoServico: "",
  });
  const [clienteSearch, setClienteSearch] = useState("");

  const { data: agendamentos, refetch } = trpc.agendamentos.list.useQuery({ data: selectedDate });
  const { data: clientes } = trpc.clientes.list.useQuery({ search: clienteSearch || undefined, limit: 10 });
  const { data: veiculos } = trpc.veiculos.list.useQuery({ clienteId: form.clienteId ? Number(form.clienteId) : undefined });
  const { data: colaboradores } = trpc.colaboradores.list.useQuery(undefined);
  const { data: mecanicos } = trpc.mecanicos.list.useQuery(undefined);

  const createAgendamento = trpc.agendamentos.create.useMutation({
    onSuccess: () => { refetch(); setOpen(false); toast.success("Agendamento criado!"); setForm({ ...form, clienteId: "", veiculoId: "", motivoVisita: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const agList = (agendamentos ?? []) as any[];

  const getByHour = (hour: string) => agList.filter((a: any) => (a.horaAgendamento ?? "").startsWith(hour.split(":")[0]));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground text-sm">{agList.length} agendamentos em {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Novo Agendamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label>Buscar Cliente</Label>
                    <Input placeholder="Nome, CPF ou telefone..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />
                    {(clientes as any[])?.length > 0 && clienteSearch && (
                      <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                        {(clientes as any[]).map((c: any) => (
                          <div key={c.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                            onClick={() => { setForm(f => ({ ...f, clienteId: String(c.id) })); setClienteSearch(c.nomeCompleto); }}>
                            {c.nomeCompleto} · {c.telefone}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Veículo</Label>
                    <Select value={form.veiculoId} onValueChange={v => setForm(f => ({ ...f, veiculoId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {(veiculos as any[])?.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.placa} · {v.modelo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Consultor</Label>
                    <Select value={form.colaboradorId} onValueChange={v => setForm(f => ({ ...f, colaboradorId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {(colaboradores as any[])?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Data</Label>
                    <Input type="date" value={form.dataAgendamento} onChange={e => setForm(f => ({ ...f, dataAgendamento: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Hora</Label>
                    <Select value={form.horaAgendamento} onValueChange={v => setForm(f => ({ ...f, horaAgendamento: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Motivo da Visita</Label>
                    <Input placeholder="Ex: Revisão, Diagnóstico, Troca de óleo..." value={form.motivoVisita} onChange={e => setForm(f => ({ ...f, motivoVisita: e.target.value }))} />
                  </div>
                </div>
                <Button className="w-full" disabled={!form.clienteId || !form.dataAgendamento || createAgendamento.isPending}
                  onClick={() => createAgendamento.mutate({
                    clienteId: Number(form.clienteId),
                    veiculoId: form.veiculoId ? Number(form.veiculoId) : undefined,
                    colaboradorId: form.colaboradorId ? Number(form.colaboradorId) : undefined,
                    dataAgendamento: form.dataAgendamento,
                    horaAgendamento: form.horaAgendamento,
                    motivoVisita: form.motivoVisita,
                  })}>
                  {createAgendamento.isPending ? "Salvando..." : "Confirmar Agendamento"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Timeline View */}
      <div className="grid grid-cols-1 gap-2">
        {HOURS.map(hour => {
          const items = getByHour(hour);
          return (
            <div key={hour} className="flex gap-3">
              <div className="w-16 flex-shrink-0 text-right">
                <span className="text-sm font-mono text-muted-foreground">{hour}</span>
              </div>
              <div className={`flex-1 min-h-[52px] rounded-lg border ${items.length > 0 ? "border-primary/30 bg-primary/5" : "border-border/30 bg-muted/10"} p-2`}>
                {items.length === 0 ? (
                  <div className="text-xs text-muted-foreground/50 flex items-center h-full">Disponível</div>
                ) : (
                  <div className="space-y-1">
                    {items.map((ag: any) => (
                      <div key={ag.id} className="flex items-center gap-3 bg-card rounded-md px-3 py-2 border border-border/50">
                        <Clock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{ag.clienteNome ?? "—"}</span>
                            {ag.veiculoPlaca && <span className="font-mono text-xs text-primary">{ag.veiculoPlaca}</span>}
                          </div>
                          {ag.motivoVisita && <div className="text-xs text-muted-foreground truncate">{ag.motivoVisita}</div>}
                        </div>
                        <Badge variant="outline" className="text-xs">{ag.status ?? "Confirmado"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
