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
import { Plus, Search, Car, User, Loader2, ChevronRight } from "lucide-react";
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

function formatCurrency(v: string | number | null | undefined) {
  if (!v) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d as string).toLocaleDateString("pt-BR");
}

export default function OsList() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 25;

  const { data, isLoading } = trpc.os.list.useQuery({
    status: statusFilter === "todos" ? undefined : statusFilter,
    search: search || undefined,
    limit,
    offset: page * limit,
  });

  type OsItem = NonNullable<typeof data>["items"][number];
  const items: OsItem[] = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>
            <p className="text-sm text-muted-foreground">{total} OS encontradas</p>
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
              placeholder="Buscar por OS, placa ou motivo..."
              className="pl-9 bg-card border-border"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-52 border-border">
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
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma OS encontrada</p>
            <Button className="mt-4" asChild>
              <Link href="/os/nova">Criar primeira OS</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(({ os, cliente, veiculo, mecanico }) => (
              <Link key={os.id} href={`/os/${os.id}`}>
                <Card className="bg-card border border-border cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* OS Number + Date */}
                      <div className="w-32 shrink-0">
                        <p className="text-xs font-mono text-primary font-bold">
                          {os.numeroOs ?? `#${os.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(os.dataEntrada)}
                        </p>
                      </div>

                      {/* Vehicle + Client */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-semibold text-foreground font-mono">
                            {os.placa ?? "—"}
                          </span>
                          {(veiculo?.marca || veiculo?.modelo) && (
                            <span className="text-xs text-muted-foreground">
                              {veiculo?.marca} {veiculo?.modelo}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            {cliente?.nomeCompleto ?? "—"}
                          </span>
                        </div>
                      </div>

                      {/* Motivo + Mechanic */}
                      <div className="flex-1 min-w-0 hidden md:block">
                        <p className="text-xs text-muted-foreground truncate">
                          {os.motivoVisita ?? "—"}
                        </p>
                        {mecanico && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {mecanico.nome}
                          </p>
                        )}
                      </div>

                      {/* Value */}
                      <div className="w-28 text-right shrink-0 hidden sm:block">
                        {(os.valorTotalOs || os.totalOrcamento) && (
                          <p className="text-sm font-medium text-green-400">
                            {formatCurrency(os.valorTotalOs ?? os.totalOrcamento)}
                          </p>
                        )}
                        {os.dataSaida && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Entregue {formatDate(os.dataSaida)}
                          </p>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs px-2 py-0 ${STATUS_BADGE[os.status ?? ""] ?? "bg-gray-500/20 text-gray-300"}`}
                        >
                          {os.status ?? "—"}
                        </Badge>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {page * limit + 1}–{Math.min((page + 1) * limit, total)} de {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-border"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="border-border"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
