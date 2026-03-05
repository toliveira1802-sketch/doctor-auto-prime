import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, User, Car, Wrench, ClipboardList,
  Search, Plus, Phone, Mail, AlertCircle, CheckCircle2, Tag
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Cliente", icon: User },
  { id: 2, label: "Veículo", icon: Car },
  { id: 3, label: "Serviço", icon: Wrench },
  { id: 4, label: "Confirmação", icon: ClipboardList },
];

// Campanhas/Origens para rastreamento de campanha
const CAMPANHAS = [
  "Instagram — Orgânico",
  "Instagram — Pago",
  "Google — Orgânico",
  "Google — Pago",
  "Indicação de Cliente",
  "WhatsApp",
  "Kommo / CRM",
  "Retorno Espontâneo",
  "Passante / Fachada",
  "Promoção Revisão VW",
  "Promoção Remap Stage 1",
  "Promoção Freios",
  "Evento / Feira",
  "Outro",
];

const TIPOS_SERVICO = ["Rápido", "Médio", "Demorado", "Projeto"];

// CPF validation
function validarCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(c[10]);
}

function formatCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    .replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3")
    .replace(/(\d{3})(\d{3})/, "$1.$2")
    .replace(/(\d{3})/, "$1");
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AdminNovaOS() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  // ── CLIENTE ──────────────────────────────────────────────────────────────
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [novoCliente, setNovoCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({
    nomeCompleto: "", cpf: "", email: "", telefone: "",
    dataNascimento: "", endereco: "", cep: "", cidade: "", estado: "SP",
    origemCadastro: "",
  });
  const [clienteErrors, setClienteErrors] = useState<Record<string, string>>({});

  // ── VEÍCULO ──────────────────────────────────────────────────────────────
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<any>(null);
  const [novoVeiculo, setNovoVeiculo] = useState(false);
  const [veiculoForm, setVeiculoForm] = useState({
    placa: "", marca: "", modelo: "", versao: "", cor: "",
    ano: new Date().getFullYear(), combustivel: "Gasolina",
    kmAtual: "" as string | number,
    ultimaRevisaoKm: "" as string | number,
    ultimaRevisaoData: "",
    origemContato: "",
  });
  const [veiculoErrors, setVeiculoErrors] = useState<Record<string, string>>({});

  // ── OS ────────────────────────────────────────────────────────────────────
  const [osForm, setOsForm] = useState({
    motivoVisita: "", tipoServico: "", colaboradorId: "",
    mecanicoId: "", recursoId: "", observacoes: "",
    primeiraVez: false, veioDePromocao: false, campanha: "",
  });

  // ── QUERIES ───────────────────────────────────────────────────────────────
  const { data: clientes } = trpc.clientes.list.useQuery(
    { search: clienteSearch, limit: 10 },
    { enabled: clienteSearch.length >= 2 }
  );
  const { data: veiculos } = trpc.veiculos.list.useQuery(
    { clienteId: clienteSelecionado?.id ?? 0 },
    { enabled: !!clienteSelecionado?.id }
  );
  const { data: colaboradores } = trpc.colaboradores.list.useQuery(undefined);
  const { data: mecanicos } = trpc.mecanicos.list.useQuery(undefined);
  const { data: recursos } = trpc.recursos.list.useQuery();
  const utils = trpc.useUtils();

  // ── MUTATIONS ─────────────────────────────────────────────────────────────
  const criarCliente = trpc.clientes.create.useMutation({
    onSuccess: (data) => { setClienteSelecionado(data); setNovoCliente(false); toast.success("Cliente cadastrado!"); },
    onError: (e) => toast.error(e.message),
  });

  const criarVeiculo = trpc.veiculos.create.useMutation({
    onSuccess: (data) => {
      setVeiculoSelecionado(data); setNovoVeiculo(false);
      utils.veiculos.list.invalidate();
      toast.success("Veículo cadastrado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const criarOS = trpc.os.create.useMutation({
    onSuccess: (data) => {
      toast.success(`OS ${data.numeroOs} aberta com sucesso!`);
      navigate(`/admin/os/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── VALIDAÇÕES ────────────────────────────────────────────────────────────
  const canStep2 = !!clienteSelecionado;
  const canStep3 = !!veiculoSelecionado;
  const canStep4 = osForm.motivoVisita.trim().length >= 5 && osForm.colaboradorId !== "" && osForm.mecanicoId !== "" && osForm.recursoId !== "";

  const validateCliente = (): boolean => {
    const errs: Record<string, string> = {};
    if (!clienteForm.nomeCompleto.trim()) errs.nomeCompleto = "Nome completo é obrigatório";
    if (!clienteForm.telefone.trim()) errs.telefone = "Telefone é obrigatório";
    if (!clienteForm.cpf.trim()) {
      errs.cpf = "CPF é obrigatório";
    } else if (!validarCPF(clienteForm.cpf)) {
      errs.cpf = "CPF inválido";
    }
    if (!clienteForm.email.trim()) {
      errs.email = "E-mail é obrigatório";
    } else if (!validarEmail(clienteForm.email)) {
      errs.email = "E-mail inválido";
    }
    if (!clienteForm.origemCadastro) errs.origemCadastro = "Origem/Campanha é obrigatória para o CRM";
    setClienteErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateVeiculo = (): boolean => {
    const errs: Record<string, string> = {};
    if (!veiculoForm.placa.trim()) errs.placa = "Placa é obrigatória";
    if (!veiculoForm.marca.trim()) errs.marca = "Marca é obrigatória";
    if (!veiculoForm.modelo.trim()) errs.modelo = "Modelo é obrigatório";
    if (!veiculoForm.kmAtual || Number(veiculoForm.kmAtual) <= 0) {
      errs.kmAtual = "Quilometragem atual é obrigatória";
    }
    if (!veiculoForm.origemContato) errs.origemContato = "Origem do contato é obrigatória para o CRM";
    setVeiculoErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSalvarCliente = () => {
    if (!validateCliente()) return;
    criarCliente.mutate({ ...clienteForm, empresaId: 1 });
  };

  const handleSalvarVeiculo = () => {
    if (!validateVeiculo()) return;
    criarVeiculo.mutate({
      ...veiculoForm,
      kmAtual: Number(veiculoForm.kmAtual) || 0,
      ultimaRevisaoKm: veiculoForm.ultimaRevisaoKm ? Number(veiculoForm.ultimaRevisaoKm) : undefined,
      ultimaRevisaoData: veiculoForm.ultimaRevisaoData || undefined,
      clienteId: clienteSelecionado.id,
    });
  };

  const handleCriarOS = () => {
    criarOS.mutate({
      clienteId: clienteSelecionado.id,
      veiculoId: veiculoSelecionado.id,
      placa: veiculoSelecionado.placa,
      km: veiculoSelecionado.kmAtual || Number(veiculoForm.kmAtual) || 0,
      motivoVisita: osForm.motivoVisita,
      tipoServico1: osForm.tipoServico,
      colaboradorId: parseInt(osForm.colaboradorId),
      mecanicoId: parseInt(osForm.mecanicoId),
      recursoId: parseInt(osForm.recursoId),
      observacoes: osForm.observacoes,
      primeiraVez: osForm.primeiraVez,
      veioDePromocao: osForm.veioDePromocao || !!osForm.campanha,
    });
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/ordens-servico")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Ordem de Serviço</h1>
          <p className="text-sm text-muted-foreground">Preencha todos os dados para abrir a OS</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${done ? "bg-green-500 border-green-500 text-white" : active ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"}`}>
                  {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`text-xs font-medium ${active ? "text-primary" : done ? "text-green-500" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-16 h-0.5 mx-2 mb-4 ${step > s.id ? "bg-green-500" : "bg-muted-foreground/20"}`} />}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: CLIENTE ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Identificar Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!novoCliente && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome, CPF ou telefone..." className="pl-10" value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />
                </div>
              )}
              {!novoCliente && clientes && clientes.length > 0 && !clienteSelecionado && (
                <div className="border rounded-lg divide-y">
                  {(clientes as any[]).map((c: any) => (
                    <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors" onClick={() => { setClienteSelecionado(c); setClienteSearch(""); }}>
                      <div className="font-medium">{c.nomeCompleto}</div>
                      <div className="text-sm text-muted-foreground">{c.cpf} · {c.telefone}</div>
                    </button>
                  ))}
                </div>
              )}
              {clienteSelecionado && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-semibold">{clienteSelecionado.nomeCompleto}</div>
                      <div className="text-sm text-muted-foreground flex gap-3">
                        {clienteSelecionado.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{clienteSelecionado.telefone}</span>}
                        {clienteSelecionado.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{clienteSelecionado.email}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setClienteSelecionado(null)}>Trocar</Button>
                </div>
              )}

              {novoCliente && (
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Campos marcados com * são obrigatórios para o CRM
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Nome */}
                    <div className="col-span-2">
                      <Label>Nome Completo *</Label>
                      <Input value={clienteForm.nomeCompleto} onChange={e => setClienteForm(p => ({...p, nomeCompleto: e.target.value}))} placeholder="Nome completo" className={clienteErrors.nomeCompleto ? "border-red-500" : ""} />
                      {clienteErrors.nomeCompleto && <p className="text-xs text-red-500 mt-1">{clienteErrors.nomeCompleto}</p>}
                    </div>
                    {/* Telefone */}
                    <div>
                      <Label>Telefone / WhatsApp *</Label>
                      <Input value={clienteForm.telefone} onChange={e => setClienteForm(p => ({...p, telefone: e.target.value}))} placeholder="(11) 99999-9999" className={clienteErrors.telefone ? "border-red-500" : ""} />
                      {clienteErrors.telefone && <p className="text-xs text-red-500 mt-1">{clienteErrors.telefone}</p>}
                    </div>
                    {/* CPF — OBRIGATÓRIO */}
                    <div>
                      <Label>CPF *</Label>
                      <Input
                        value={clienteForm.cpf}
                        onChange={e => setClienteForm(p => ({...p, cpf: formatCPF(e.target.value)}))}
                        placeholder="000.000.000-00"
                        className={`font-mono ${clienteErrors.cpf ? "border-red-500" : ""}`}
                        maxLength={14}
                      />
                      {clienteErrors.cpf && <p className="text-xs text-red-500 mt-1">{clienteErrors.cpf}</p>}
                    </div>
                    {/* E-mail — OBRIGATÓRIO */}
                    <div>
                      <Label>E-mail *</Label>
                      <Input
                        type="email"
                        value={clienteForm.email}
                        onChange={e => setClienteForm(p => ({...p, email: e.target.value}))}
                        placeholder="email@exemplo.com"
                        className={clienteErrors.email ? "border-red-500" : ""}
                      />
                      {clienteErrors.email && <p className="text-xs text-red-500 mt-1">{clienteErrors.email}</p>}
                    </div>
                    {/* Data de Nascimento */}
                    <div>
                      <Label>Data de Nascimento</Label>
                      <Input type="date" value={clienteForm.dataNascimento} onChange={e => setClienteForm(p => ({...p, dataNascimento: e.target.value}))} />
                    </div>
                    {/* Endereço */}
                    <div className="col-span-2">
                      <Label>Endereço</Label>
                      <Input value={clienteForm.endereco} onChange={e => setClienteForm(p => ({...p, endereco: e.target.value}))} placeholder="Rua, número, bairro" />
                    </div>
                    <div>
                      <Label>CEP</Label>
                      <Input value={clienteForm.cep} onChange={e => setClienteForm(p => ({...p, cep: e.target.value}))} placeholder="00000-000" />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input value={clienteForm.cidade} onChange={e => setClienteForm(p => ({...p, cidade: e.target.value}))} placeholder="São Paulo" />
                    </div>
                    {/* Origem / Campanha — OBRIGATÓRIO + RASTREAMENTO */}
                    <div className="col-span-2">
                      <Label className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-amber-500" />
                        Origem / Campanha * <span className="text-amber-500 text-xs font-normal">(rastreamento CRM — por qual campanha o cliente chegou?)</span>
                      </Label>
                      <Select value={clienteForm.origemCadastro} onValueChange={v => setClienteForm(p => ({...p, origemCadastro: v}))}>
                        <SelectTrigger className={clienteErrors.origemCadastro ? "border-red-500" : ""}>
                          <SelectValue placeholder="Selecionar campanha/origem..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CAMPANHAS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {clienteErrors.origemCadastro && <p className="text-xs text-red-500 mt-1">{clienteErrors.origemCadastro}</p>}
                      {clienteForm.origemCadastro && (
                        <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Rastreado: <strong>{clienteForm.origemCadastro}</strong> — verifique se o benefício da campanha foi aplicado
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSalvarCliente} disabled={criarCliente.isPending}>
                      {criarCliente.isPending ? "Salvando..." : "Salvar Cliente"}
                    </Button>
                    <Button variant="outline" onClick={() => { setNovoCliente(false); setClienteErrors({}); }}>Cancelar</Button>
                  </div>
                </div>
              )}

              {!novoCliente && !clienteSelecionado && (
                <Button variant="outline" className="w-full" onClick={() => setNovoCliente(true)}>
                  <Plus className="h-4 w-4 mr-2" />Cadastrar Novo Cliente
                </Button>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!canStep2}>
              Próximo: Veículo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: VEÍCULO ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />Selecionar Veículo
                <Badge variant="outline" className="ml-auto">{clienteSelecionado?.nomeCompleto}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!novoVeiculo && veiculos && (veiculos as any[]).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Veículos do cliente</Label>
                  {(veiculos as any[]).map((v: any) => (
                    <button key={v.id} className={`w-full text-left border rounded-lg p-3 transition-all ${veiculoSelecionado?.id === v.id ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`} onClick={() => setVeiculoSelecionado(v)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold font-mono">{v.placa}</div>
                          <div className="text-sm text-muted-foreground">{v.marca} {v.modelo} {v.ano} · {(v.kmAtual || 0).toLocaleString("pt-BR")} km</div>
                          {v.ultimaRevisaoKm && (
                            <div className="text-xs text-amber-400 mt-0.5">
                              Última revisão: {v.ultimaRevisaoKm.toLocaleString("pt-BR")} km
                              {v.ultimaRevisaoData ? ` · ${new Date(v.ultimaRevisaoData).toLocaleDateString("pt-BR")}` : ""}
                            </div>
                          )}
                        </div>
                        {veiculoSelecionado?.id === v.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {novoVeiculo && (
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Campos marcados com * são obrigatórios
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Placa */}
                    <div>
                      <Label>Placa *</Label>
                      <Input
                        value={veiculoForm.placa}
                        onChange={e => setVeiculoForm(p => ({...p, placa: e.target.value.toUpperCase()}))}
                        placeholder="ABC1D23"
                        className={`font-mono uppercase ${veiculoErrors.placa ? "border-red-500" : ""}`}
                      />
                      {veiculoErrors.placa && <p className="text-xs text-red-500 mt-1">{veiculoErrors.placa}</p>}
                    </div>
                    {/* KM Atual — OBRIGATÓRIO */}
                    <div>
                      <Label>KM Atual * <span className="text-amber-500 text-xs font-normal">(obrigatório)</span></Label>
                      <Input
                        type="number"
                        value={veiculoForm.kmAtual}
                        onChange={e => setVeiculoForm(p => ({...p, kmAtual: e.target.value}))}
                        placeholder="Ex: 85000"
                        className={veiculoErrors.kmAtual ? "border-red-500" : ""}
                        min={0}
                      />
                      {veiculoErrors.kmAtual && <p className="text-xs text-red-500 mt-1">{veiculoErrors.kmAtual}</p>}
                    </div>
                    {/* Marca */}
                    <div>
                      <Label>Marca *</Label>
                      <Input value={veiculoForm.marca} onChange={e => setVeiculoForm(p => ({...p, marca: e.target.value}))} placeholder="VW, BMW, Audi..." className={veiculoErrors.marca ? "border-red-500" : ""} />
                      {veiculoErrors.marca && <p className="text-xs text-red-500 mt-1">{veiculoErrors.marca}</p>}
                    </div>
                    {/* Modelo */}
                    <div>
                      <Label>Modelo *</Label>
                      <Input value={veiculoForm.modelo} onChange={e => setVeiculoForm(p => ({...p, modelo: e.target.value}))} placeholder="Golf, Série 3..." className={veiculoErrors.modelo ? "border-red-500" : ""} />
                      {veiculoErrors.modelo && <p className="text-xs text-red-500 mt-1">{veiculoErrors.modelo}</p>}
                    </div>
                    {/* Versão */}
                    <div>
                      <Label>Versão</Label>
                      <Input value={veiculoForm.versao} onChange={e => setVeiculoForm(p => ({...p, versao: e.target.value}))} placeholder="GTI, 320i..." />
                    </div>
                    {/* Ano */}
                    <div>
                      <Label>Ano</Label>
                      <Input type="number" value={veiculoForm.ano} onChange={e => setVeiculoForm(p => ({...p, ano: parseInt(e.target.value) || 2024}))} min={1990} max={2030} />
                    </div>
                    {/* Cor */}
                    <div>
                      <Label>Cor</Label>
                      <Input value={veiculoForm.cor} onChange={e => setVeiculoForm(p => ({...p, cor: e.target.value}))} placeholder="Preto, Branco, Prata..." />
                    </div>
                    {/* Combustível */}
                    <div>
                      <Label>Combustível</Label>
                      <Select value={veiculoForm.combustivel} onValueChange={v => setVeiculoForm(p => ({...p, combustivel: v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["Gasolina", "Flex", "Diesel", "Elétrico", "Híbrido"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    {/* ── ÚLTIMA REVISÃO ── */}
                    <div className="col-span-2">
                      <Separator className="my-2" />
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Última Revisão <span className="text-amber-400">(aparece na etiqueta do para-brisa)</span></p>
                    </div>
                    <div>
                      <Label>KM da Última Revisão</Label>
                      <Input
                        type="number"
                        value={veiculoForm.ultimaRevisaoKm}
                        onChange={e => setVeiculoForm(p => ({...p, ultimaRevisaoKm: e.target.value}))}
                        placeholder="Ex: 80000"
                        min={0}
                      />
                    </div>
                    <div>
                      <Label>Data da Última Revisão</Label>
                      <Input
                        type="date"
                        value={veiculoForm.ultimaRevisaoData}
                        onChange={e => setVeiculoForm(p => ({...p, ultimaRevisaoData: e.target.value}))}
                      />
                    </div>

                    {/* Origem Contato */}
                    <div className="col-span-2">
                      <Separator className="my-2" />
                      <Label className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-amber-500" />
                        Como nos encontrou? * <span className="text-amber-500 text-xs font-normal">(rastreamento CRM)</span>
                      </Label>
                      <Select value={veiculoForm.origemContato} onValueChange={v => setVeiculoForm(p => ({...p, origemContato: v}))}>
                        <SelectTrigger className={veiculoErrors.origemContato ? "border-red-500" : ""}>
                          <SelectValue placeholder="Selecionar campanha/origem..." />
                        </SelectTrigger>
                        <SelectContent>{CAMPANHAS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                      {veiculoErrors.origemContato && <p className="text-xs text-red-500 mt-1">{veiculoErrors.origemContato}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSalvarVeiculo} disabled={criarVeiculo.isPending}>
                      {criarVeiculo.isPending ? "Salvando..." : "Salvar Veículo"}
                    </Button>
                    <Button variant="outline" onClick={() => { setNovoVeiculo(false); setVeiculoErrors({}); }}>Cancelar</Button>
                  </div>
                </div>
              )}

              {!novoVeiculo && (
                <Button variant="outline" className="w-full" onClick={() => setNovoVeiculo(true)}>
                  <Plus className="h-4 w-4 mr-2" />Cadastrar Novo Veículo
                </Button>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
            <Button onClick={() => setStep(3)} disabled={!canStep3}>Próximo: Serviço <ArrowRight className="h-4 w-4 ml-2" /></Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SERVIÇO ─────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />Dados do Serviço</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Motivo da Visita / Queixa do Cliente *</Label>
                <Textarea value={osForm.motivoVisita} onChange={e => setOsForm(p => ({...p, motivoVisita: e.target.value}))} placeholder="Descreva o que o cliente relatou, barulhos, falhas, solicitações..." rows={3} />
                {osForm.motivoVisita.length > 0 && osForm.motivoVisita.length < 5 && <p className="text-xs text-red-500 mt-1">Mínimo de 5 caracteres</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Serviço</Label>
                  <Select value={osForm.tipoServico} onValueChange={v => setOsForm(p => ({...p, tipoServico: v}))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>{TIPOS_SERVICO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Consultor Responsável *</Label>
                  <Select value={osForm.colaboradorId} onValueChange={v => setOsForm(p => ({...p, colaboradorId: v}))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>{(colaboradores as any[] ?? []).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mecânico *</Label>
                  <Select value={osForm.mecanicoId} onValueChange={v => setOsForm(p => ({...p, mecanicoId: v}))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>{(mecanicos as any[] ?? []).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.nome} — {m.especialidade}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Recurso / Elevador *</Label>
                  <Select value={osForm.recursoId} onValueChange={v => setOsForm(p => ({...p, recursoId: v}))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>{(recursos as any[] ?? []).map((r: any) => <SelectItem key={r.id} value={String(r.id)} disabled={r.ocupado}>{r.nomeRecurso}{r.ocupado ? " (Ocupado)" : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Campanha na OS */}
              <div>
                <Label className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-amber-500" />
                  Campanha / Promoção aplicada <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                </Label>
                <Select value={osForm.campanha || "__none__"} onValueChange={v => { const val = v === "__none__" ? "" : v; setOsForm(p => ({...p, campanha: val, veioDePromocao: !!val})); }}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma campanha" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {CAMPANHAS.filter(c => c.includes("Promoção")).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
                {osForm.campanha && (
                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Confirme que o benefício da campanha <strong>{osForm.campanha}</strong> foi aplicado corretamente
                  </p>
                )}
              </div>

              <div>
                <Label>Observações Internas</Label>
                <Textarea value={osForm.observacoes} onChange={e => setOsForm(p => ({...p, observacoes: e.target.value}))} placeholder="Notas internas, histórico relevante..." rows={2} />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={osForm.primeiraVez} onChange={e => setOsForm(p => ({...p, primeiraVez: e.target.checked}))} className="rounded" />
                  Primeira vez na oficina
                </label>
              </div>
              {!canStep4 && (
                <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Preencha motivo da visita, consultor, mecânico e recurso para continuar</span>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
            <Button onClick={() => setStep(4)} disabled={!canStep4}>Revisar OS <ArrowRight className="h-4 w-4 ml-2" /></Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: CONFIRMAÇÃO ─────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="max-w-2xl mx-auto space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Revisão da OS</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Cliente</Label>
                <div className="mt-1 p-3 bg-muted/30 rounded-lg">
                  <div className="font-semibold">{clienteSelecionado?.nomeCompleto}</div>
                  <div className="text-sm text-muted-foreground">
                    {clienteSelecionado?.telefone} · {clienteSelecionado?.email}
                  </div>
                  {clienteSelecionado?.origemCadastro && (
                    <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <Tag className="h-3 w-3" />Origem: {clienteSelecionado.origemCadastro}
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Veículo</Label>
                <div className="mt-1 p-3 bg-muted/30 rounded-lg">
                  <div className="font-semibold font-mono">{veiculoSelecionado?.placa} — {veiculoSelecionado?.marca} {veiculoSelecionado?.modelo}</div>
                  <div className="text-sm text-muted-foreground">
                    {veiculoSelecionado?.ano} · {veiculoSelecionado?.combustivel} · {(veiculoSelecionado?.kmAtual || Number(veiculoForm.kmAtual) || 0).toLocaleString("pt-BR")} km
                  </div>
                  {(veiculoSelecionado?.ultimaRevisaoKm || veiculoForm.ultimaRevisaoKm) && (
                    <div className="text-xs text-amber-400 mt-1">
                      Última revisão: {(veiculoSelecionado?.ultimaRevisaoKm || veiculoForm.ultimaRevisaoKm)?.toLocaleString?.("pt-BR") ?? veiculoForm.ultimaRevisaoKm} km
                      {(veiculoSelecionado?.ultimaRevisaoData || veiculoForm.ultimaRevisaoData) && ` · ${new Date(veiculoSelecionado?.ultimaRevisaoData || veiculoForm.ultimaRevisaoData).toLocaleDateString("pt-BR")}`}
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Serviço</Label>
                <div className="mt-1 p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="font-medium">{osForm.motivoVisita}</div>
                  <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
                    {osForm.tipoServico && <span>Tipo: {osForm.tipoServico}</span>}
                    <span>Consultor: {(colaboradores as any[] ?? []).find((c: any) => String(c.id) === osForm.colaboradorId)?.nome}</span>
                    <span>Mecânico: {(mecanicos as any[] ?? []).find((m: any) => String(m.id) === osForm.mecanicoId)?.nome}</span>
                    <span>Recurso: {(recursos as any[] ?? []).find((r: any) => String(r.id) === osForm.recursoId)?.nomeRecurso}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {osForm.primeiraVez && <Badge variant="secondary">Primeira vez</Badge>}
                    {osForm.campanha && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">{osForm.campanha}</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
            <Button onClick={handleCriarOS} disabled={criarOS.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {criarOS.isPending ? "Criando OS..." : <><Check className="h-4 w-4 mr-2" />Abrir OS</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
