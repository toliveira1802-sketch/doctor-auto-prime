import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Car, Clock, User, Wrench, Plus, Loader2 } from "lucide-react";
import { Link } from "wouter";

const STAGES = [
  { key: "Diagnóstico", color: "border-indigo-500", bg: "bg-indigo-500/10", badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  { key: "Orçamento", color: "border-cyan-500", bg: "bg-cyan-500/10", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { key: "Aguardando Aprovação", color: "border-yellow-500", bg: "bg-yellow-500/10", badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  { key: "Aguardando Peças", color: "border-orange-500", bg: "bg-orange-500/10", badge: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { key: "Em Execução", color: "border-green-500", bg: "bg-green-500/10", badge: "bg-green-500/20 text-green-300 border-green-500/30" },
  { key: "Pronto", color: "border-emerald-500", bg: "bg-emerald-500/10", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
] as const;

type Stage = (typeof STAGES)[number]["key"];

function daysInStage(createdAt: Date | string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatCurrency(v: number | string | null | undefined) {
  if (!v) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}

type PatioRow = {
  os: {
    id: number;
    numeroOs: string | null;
    status: string | null;
    motivoVisita: string | null;
    placa: string | null;
    km: number | null;
    totalOrcamento: string | null;
    valorTotalOs: string | null;
    createdAt: Date;
  };
  cliente: { id: number; nomeCompleto: string; telefone: string | null } | null;
  veiculo: { id: number; marca: string | null; modelo: string | null; placa: string } | null;
  mecanico: { id: number; nome: string } | null;
};

function KanbanCard({
  item,
  onMove,
  isMoving,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  item: PatioRow;
  onMove: (id: number, status: string) => void;
  isMoving: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const days = daysInStage(item.os.createdAt);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
        dragging ? "opacity-50 scale-95" : ""
      } border-border`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-mono text-primary font-bold">
          {item.os.numeroOs ?? `#${item.os.id}`}
        </span>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{days}d</span>
        </div>
      </div>

      {/* Vehicle */}
      <div className="flex items-center gap-2 mb-1.5">
        <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground font-mono">
            {item.os.placa ?? "—"}
          </span>
          {(item.veiculo?.marca || item.veiculo?.modelo) && (
            <span className="text-xs text-muted-foreground ml-1">
              {item.veiculo.marca} {item.veiculo.modelo}
            </span>
          )}
        </div>
      </div>

      {/* Client */}
      {item.cliente && (
        <div className="flex items-center gap-2 mb-1.5">
          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{item.cliente.nomeCompleto}</span>
        </div>
      )}

      {/* Mechanic */}
      {item.mecanico && (
        <div className="flex items-center gap-2 mb-1.5">
          <Wrench className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{item.mecanico.nome}</span>
        </div>
      )}

      {/* Motivo */}
      {item.os.motivoVisita && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
          {item.os.motivoVisita}
        </p>
      )}

      {/* Value */}
      {(item.os.totalOrcamento || item.os.valorTotalOs) && (
        <div className="text-xs font-medium text-green-400 mb-2">
          {formatCurrency(item.os.valorTotalOs ?? item.os.totalOrcamento)}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex gap-1">
        <Button variant="ghost" size="sm" className="h-6 text-xs flex-1" asChild>
          <Link href={`/os/${item.os.id}`}>Ver OS</Link>
        </Button>
        {isMoving ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground self-center" />
        ) : (
          <Select onValueChange={(v) => onMove(item.os.id, v)}>
            <SelectTrigger className="h-6 text-xs w-24 border-border">
              <SelectValue placeholder="Mover" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.filter((s) => s.key !== item.os.status).map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs">
                  {s.key}
                </SelectItem>
              ))}
              <SelectItem value="Entregue" className="text-xs">Entregue ✓</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

export default function Patio() {
  const [consultor, setConsultor] = useState("todos");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: rawItems = [], isLoading } = trpc.os.patio.useQuery({ consultor: consultor === "todos" ? undefined : consultor });
  const items = rawItems as PatioRow[];

  const updateStatus = trpc.os.updateStatus.useMutation({
    onSuccess: () => {
      utils.os.patio.invalidate();
      utils.dashboard.kpis.invalidate();
      setMovingId(null);
    },
    onError: (err) => {
      toast.error("Erro ao mover OS: " + err.message);
      setMovingId(null);
    },
  });

  const handleMove = (id: number, status: string) => {
    setMovingId(id);
    updateStatus.mutate({ id, status });
  };

  const handleDrop = (stage: string) => {
    if (draggingId !== null) {
      const current = items.find((i) => i.os.id === draggingId);
      if (current && stage !== current.os.status) {
        handleMove(draggingId, stage);
      }
    }
    setDraggingId(null);
    setDragOverStage(null);
  };

  const grouped = STAGES.reduce(
    (acc, s) => {
      acc[s.key] = items.filter((i) => i.os.status === s.key);
      return acc;
    },
    {} as Record<string, PatioRow[]>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pátio</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} veículo{items.length !== 1 ? "s" : ""} em andamento
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <Button asChild>
              <Link href="/os/nova">
                <Plus className="w-4 h-4 mr-2" />
                Nova OS
              </Link>
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 flex-1 scrollbar-thin">
            {STAGES.map((stage) => {
              const cards = grouped[stage.key] ?? [];
              const isOver = dragOverStage === stage.key;
              return (
                <div
                  key={stage.key}
                  className={`flex flex-col shrink-0 w-64 rounded-xl border-t-2 ${stage.color} bg-card/50 transition-all ${
                    isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStage(stage.key);
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={() => handleDrop(stage.key)}
                >
                  {/* Column Header */}
                  <div className={`px-3 py-2.5 rounded-t-xl ${stage.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{stage.key}</span>
                      <Badge variant="outline" className={`text-xs px-1.5 py-0 ${stage.badge}`}>
                        {cards.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-thin">
                    {cards.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum veículo
                      </div>
                    ) : (
                      cards.map((item) => (
                        <KanbanCard
                          key={item.os.id}
                          item={item}
                          onMove={handleMove}
                          isMoving={movingId === item.os.id}
                          dragging={draggingId === item.os.id}
                          onDragStart={() => setDraggingId(item.os.id)}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverStage(null);
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
