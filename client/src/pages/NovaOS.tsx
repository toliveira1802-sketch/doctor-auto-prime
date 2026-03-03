import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { ArrowLeft, Car, User, Wrench, Loader2, Search, Plus } from "lucide-react";
import { Link } from "wouter";

export default function NovaOS() {
  const [, navigate] = useLocation();

  // Client mode: "search" | "new"
  const [clienteMode, setClienteMode] = useState<"search" | "new">("search");
  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<number | null>(null);

  // Form fields
  const [form, setForm] = useState({
    clienteNome: "",
    clienteTelefone: "",
    placa: "",
    marca: "",
    modelo: "",
    ano: "",
    mecanicoId: "",
    consultorNome: "",
    tipoServico: "",
    descricaoProblema: "",
    valorOrcamento: "",
    dataEntrada: new Date().toISOString().split("T")[0],
    dataPrevisaoEntrega: "",
    kmEntrada: "",
    observacoes: "",
  });

  const { data: clienteSearch_results } = trpc.clientes.list.useQuery(
    { search: clienteSearch, limit: 10 },
    { enabled: clienteSearch.length >= 2 }
  );

  const { data: veiculosCliente } = trpc.veiculos.list.useQuery(
    { clienteId: selectedClienteId! },
    { enabled: selectedClienteId !== null }
  );

  const { data: mecanicos } = trpc.mecanicos.list.useQuery();

  const createOs = trpc.os.create.useMutation({
    onSuccess: (data) => {
      toast.success(`OS ${data.numero} criada com sucesso!`);
      navigate(`/os/${data.id}`);
    },
    onError: (err) => toast.error("Erro ao criar OS: " + err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (clienteMode === "search" && !selectedClienteId) {
      toast.error("Selecione ou cadastre um cliente.");
      return;
    }
    if (clienteMode === "new" && !form.clienteNome) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    if (!form.placa && !selectedVeiculoId) {
      toast.error("Informe a placa do veículo.");
      return;
    }

    createOs.mutate({
      clienteId: selectedClienteId ?? undefined,
      veiculoId: selectedVeiculoId ?? undefined,
      mecanicoId: form.mecanicoId ? parseInt(form.mecanicoId) : undefined,
      consultorNome: form.consultorNome || undefined,
      tipoServico: form.tipoServico as "Rápido" | "Médio" | "Demorado" | "Projeto" | undefined,
      descricaoProblema: form.descricaoProblema || undefined,
      valorOrcamento: form.valorOrcamento ? parseFloat(form.valorOrcamento) : undefined,
      dataEntrada: form.dataEntrada || undefined,
      dataPrevisaoEntrega: form.dataPrevisaoEntrega || undefined,
      kmEntrada: form.kmEntrada ? parseInt(form.kmEntrada) : undefined,
      observacoes: form.observacoes || undefined,
      // Quick creation
      clienteNome: clienteMode === "new" ? form.clienteNome : undefined,
      clienteTelefone: clienteMode === "new" ? form.clienteTelefone : undefined,
      placa: !selectedVeiculoId ? form.placa : undefined,
      marca: !selectedVeiculoId ? form.marca : undefined,
      modelo: !selectedVeiculoId ? form.modelo : undefined,
      ano: !selectedVeiculoId ? form.ano : undefined,
    });
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/os">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova Ordem de Serviço</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados para abrir a OS</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={clienteMode === "search" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setClienteMode("search")}
                >
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  Buscar
                </Button>
                <Button
                  type="button"
                  variant={clienteMode === "new" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setClienteMode("new")}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Novo
                </Button>
              </div>

              {clienteMode === "search" ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome, telefone ou email..."
                      className="pl-9 border-border"
                      value={clienteSearch}
                      onChange={(e) => {
                        setClienteSearch(e.target.value);
                        setSelectedClienteId(null);
                        setSelectedVeiculoId(null);
                      }}
                    />
                  </div>
                  {clienteSearch_results && clienteSearch_results.length > 0 && !selectedClienteId && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      {clienteSearch_results.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b border-border last:border-0"
                          onClick={() => {
                            setSelectedClienteId(c.id);
                            setClienteSearch(c.nome);
                            setSelectedVeiculoId(null);
                          }}
                        >
                          <p className="text-sm font-medium text-foreground">{c.nome}</p>
                          <p className="text-xs text-muted-foreground">{c.telefone ?? c.email ?? "—"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedClienteId && (
                    <p className="text-xs text-green-400">✓ Cliente selecionado: {clienteSearch}</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Nome *</Label>
                    <Input
                      className="mt-1 border-border"
                      placeholder="Nome completo"
                      value={form.clienteNome}
                      onChange={(e) => update("clienteNome", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      className="mt-1 border-border"
                      placeholder="(11) 99999-0000"
                      value={form.clienteTelefone}
                      onChange={(e) => update("clienteTelefone", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Veículo */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedClienteId && veiculosCliente && veiculosCliente.length > 0 && (
                <div>
                  <Label>Veículos do Cliente</Label>
                  <div className="mt-1 space-y-1">
                    {veiculosCliente.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          selectedVeiculoId === v.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent"
                        }`}
                        onClick={() => setSelectedVeiculoId(v.id === selectedVeiculoId ? null : v.id)}
                      >
                        <span className="text-sm font-mono font-bold text-foreground">{v.placa}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {v.marca} {v.modelo} {v.ano && `(${v.ano})`}
                        </span>
                      </button>
                    ))}
                    <p className="text-xs text-muted-foreground">ou cadastre um novo abaixo:</p>
                  </div>
                </div>
              )}

              {!selectedVeiculoId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Placa *</Label>
                    <Input
                      className="mt-1 border-border font-mono uppercase"
                      placeholder="ABC1D23"
                      value={form.placa}
                      onChange={(e) => update("placa", e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <Label>Marca</Label>
                    <Input
                      className="mt-1 border-border"
                      placeholder="Volkswagen"
                      value={form.marca}
                      onChange={(e) => update("marca", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input
                      className="mt-1 border-border"
                      placeholder="Golf GTI"
                      value={form.modelo}
                      onChange={(e) => update("modelo", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Ano</Label>
                    <Input
                      className="mt-1 border-border"
                      placeholder="2022"
                      value={form.ano}
                      onChange={(e) => update("ano", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Details */}
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
                  <Label>Mecânico</Label>
                  <Select value={form.mecanicoId} onValueChange={(v) => update("mecanicoId", v)}>
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
                  <Label>Consultor</Label>
                  <Select value={form.consultorNome} onValueChange={(v) => update("consultorNome", v)}>
                    <SelectTrigger className="mt-1 border-border">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="João">João</SelectItem>
                      <SelectItem value="Pedro">Pedro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Serviço</Label>
                  <Select value={form.tipoServico} onValueChange={(v) => update("tipoServico", v)}>
                    <SelectTrigger className="mt-1 border-border">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rápido">Rápido (R$1k–15k)</SelectItem>
                      <SelectItem value="Médio">Médio (R$4k–8k)</SelectItem>
                      <SelectItem value="Demorado">Demorado (R$25k+)</SelectItem>
                      <SelectItem value="Projeto">Projeto (Sky's the limit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>KM Entrada</Label>
                  <Input
                    type="number"
                    className="mt-1 border-border"
                    placeholder="0"
                    value={form.kmEntrada}
                    onChange={(e) => update("kmEntrada", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data de Entrada</Label>
                  <Input
                    type="date"
                    className="mt-1 border-border"
                    value={form.dataEntrada}
                    onChange={(e) => update("dataEntrada", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Previsão de Entrega</Label>
                  <Input
                    type="date"
                    className="mt-1 border-border"
                    value={form.dataPrevisaoEntrega}
                    onChange={(e) => update("dataPrevisaoEntrega", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Orçamento (R$)</Label>
                  <Input
                    type="number"
                    className="mt-1 border-border"
                    placeholder="0,00"
                    value={form.valorOrcamento}
                    onChange={(e) => update("valorOrcamento", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Problema Relatado</Label>
                <Textarea
                  className="mt-1 border-border resize-none"
                  rows={3}
                  placeholder="Descreva o problema relatado pelo cliente..."
                  value={form.descricaoProblema}
                  onChange={(e) => update("descricaoProblema", e.target.value)}
                />
              </div>

              <div>
                <Label>Observações Internas</Label>
                <Textarea
                  className="mt-1 border-border resize-none"
                  rows={2}
                  placeholder="Observações para a equipe..."
                  value={form.observacoes}
                  onChange={(e) => update("observacoes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={createOs.isPending}>
            {createOs.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Abrir Ordem de Serviço
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
