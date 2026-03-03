import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Car, User, Wrench, Loader2, Search, Plus, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function NovaOS() {
  const [, navigate] = useLocation();

  const [clienteMode, setClienteMode] = useState<"search" | "new">("search");
  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [selectedClienteNome, setSelectedClienteNome] = useState("");
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<number | null>(null);

  const [form, setForm] = useState({
    // New client fields
    clienteNomeCompleto: "",
    clienteTelefone: "",
    clienteCpf: "",
    // Vehicle fields
    placa: "",
    marca: "",
    modelo: "",
    ano: "",
    combustivel: "",
    km: "",
    // OS fields
    mecanicoId: "",
    colaboradorId: "",
    motivoVisita: "",
    observacoes: "",
    totalOrcamento: "",
    veioDePromocao: false,
    primeiraVez: false,
    origemContato: "",
  });

  const { data: clienteResults } = trpc.clientes.list.useQuery(
    { search: clienteSearch, limit: 10 },
    { enabled: clienteSearch.length >= 2 }
  );

  const { data: veiculosCliente } = trpc.veiculos.list.useQuery(
    { clienteId: selectedClienteId! },
    { enabled: selectedClienteId !== null }
  );

  const { data: mecanicos } = trpc.mecanicos.list.useQuery();
  const { data: colaboradores } = trpc.colaboradores.list.useQuery();

  const createCliente = trpc.clientes.create.useMutation();
  const createVeiculo = trpc.veiculos.create.useMutation();
  const createOs = trpc.os.create.useMutation({
    onSuccess: (data) => {
      toast.success(`OS ${data.numeroOs} criada com sucesso!`);
      navigate(`/os/${data.id}`);
    },
    onError: (err) => toast.error("Erro ao criar OS: " + err.message),
  });

  const f = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let clienteId = selectedClienteId;
    let veiculoId = selectedVeiculoId;

    // Create new client if needed
    if (clienteMode === "new") {
      if (!form.clienteNomeCompleto) {
        toast.error("Informe o nome do cliente.");
        return;
      }
      try {
        const result = await createCliente.mutateAsync({
          nomeCompleto: form.clienteNomeCompleto,
          telefone: form.clienteTelefone || undefined,
          cpf: form.clienteCpf || undefined,
          origemCadastro: form.origemContato || "Balcão",
        });
        clienteId = result.id;
      } catch {
        toast.error("Erro ao criar cliente");
        return;
      }
    }

    if (!clienteId) {
      toast.error("Selecione ou cadastre um cliente.");
      return;
    }

    // Create new vehicle if no vehicle selected
    if (!veiculoId) {
      if (!form.placa) {
        toast.error("Informe a placa do veículo.");
        return;
      }
      try {
        const result = await createVeiculo.mutateAsync({
          clienteId,
          placa: form.placa,
          marca: form.marca || undefined,
          modelo: form.modelo || undefined,
          ano: form.ano ? parseInt(form.ano) : undefined,
          combustivel: form.combustivel || undefined,
          kmAtual: form.km ? parseInt(form.km) : undefined,
          origemContato: form.origemContato || undefined,
        });
        veiculoId = result.id;
      } catch {
        toast.error("Erro ao criar veículo");
        return;
      }
    }

    createOs.mutate({
      clienteId,
      veiculoId,
      placa: form.placa || (veiculosCliente?.find((v) => v.id === veiculoId)?.placa ?? ""),
      km: form.km ? parseInt(form.km) : undefined,
      mecanicoId: form.mecanicoId ? parseInt(form.mecanicoId) : undefined,
      colaboradorId: form.colaboradorId ? parseInt(form.colaboradorId) : undefined,
      motivoVisita: form.motivoVisita || undefined,
      observacoes: form.observacoes || undefined,
      totalOrcamento: form.totalOrcamento ? parseFloat(form.totalOrcamento) : undefined,
      veioDePromocao: form.veioDePromocao,
      primeiraVez: form.primeiraVez,
    });
  };

  const isLoading = createOs.isPending || createCliente.isPending || createVeiculo.isPending;

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" type="button" asChild>
            <Link href="/os">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova OS</h1>
            <p className="text-sm text-muted-foreground">Abertura de Ordem de Serviço</p>
          </div>
        </div>

        {/* ─── Cliente ─────────────────────────────────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={clienteMode === "search" ? "default" : "outline"}
                size="sm"
                onClick={() => setClienteMode("search")}
                className="border-border"
              >
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Buscar existente
              </Button>
              <Button
                type="button"
                variant={clienteMode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setClienteMode("new")}
                className="border-border"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Novo cliente
              </Button>
            </div>

            {clienteMode === "search" ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, telefone ou CPF..."
                    className="pl-9 border-border"
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                  />
                </div>
                {clienteResults && clienteResults.length > 0 && (
                  <div className="border border-border rounded-md overflow-hidden">
                    {clienteResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClienteId(c.id);
                          setSelectedClienteNome(c.nomeCompleto);
                          setSelectedVeiculoId(null);
                          setClienteSearch("");
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                      >
                        <p className="text-sm font-medium text-foreground">{c.nomeCompleto}</p>
                        <p className="text-xs text-muted-foreground">{c.telefone ?? c.email ?? "—"}</p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedClienteId && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/30 rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground font-medium">{selectedClienteNome}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 text-xs"
                      onClick={() => { setSelectedClienteId(null); setSelectedClienteNome(""); setSelectedVeiculoId(null); }}
                    >
                      Trocar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome Completo *</Label>
                  <Input
                    className="mt-1 border-border"
                    placeholder="Nome do cliente"
                    value={form.clienteNomeCompleto}
                    onChange={(e) => f("clienteNomeCompleto", e.target.value)}
                    required={clienteMode === "new"}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input
                    className="mt-1 border-border"
                    placeholder="(11) 99999-9999"
                    value={form.clienteTelefone}
                    onChange={(e) => f("clienteTelefone", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CPF</Label>
                  <Input
                    className="mt-1 border-border"
                    placeholder="000.000.000-00"
                    value={form.clienteCpf}
                    onChange={(e) => f("clienteCpf", e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Veículo ─────────────────────────────────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              Veículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* If client selected, show their vehicles */}
            {selectedClienteId && veiculosCliente && veiculosCliente.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Veículos do cliente
                </Label>
                <div className="flex flex-wrap gap-2">
                  {veiculosCliente.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVeiculoId(v.id);
                        f("placa", v.placa);
                        f("marca", v.marca ?? "");
                        f("modelo", v.modelo ?? "");
                        f("ano", v.ano ? String(v.ano) : "");
                      }}
                      className={`px-3 py-1.5 rounded-md border text-xs font-mono transition-colors ${
                        selectedVeiculoId === v.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {v.placa}
                      {v.modelo && <span className="ml-1 font-sans font-normal">{v.modelo}</span>}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedVeiculoId(null)}
                    className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                      selectedVeiculoId === null
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Plus className="w-3 h-3 inline mr-1" />
                    Novo veículo
                  </button>
                </div>
              </div>
            )}

            {/* Vehicle form (shown when no vehicle selected or new vehicle) */}
            {(!selectedVeiculoId) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Placa *</Label>
                  <Input
                    className="mt-1 border-border font-mono uppercase"
                    placeholder="ABC-1234"
                    value={form.placa}
                    onChange={(e) => f("placa", e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Marca</Label>
                  <Input
                    className="mt-1 border-border"
                    placeholder="Volkswagen"
                    value={form.marca}
                    onChange={(e) => f("marca", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Modelo</Label>
                  <Input
                    className="mt-1 border-border"
                    placeholder="Golf"
                    value={form.modelo}
                    onChange={(e) => f("modelo", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ano</Label>
                  <Input
                    className="mt-1 border-border"
                    placeholder="2022"
                    type="number"
                    value={form.ano}
                    onChange={(e) => f("ano", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Combustível</Label>
                  <Select value={form.combustivel} onValueChange={(v) => f("combustivel", v)}>
                    <SelectTrigger className="mt-1 border-border">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gasolina">Gasolina</SelectItem>
                      <SelectItem value="Etanol">Etanol</SelectItem>
                      <SelectItem value="Flex">Flex</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="GNV">GNV</SelectItem>
                      <SelectItem value="Elétrico">Elétrico</SelectItem>
                      <SelectItem value="Híbrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* KM */}
            <div>
              <Label className="text-xs text-muted-foreground">KM Atual</Label>
              <Input
                className="mt-1 border-border"
                placeholder="50000"
                type="number"
                value={form.km}
                onChange={(e) => f("km", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Serviço ─────────────────────────────────────────────────────── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Consultor</Label>
                <Select value={form.colaboradorId} onValueChange={(v) => f("colaboradorId", v)}>
                  <SelectTrigger className="mt-1 border-border">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(colaboradores ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Mecânico</Label>
                <Select value={form.mecanicoId} onValueChange={(v) => f("mecanicoId", v)}>
                  <SelectTrigger className="mt-1 border-border">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(mecanicos ?? []).map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.nome}
                        {m.especialidade && ` — ${m.especialidade}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Motivo da Visita *</Label>
              <Textarea
                className="mt-1 border-border resize-none"
                placeholder="Descreva o motivo da visita e o problema relatado..."
                rows={3}
                value={form.motivoVisita}
                onChange={(e) => f("motivoVisita", e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Orçamento Estimado (R$)</Label>
              <Input
                className="mt-1 border-border"
                placeholder="0,00"
                type="number"
                value={form.totalOrcamento}
                onChange={(e) => f("totalOrcamento", e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Origem do Contato</Label>
              <Select value={form.origemContato} onValueChange={(v) => f("origemContato", v)}>
                <SelectTrigger className="mt-1 border-border">
                  <SelectValue placeholder="Como chegou até nós?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Balcão">Balcão</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Retorno">Retorno (cliente antigo)</SelectItem>
                  <SelectItem value="Kommo">Kommo / CRM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Veio de Promoção?</Label>
                <Switch
                  checked={form.veioDePromocao}
                  onCheckedChange={(v) => f("veioDePromocao", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Primeira Vez?</Label>
                <Switch
                  checked={form.primeiraVez}
                  onCheckedChange={(v) => f("primeiraVez", v)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Observações Internas</Label>
              <Textarea
                className="mt-1 border-border resize-none"
                placeholder="Observações para a equipe..."
                rows={2}
                value={form.observacoes}
                onChange={(e) => f("observacoes", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 border-border" asChild>
            <Link href="/os">Cancelar</Link>
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Criando OS...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Abrir OS
              </>
            )}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
