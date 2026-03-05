import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Save, Plus, Trash2, Phone, Car, User,
  DollarSign, FileText, Wrench, CheckCircle, XCircle,
  AlertTriangle, Clock, Loader2, Edit2, ClipboardCheck,
  ChevronDown, ChevronUp, Send, Copy, Crown, Award, Medal, Star, Printer, Camera
} from "lucide-react";
import OSAnexos from "@/components/OSAnexos";

// ─── Config ──────────────────────────────────────────────────────────────────
const prioridadeConfig: Record<string, { label: string; borderColor: string; bgColor: string }> = {
  verde:    { label: "Tranquilo", borderColor: "border-green-500",  bgColor: "bg-green-500/5"  },
  amarelo:  { label: "Médio",     borderColor: "border-yellow-500", bgColor: "bg-yellow-500/5" },
  vermelho: { label: "Imediato",  borderColor: "border-red-500",    bgColor: "bg-red-500/5"    },
};

const loyaltyConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  bronze:   { label: "Bronze",   color: "bg-amber-700/20 text-amber-700 border-amber-700/30",   icon: Medal  },
  prata:    { label: "Prata",    color: "bg-slate-400/20 text-slate-400 border-slate-400/30",   icon: Award  },
  ouro:     { label: "Ouro",     color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: Crown  },
  diamante: { label: "Diamante", color: "bg-cyan-500/20 text-cyan-500 border-cyan-500/30",      icon: Star   },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "Diagnóstico":          { label: "Diagnóstico",          color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Wrench       },
  "Orçamento":            { label: "Orçamento",            color: "bg-blue-500/10 text-blue-500 border-blue-500/20",       icon: FileText     },
  "Aguardando Aprovação": { label: "Aguardando Aprovação", color: "bg-amber-500/10 text-amber-500 border-amber-500/20",    icon: Clock        },
  "Aprovado":             { label: "Aprovado",             color: "bg-green-500/10 text-green-500 border-green-500/20",    icon: CheckCircle  },
  "Em Execução":          { label: "Em Execução",          color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Wrench       },
  "Aguardando Peça":      { label: "Aguardando Peça",      color: "bg-red-500/10 text-red-500 border-red-500/20",          icon: AlertTriangle },
  "Pronto":               { label: "Pronto",               color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle },
  "Entregue":             { label: "Entregue",             color: "bg-gray-500/10 text-gray-400 border-gray-500/20",       icon: CheckCircle  },
  "Cancelado":            { label: "Cancelado",            color: "bg-red-900/20 text-red-500 border-red-900/30",          icon: XCircle      },
};

const itemStatusConfig: Record<string, { label: string; color: string }> = {
  pendente:  { label: "Pendente",  color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  aprovado:  { label: "Aprovado",  color: "bg-green-500/10 text-green-500 border-green-500/20"   },
  recusado:  { label: "Recusado",  color: "bg-red-500/10 text-red-500 border-red-500/20"         },
};

const STATUSES = ["Diagnóstico", "Orçamento", "Aguardando Aprovação", "Aprovado", "Em Execução", "Aguardando Peça", "Pronto", "Entregue", "Cancelado"];

const fmt = (v: string | number | null | undefined) => {
  const n = parseFloat(String(v ?? 0));
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminOSDetalhes() {
  const params = useParams<{ id: string }>();
  const osId = Number(params.id);
  const [, setLocation] = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [editedOS, setEditedOS] = useState<Record<string, any>>({});
  const [showAddItem, setShowAddItem] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [servicosOpen, setServicosOpen] = useState(true);
  const [newObs, setNewObs] = useState("");

  const [newItem, setNewItem] = useState({
    descricao: "", tipo: "peca", quantidade: 1,
    valorCusto: 0, margemAplicada: 40, valorUnitario: 0,
    prioridade: "amarelo" as "verde" | "amarelo" | "vermelho",
  });

  const [checklist, setChecklist] = useState({
    nivelOleo: false, nivelAgua: false, freios: false,
    pneus: false, luzes: false, bateria: false,
  });

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: osData, refetch, isLoading } = trpc.os.get.useQuery({ id: osId }, { enabled: !!osId });
  const { data: mecanicos } = trpc.mecanicos.list.useQuery(undefined);
  const { data: colaboradores } = trpc.colaboradores.list.useQuery(undefined);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const updateOS = trpc.os.update.useMutation({
    onSuccess: () => { refetch(); setIsEditing(false); toast.success("OS atualizada!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.os.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const addItemFull = trpc.os.addItemFull.useMutation({
    onSuccess: () => { refetch(); setShowAddItem(false); resetNewItem(); toast.success("Item adicionado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteItem = trpc.os.deleteItem.useMutation({
    onSuccess: () => { refetch(); toast.success("Item removido!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateItemStatus = trpc.os.updateItemStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Item atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const addObservacao = trpc.os.addObservacao.useMutation({
    onSuccess: () => { refetch(); setNewObs(""); toast.success("Observação adicionada!"); },
    onError: (e) => toast.error(e.message),
  });

  const resetNewItem = () => setNewItem({
    descricao: "", tipo: "peca", quantidade: 1,
    valorCusto: 0, margemAplicada: 40, valorUnitario: 0,
    prioridade: "amarelo",
  });

  // ─── Loading / Not found ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }
  if (!osData?.os) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/os")} className="text-white hover:bg-white/10 mb-4">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <p className="text-white">OS não encontrada</p>
      </div>
    );
  }

  const { os, cliente, veiculo, mecanico, itens, historico } = osData as any;
  const currentStatus = statusConfig[os.status ?? "Diagnóstico"] ?? statusConfig["Diagnóstico"];
  const StatusIcon = currentStatus.icon;

  // Totals
  const totalOrcado   = (itens ?? []).reduce((a: number, i: any) => a + parseFloat(String(i.valorTotal ?? 0)), 0);
  const totalAprovado = (itens ?? []).filter((i: any) => i.status === "aprovado").reduce((a: number, i: any) => a + parseFloat(String(i.valorTotal ?? 0)), 0);
  const totalRecusado = (itens ?? []).filter((i: any) => i.status === "recusado").reduce((a: number, i: any) => a + parseFloat(String(i.valorTotal ?? 0)), 0);
  const totalPendente = (itens ?? []).filter((i: any) => !i.status || i.status === "pendente").reduce((a: number, i: any) => a + parseFloat(String(i.valorTotal ?? 0)), 0);

  const handleSave = () => {
    updateOS.mutate({ id: osId, ...editedOS });
  };

  const handleAddItem = () => {
    const valorTotal = newItem.quantidade * newItem.valorUnitario;
    addItemFull.mutate({
      ordemServicoId: osId,
      descricao: newItem.descricao,
      tipo: newItem.tipo,
      quantidade: newItem.quantidade,
      valorCusto: newItem.valorCusto,
      margemAplicada: newItem.margemAplicada,
      valorUnitario: newItem.valorUnitario,
      valorTotal,
      prioridade: newItem.prioridade,
      status: "pendente",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/os")} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-mono">{os.numeroOs}</h1>
                <Badge variant="outline" className={cn("gap-1", currentStatus.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {currentStatus.label}
                </Badge>
                {(() => {
                  const loyalty = loyaltyConfig[(os.prioridade ?? "bronze").toLowerCase()] ?? loyaltyConfig.bronze;
                  const LoyaltyIcon = loyalty.icon;
                  return (
                    <Badge variant="outline" className={cn("gap-1 text-xs", loyalty.color)}>
                      <LoyaltyIcon className="w-3 h-3" />
                      {loyalty.label}
                    </Badge>
                  );
                })()}
              </div>
              <p className="text-slate-400 text-sm">
                Entrada: {os.dataEntrada ? new Date(os.dataEntrada).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-white hover:bg-white/10"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/cliente/orcamento/${osId}`);
                toast.success("Link copiado!");
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Link Cliente
            </Button>
            {cliente?.telefone && (
              <Button
                variant="outline"
                size="sm"
                className="border-green-600 text-green-400 hover:bg-green-500/10"
                onClick={() => window.open(`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`, "_blank")}
              >
                <Phone className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              onClick={() => {
                const dataEntrada = os.dataEntrada ? new Date(os.dataEntrada).toLocaleDateString("pt-BR") : "—";
                const kmAtual = (veiculo?.kmAtual ?? 0).toLocaleString("pt-BR");
                const ultimaRevKm = veiculo?.ultimaRevisaoKm ? veiculo.ultimaRevisaoKm.toLocaleString("pt-BR") + " km" : "—";
                const ultimaRevData = veiculo?.ultimaRevisaoData ? new Date(veiculo.ultimaRevisaoData).toLocaleDateString("pt-BR") : "—";
                const win = window.open("", "_blank", "width=400,height=500");
                if (!win) return;
                win.document.write(`
                  <html><head><title>Etiqueta Para-brisa</title>
                  <style>
                    body { font-family: monospace; padding: 20px; background: #fff; color: #000; }
                    .box { border: 2px solid #000; padding: 16px; max-width: 320px; margin: 0 auto; }
                    h2 { text-align: center; margin: 0 0 12px; font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; }
                    .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
                    .label { font-weight: bold; }
                    .placa { text-align: center; font-size: 28px; font-weight: bold; border: 3px solid #000; padding: 8px; margin: 12px 0; letter-spacing: 4px; }
                    .footer { text-align: center; font-size: 11px; margin-top: 12px; color: #555; }
                    @media print { button { display: none; } }
                  </style></head><body>
                  <div class="box">
                    <h2>DOCTOR AUTO PRIME</h2>
                    <div class="placa">${veiculo?.placa ?? "—"}</div>
                    <div class="row"><span class="label">OS:</span><span>${os.numeroOs}</span></div>
                    <div class="row"><span class="label">Veículo:</span><span>${veiculo?.marca ?? ""} ${veiculo?.modelo ?? ""} ${veiculo?.ano ?? ""}</span></div>
                    <div class="row"><span class="label">Cliente:</span><span>${cliente?.nomeCompleto ?? "—"}</span></div>
                    <div class="row"><span class="label">Entrada:</span><span>${dataEntrada}</span></div>
                    <div class="row"><span class="label">KM Entrada:</span><span>${kmAtual} km</span></div>
                    <div class="row"><span class="label">Última Revisão:</span><span>${ultimaRevKm}</span></div>
                    <div class="row"><span class="label">Data Rev.:</span><span>${ultimaRevData}</span></div>
                    <div class="footer">Impresso em ${new Date().toLocaleDateString("pt-BR")}</div>
                  </div>
                  <br><button onclick="window.print()">🖨️ Imprimir</button>
                  </body></html>
                `);
                win.document.close();
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              Etiqueta
            </Button>
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="border-slate-700 text-white hover:bg-white/10">
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateOS.isPending} className="bg-red-600 hover:bg-red-700">
                  {updateOS.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Salvar</>}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(true); setEditedOS({}); }} className="border-slate-700 text-white hover:bg-white/10">
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* ─── Status Change ──────────────────────────────────────────── */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-slate-400 text-sm font-medium">Mover para:</span>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.filter(s => s !== os.status).map(s => {
                  const cfg = statusConfig[s];
                  const Icon = cfg?.icon ?? CheckCircle;
                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      className={cn("border-slate-700 text-xs hover:bg-white/10 text-white", cfg?.color)}
                      onClick={() => updateStatus.mutate({ id: osId, status: s })}
                      disabled={updateStatus.isPending}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {s}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Main Grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Veículo + Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-400" />Veículo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Placa</span><span className="font-mono font-bold text-blue-400">{veiculo?.placa ?? os.placa ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Modelo</span><span>{veiculo?.modelo ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Marca</span><span>{veiculo?.marca ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Ano</span><span>{veiculo?.ano ?? "—"}</span></div>
                  {isEditing ? (
                    <div>
                      <Label className="text-slate-400 text-xs">KM Atual</Label>
                      <Input
                        type="number"
                        defaultValue={os.km ?? 0}
                        onChange={e => setEditedOS(p => ({ ...p, km: parseInt(e.target.value) }))}
                        className="bg-slate-800 border-slate-700 text-white h-8 text-sm mt-1"
                      />
                    </div>
                  ) : (
                    <div className="flex justify-between"><span className="text-slate-400">KM</span><span>{os.km?.toLocaleString("pt-BR") ?? "—"}</span></div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-green-400" />Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Nome</span><span className="font-medium">{cliente?.nomeCompleto ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Telefone</span><span>{cliente?.telefone ?? "—"}</span></div>
                  {cliente?.id && (
                    <Button variant="link" className="p-0 h-auto text-xs text-red-400" onClick={() => setLocation(`/admin/clientes/${cliente.id}`)}>
                      Ver perfil completo →
                    </Button>
                  )}
                  {isEditing && (
                    <div>
                      <Label className="text-slate-400 text-xs">Consultor</Label>
                      <Select
                        defaultValue={String(os.colaboradorId ?? "")}
                        onValueChange={v => setEditedOS(p => ({ ...p, colaboradorId: parseInt(v, 10) || undefined }))}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-xs mt-1">
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {(colaboradores ?? []).map((c: any) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Diagnóstico / Serviço */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-400" />Diagnóstico & Serviço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs">Motivo</span>
                    <p className="text-white">{os.motivoVisita ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Tipo de Serviço</span>
                    <p className="text-white">{os.tipoServico ?? os.tipoServico1 ?? "—"}</p>
                  </div>
                </div>
                {isEditing ? (
                  <>
                    <div>
                      <Label className="text-slate-400 text-xs">Diagnóstico</Label>
                      <Textarea
                        defaultValue={os.diagnostico ?? ""}
                        onChange={e => setEditedOS(p => ({ ...p, diagnostico: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white text-sm mt-1 resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Mecânico</Label>
                      <Select
                        defaultValue={String(os.mecanicoId ?? "")}
                        onValueChange={v => setEditedOS(p => ({ ...p, mecanicoId: parseInt(v, 10) || undefined }))}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-xs mt-1">
                          <SelectValue placeholder="Selecionar mecânico" />
                        </SelectTrigger>
                        <SelectContent>
                          {(mecanicos ?? []).map((m: any) => (
                            <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : os.diagnostico ? (
                  <div className="p-3 bg-slate-800/50 rounded-lg text-sm text-slate-300">
                    {os.diagnostico}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Checklist */}
            <Collapsible open={checklistOpen} onOpenChange={setChecklistOpen}>
              <Card className="bg-slate-900/50 border-slate-800">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-white/5 rounded-t-lg transition-colors">
                    <CardTitle className="text-white text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-cyan-400" />
                        Checklist de Entrada
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                          {Object.values(checklist).filter(Boolean).length}/{Object.keys(checklist).length}
                        </Badge>
                      </div>
                      {checklistOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      {(Object.entries(checklist) as [string, boolean][]).map(([key, checked]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={key}
                            checked={checked}
                            onCheckedChange={v => setChecklist(p => ({ ...p, [key]: !!v }))}
                          />
                          <label htmlFor={key} className="text-sm text-slate-300 capitalize cursor-pointer">
                            {key === "nivelOleo" ? "Nível de Óleo" :
                             key === "nivelAgua" ? "Nível de Água" :
                             key === "freios" ? "Freios" :
                             key === "pneus" ? "Pneus" :
                             key === "luzes" ? "Luzes" :
                             key === "bateria" ? "Bateria" : key}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Itens / Orçamento */}
            <Collapsible open={servicosOpen} onOpenChange={setServicosOpen}>
              <Card className="bg-slate-900/50 border-slate-800">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-white/5 rounded-t-lg transition-colors">
                    <CardTitle className="text-white text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-400" />
                        Itens do Orçamento
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                          {(itens ?? []).length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={e => { e.stopPropagation(); setShowAddItem(true); }}
                          className="h-7 text-xs bg-red-600 hover:bg-red-700"
                        >
                          <Plus className="w-3 h-3 mr-1" />Adicionar
                        </Button>
                        {servicosOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-3">
                    {(itens ?? []).length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-6">Nenhum item adicionado ainda</p>
                    ) : (itens ?? []).map((item: any) => {
                      const prio = prioridadeConfig[item.prioridade ?? "amarelo"] ?? prioridadeConfig.amarelo;
                      const iStatus = itemStatusConfig[item.status ?? "pendente"] ?? itemStatusConfig.pendente;
                      return (
                        <div
                          key={item.id}
                          className={cn("p-4 rounded-lg border-2 transition-all", prio.borderColor, prio.bgColor)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className={cn("text-xs",
                                  item.prioridade === "vermelho" && "border-red-500 text-red-400",
                                  item.prioridade === "amarelo"  && "border-yellow-500 text-yellow-400",
                                  item.prioridade === "verde"    && "border-green-500 text-green-400",
                                )}>
                                  {prio.label}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {item.tipo === "peca" ? "Peça" : "Mão de Obra"}
                                </Badge>
                                <Badge variant="outline" className={cn("text-xs", iStatus.color)}>
                                  {iStatus.label}
                                </Badge>
                              </div>
                              <p className="font-medium text-white">{item.descricao}</p>
                              {item.motivoRecusa && (
                                <p className="text-xs text-red-400 mt-1">Motivo recusa: {item.motivoRecusa}</p>
                              )}
                              <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                <span>{item.quantidade}x {fmt(item.valorUnitario)}</span>
                                {item.valorCusto && parseFloat(String(item.valorCusto)) > 0 && (
                                  <span className="text-slate-500">Custo: {fmt(item.valorCusto)} | Margem: {item.margemAplicada}%</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-bold text-white">{fmt(item.valorTotal)}</p>
                              <div className="flex gap-1 mt-2 justify-end">
                                {(!item.status || item.status === "pendente") && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-green-500 hover:bg-green-500/10"
                                      onClick={() => updateItemStatus.mutate({ id: item.id, status: "aprovado" })}
                                      disabled={updateItemStatus.isPending}
                                      title="Aprovar"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10"
                                      onClick={() => updateItemStatus.mutate({ id: item.id, status: "recusado" })}
                                      disabled={updateItemStatus.isPending}
                                      title="Recusar"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                {item.status === "aprovado" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-yellow-500 hover:bg-yellow-500/10"
                                    onClick={() => updateItemStatus.mutate({ id: item.id, status: "pendente" })}
                                    disabled={updateItemStatus.isPending}
                                    title="Voltar para pendente"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                                  onClick={() => deleteItem.mutate({ id: item.id })}
                                  disabled={deleteItem.isPending}
                                  title="Remover"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Fotos & Vídeos */}
            <Collapsible defaultOpen>
              <Card className="bg-slate-900/50 border-slate-800">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-slate-800/30 rounded-t-lg transition-colors">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Camera className="h-4 w-4 text-orange-400" />Fotos & Vídeos do Veículo
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <OSAnexos ordemServicoId={osId} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Observações + Histórico */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-400" />Observações & Histórico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    value={newObs}
                    onChange={e => setNewObs(e.target.value)}
                    placeholder="Adicionar observação..."
                    className="bg-slate-800 border-slate-700 text-white text-sm resize-none"
                    rows={2}
                  />
                  <Button
                    size="sm"
                    onClick={() => { if (newObs.trim()) addObservacao.mutate({ id: osId, observacao: newObs }); }}
                    disabled={!newObs.trim() || addObservacao.isPending}
                    className="bg-red-600 hover:bg-red-700 self-end"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {(historico ?? []).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-2">Sem histórico</p>
                ) : (historico ?? []).map((h: any, i: number) => (
                  <div key={h.id ?? i} className="p-3 bg-slate-800/50 rounded-lg text-sm border-l-2 border-slate-700">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span className="font-medium text-slate-400">{h.statusNovo ?? h.acao ?? "Atualização"}</span>
                      <span>{h.dataAlteracao ? new Date(h.dataAlteracao).toLocaleString("pt-BR") : "—"}</span>
                    </div>
                    {h.observacao && <p className="text-slate-300">{h.observacao}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1/3) */}
          <div className="space-y-4">

            {/* Resumo Financeiro */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Orçado</span>
                  <span className="text-white">{fmt(totalOrcado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">⏳ Pendente</span>
                  <span className="text-yellow-400">{fmt(totalPendente)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">✓ Aprovado</span>
                  <span className="text-green-400 font-bold">{fmt(totalAprovado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">✗ Recusado</span>
                  <span className="text-red-400">{fmt(totalRecusado)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between">
                  <span className="text-slate-300 font-medium">Total OS</span>
                  <span className="text-white font-bold text-lg">{fmt(os.valorTotalOs ?? totalAprovado)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Mecânico */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-400" />Mecânico Responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="text-white font-medium">{mecanico?.nome ?? "Não atribuído"}</p>
                {mecanico && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Especialidade</span>
                      <span className="text-white">{mecanico.especialidade ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nível</span>
                      <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400">
                        {mecanico.grauConhecimento ?? "—"}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tempo no Pátio */}
            {os.dataEntrada && (
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-amber-400 text-xs">Tempo no Pátio</p>
                    <p className="text-white font-bold text-lg">
                      {(() => {
                        const ms = Date.now() - new Date(os.dataEntrada).getTime();
                        const h = Math.floor(ms / 3600000);
                        const d = Math.floor(h / 24);
                        return d > 0 ? `${d}d ${h % 24}h` : `${h}h`;
                      })()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ações Rápidas */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-700 text-white hover:bg-white/10 justify-start"
                  onClick={() => setLocation(`/admin/patio`)}
                >
                  <Car className="w-4 h-4 mr-2" />
                  Ver no Pátio Kanban
                </Button>
                {cliente?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-slate-700 text-white hover:bg-white/10 justify-start"
                    onClick={() => setLocation(`/admin/clientes/${cliente.id}`)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Perfil do Cliente
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-700 text-white hover:bg-white/10 justify-start"
                  onClick={() => setLocation(`/admin/os`)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Lista de OS
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ─── Add Item Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Adicionar Item ao Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Descrição *</Label>
              <Input
                value={newItem.descricao}
                onChange={e => setNewItem(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Ex: Troca de pastilhas de freio dianteiras"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Tipo</Label>
                <Select value={newItem.tipo} onValueChange={v => setNewItem(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peca">Peça</SelectItem>
                    <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Prioridade</Label>
                <Select value={newItem.prioridade} onValueChange={v => setNewItem(p => ({ ...p, prioridade: v as any }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verde">🟢 Tranquilo</SelectItem>
                    <SelectItem value="amarelo">🟡 Médio</SelectItem>
                    <SelectItem value="vermelho">🔴 Imediato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-300">Qtd</Label>
                <Input
                  type="number"
                  min={1}
                  value={newItem.quantidade}
                  onChange={e => setNewItem(p => ({ ...p, quantidade: parseInt(e.target.value) || 1 }))}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Custo (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newItem.valorCusto}
                  onChange={e => {
                    const custo = parseFloat(e.target.value) || 0;
                    const venda = custo * (1 + newItem.margemAplicada / 100);
                    setNewItem(p => ({ ...p, valorCusto: custo, valorUnitario: parseFloat(venda.toFixed(2)) }));
                  }}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Margem %</Label>
                <Input
                  type="number"
                  min={0}
                  max={500}
                  value={newItem.margemAplicada}
                  onChange={e => {
                    const margem = parseFloat(e.target.value) || 0;
                    const venda = newItem.valorCusto * (1 + margem / 100);
                    setNewItem(p => ({ ...p, margemAplicada: margem, valorUnitario: parseFloat(venda.toFixed(2)) }));
                  }}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Valor de Venda Unitário (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={newItem.valorUnitario}
                onChange={e => setNewItem(p => ({ ...p, valorUnitario: parseFloat(e.target.value) || 0 }))}
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg flex justify-between items-center">
              <span className="text-slate-400 text-sm">Total do Item:</span>
              <span className="text-white font-bold text-lg">{fmt(newItem.quantidade * newItem.valorUnitario)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)} className="border-slate-700 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!newItem.descricao.trim() || addItemFull.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {addItemFull.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
