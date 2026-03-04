import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Car, Clock, User, Wrench, ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

const STATUSES = [
  { key: "Diagnóstico", color: "bg-amber-500", light: "bg-amber-500/10 border-amber-500/30" },
  { key: "Orçamento", color: "bg-blue-500", light: "bg-blue-500/10 border-blue-500/30" },
  { key: "Aguardando Aprovação", color: "bg-purple-500", light: "bg-purple-500/10 border-purple-500/30" },
  { key: "Aprovado", color: "bg-cyan-500", light: "bg-cyan-500/10 border-cyan-500/30" },
  { key: "Em Execução", color: "bg-orange-500", light: "bg-orange-500/10 border-orange-500/30" },
  { key: "Aguardando Peça", color: "bg-red-500", light: "bg-red-500/10 border-red-500/30" },
  { key: "Pronto", color: "bg-green-500", light: "bg-green-500/10 border-green-500/30" },
];

const STATUS_NEXT: Record<string, string> = {
  "Diagnóstico": "Orçamento",
  "Orçamento": "Aguardando Aprovação",
  "Aguardando Aprovação": "Aprovado",
  "Aprovado": "Em Execução",
  "Em Execução": "Aguardando Peça",
  "Aguardando Peça": "Pronto",
  "Pronto": "Entregue",
};
const STATUS_PREV: Record<string, string> = Object.fromEntries(Object.entries(STATUS_NEXT).map(([k, v]) => [v, k]));

export default function AdminPatio() {
  const [, navigate] = useLocation();
  const [filterConsultor, setFilterConsultor] = useState("all");

  const { data: patioData, refetch } = trpc.os.patio.useQuery();
  const { data: colaboradores } = trpc.colaboradores.list.useQuery(undefined);
  const updateStatus = trpc.os.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const allCards = (patioData ?? []) as any[];
  const filtered = filterConsultor === "all" ? allCards : allCards.filter((c: any) => String(c.colaborador?.id) === filterConsultor);

  const getByStatus = (status: string) => filtered.filter((c: any) => c.os?.status === status || c.status === status);

  const handleMove = (osId: number, currentStatus: string, direction: "next" | "prev") => {
    const newStatus = direction === "next" ? STATUS_NEXT[currentStatus] : STATUS_PREV[currentStatus];
    if (!newStatus) return;
    updateStatus.mutate({ id: osId, status: newStatus });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pátio — Kanban</h1>
          <p className="text-muted-foreground text-sm">Arraste ou use as setas para mover OS entre status</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterConsultor} onValueChange={setFilterConsultor}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todos os consultores" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os consultores</SelectItem>
              {colaboradores?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Link href="/admin/nova-os">
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova OS</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUSES.map(({ key, color, light }) => {
          const cards = getByStatus(key);
          return (
            <div key={key} className="flex-shrink-0 w-64">
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border ${light}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-xs font-semibold">{key}</span>
                </div>
                <Badge variant="outline" className="text-xs h-5">{cards.length}</Badge>
              </div>
              <div className={`min-h-[400px] border border-t-0 rounded-b-lg p-2 space-y-2 ${light}`}>
                {cards.map((card: any) => {
                  const os = card.os ?? card;
                  const cliente = card.cliente;
                  const veiculo = card.veiculo;
                  const mecanico = card.mecanico;
                  const colaborador = card.colaborador;
                  const status = os.status ?? card.status;
                  const createdAt = os.createdAt ? new Date(os.createdAt) : null;
                  const hoursAgo = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / 3600000) : 0;

                  return (
                    <Card key={os.id} className="hover:shadow-md transition-shadow bg-card/80 border-border/50">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => navigate(`/admin/os/${os.id}`)}>                          
                          <span className="text-xs font-mono text-primary font-bold">{os.numeroOs}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{hoursAgo}h
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs cursor-pointer" onClick={() => navigate(`/admin/os/${os.id}`)}>                          
                          <Car className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono font-semibold">{veiculo?.placa ?? os.placa ?? "—"}</span>
                          <span className="text-muted-foreground">· {veiculo?.modelo ?? os.modelo ?? ""}</span>
                        </div>
                        {cliente && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer" onClick={() => navigate(`/admin/os/${os.id}`)}>                            
                            <User className="h-3 w-3" />{cliente.nomeCompleto ?? cliente.nome ?? "—"}
                          </div>
                        )}
                        {mecanico && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Wrench className="h-3 w-3" />{mecanico.nome ?? "—"}
                          </div>
                        )}
                        {colaborador && (
                          <div className="text-xs text-muted-foreground truncate">
                            Consultor: {colaborador.nome ?? "—"}
                          </div>
                        )}
                        <div className="flex gap-1 pt-1">
                          {STATUS_PREV[status] && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs flex-1"
                              onClick={() => handleMove(os.id, status, "prev")} disabled={updateStatus.isPending}>
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                          )}
                          {STATUS_NEXT[status] && (
                            <Button size="sm" className="h-6 px-2 text-xs flex-1"
                              onClick={() => handleMove(os.id, status, "next")} disabled={updateStatus.isPending}>
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {cards.length === 0 && (
                  <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">Vazio</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
