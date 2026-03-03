import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Plus, Search, Car, User, Calendar, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";

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

const STATUSES = ["Diagnóstico", "Orçamento", "Aguardando Aprovação", "Aprovado", "Em Execução", "Aguardando Peça", "Pronto", "Entregue", "Cancelado"];

export default function AdminOrdensServico() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = trpc.os.list.useQuery({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    offset: (page - 1) * limit,
    limit,
  });

  const items = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <p className="text-muted-foreground text-sm">{total} OS encontradas</p>
        </div>
        <Link href="/admin/nova-os">
          <Button className="gap-2"><Plus className="h-4 w-4" />Nova OS</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por OS, placa, cliente..." className="pl-10" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma OS encontrada</div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((row: any) => {
                const os = row.os ?? row;
                const cliente = row.cliente;
                const veiculo = row.veiculo;
                const mecanico = row.mecanico;
                const colaborador = row.colaborador;
                const status = os.status ?? row.status;
                const createdAt = os.createdAt ? new Date(os.createdAt) : null;

                return (
                  <div key={os.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/os/${os.id}`)}>
                    <div className="w-28 flex-shrink-0">
                      <div className="font-mono text-sm font-bold text-primary">{os.numeroOs}</div>
                      <div className="text-xs text-muted-foreground">{createdAt ? createdAt.toLocaleDateString("pt-BR") : "—"}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Car className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-mono font-semibold text-sm">{veiculo?.placa ?? os.placa ?? "—"}</span>
                        <span className="text-muted-foreground text-sm truncate">{veiculo?.marca} {veiculo?.modelo} {veiculo?.ano}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{cliente?.nomeCompleto ?? "—"}</span>
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-1 w-32 flex-shrink-0">
                      {mecanico && <span className="text-xs text-muted-foreground">{mecanico.nome}</span>}
                      {colaborador && <span className="text-xs text-muted-foreground">{colaborador.nome}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge className={`text-xs border ${STATUS_COLORS[status] ?? "bg-muted"}`}>{status}</Badge>
                      {(os.valorTotalOs ?? 0) > 0 && (
                        <span className="text-xs font-semibold text-green-400">
                          R$ {Number(os.valorTotalOs).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
