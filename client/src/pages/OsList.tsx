import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Car, User, Loader2, AlertTriangle } from "lucide-react";
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

const TIPO_BADGE: Record<string, string> = {
  "Rápido": "bg-blue-500/20 text-blue-300",
  "Médio": "bg-purple-500/20 text-purple-300",
  "Demorado": "bg-orange-500/20 text-orange-300",
  "Projeto": "bg-pink-500/20 text-pink-300",
};

function formatCurrency(v: string | number | null | undefined) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}

function isOverdue(dateStr: Date | string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr as string) < new Date();
}

export default function OsList() {
  const [status, setStatus] = useState("todos");
  const [consultor, setConsultor] = useState("todos");
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.os.list.useQuery({
    status: status === "todos" ? undefined : status,
    consultor: consultor === "todos" ? undefined : consultor,
    limit: 100,
  });

  const items = data?.items ?? [];

  const filtered = search
    ? items.filter(
        (i) =>
          i.os.numero.toLowerCase().includes(search.toLowerCase()) ||
          i.veiculo?.placa?.toLowerCase().includes(search.toLowerCase()) ||
          i.cliente?.nome?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} OS encontradas</p>
          </div>
          <Button asChild>
            <Link href="/os/nova">
              <Plus className="w-4 h-4 mr-2" />
              Nova OS
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OS, placa ou cliente..."
              className="pl-9 bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
              <SelectItem value="Orçamento">Orçamento</SelectItem>
              <SelectItem value="Aguardando Aprovação">Aguardando Aprovação</SelectItem>
              <SelectItem value="Aguardando Peças">Aguardando Peças</SelectItem>
              <SelectItem value="Em Execução">Em Execução</SelectItem>
              <SelectItem value="Pronto">Pronto</SelectItem>
              <SelectItem value="Entregue">Entregue</SelectItem>
              <SelectItem value="Cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={consultor} onValueChange={setConsultor}>
            <SelectTrigger className="w-36 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="João">João</SelectItem>
              <SelectItem value="Pedro">Pedro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma OS encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ os, cliente, veiculo, mecanico }) => {
              const overdue = isOverdue(os.dataPrevisaoEntrega);
              return (
                <Link key={os.id} href={`/os/${os.id}`}>
                  <Card className={`bg-card border cursor-pointer hover:border-primary/50 transition-colors ${overdue && os.status !== "Entregue" && os.status !== "Cancelada" ? "border-red-500/40" : "border-border"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* OS Number */}
                        <div className="w-28 shrink-0">
                          <p className="text-xs font-mono text-muted-foreground">{os.numero}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(os.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>

                        {/* Vehicle + Client */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-semibold text-foreground font-mono">
                              {veiculo?.placa ?? "—"}
                            </span>
                            {veiculo?.modelo && (
                              <span className="text-xs text-muted-foreground">
                                {veiculo.marca} {veiculo.modelo}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground">{cliente?.nome ?? "—"}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0 hidden md:block">
                          <p className="text-xs text-muted-foreground truncate">
                            {os.descricaoProblema ?? "—"}
                          </p>
                          {mecanico && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {mecanico.emoji} {mecanico.nome}
                            </p>
                          )}
                        </div>

                        {/* Value */}
                        <div className="w-28 text-right shrink-0 hidden sm:block">
                          <p className="text-sm font-medium text-green-400">
                            {formatCurrency(os.valorAprovado ?? os.valorOrcamento)}
                          </p>
                          {os.dataPrevisaoEntrega && (
                            <p className={`text-xs mt-0.5 ${overdue && os.status !== "Entregue" ? "text-red-400" : "text-muted-foreground"}`}>
                              {overdue && os.status !== "Entregue" && os.status !== "Cancelada" && (
                                <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                              )}
                              {new Date(os.dataPrevisaoEntrega as unknown as string).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className={`text-xs px-2 py-0 ${STATUS_BADGE[os.status] ?? ""}`}>
                            {os.status}
                          </Badge>
                          {os.tipoServico && (
                            <Badge variant="secondary" className={`text-xs px-2 py-0 ${TIPO_BADGE[os.tipoServico] ?? ""}`}>
                              {os.tipoServico}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
