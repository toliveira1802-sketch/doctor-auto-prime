import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
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
import { Car, Clock, User, Wrench, Plus, Loader2, AlertTriangle } from "lucide-react";
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

function isOverdue(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function daysInStage(createdAt: Date | string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatCurrency(v: number | string | null | undefined) {
  if (!v) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}

type PatioItem = {
  os: {
    id: number;
    numero: string;
    status: string;
    tipoServico: string | null;
    consultorNome: string | null;
    descricaoProblema: string | null;
    valorAprovado: string | null;
    dataPrevisaoEntrega: Date | string | null;
    createdAt: Date | string;
  };
  cliente: { nome: string | null; telefone: string | null } | null;
  veiculo: { placa: string; modelo: string | null; marca: string | null; cor: string | null } | null;
  mecanico: { nome: string; emoji: string | null } | null;
};

function KanbanCard({
  item,
  onMove,
  isMoving,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  item: PatioItem;
  onMove: (id: number, status: Stage) => void;
  isMoving: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const overdue = isOverdue(item.os.dataPrevisaoEntrega as string);
  const days = daysInStage(item.os.createdAt);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
        dragging ? "opacity-50 scale-95" : ""
      } ${overdue ? "border-red-500/50" : "border-border"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs font-mono text-muted-foreground">{item.os.numero}</span>
          {overdue && (
            <div className="flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400">Atrasado</span>
            </div>
          )}
        </div>
        {item.os.tipoServico && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {item.os.tipoServico}
          </Badge>
        )}
      </div>

      {/* Vehicle */}
      <div className="flex items-center gap-2 mb-2">
        <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground font-mono">
            {item.veiculo?.placa ?? "—"}
          </span>
          {item.veiculo?.modelo && (
            <span className="text-xs text-muted-foreground ml-1">
              {item.veiculo.marca} {item.veiculo.modelo}
            </span>
          )}
        </div>
      </div>

      {/* Client */}
      {item.cliente?.nome && (
        <div className="flex items-center gap-2 mb-2">
          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{item.cliente.nome}</span>
        </div>
      )}

      {/* Description */}
      {item.os.descricaoProblema && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
          {item.os.descricaoProblema}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          {item.mecanico && (
            <span className="text-xs text-muted-foreground">
              {item.mecanico.emoji} {item.mecanico.nome}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.os.valorAprovado && (
            <span className="text-xs font-medium text-green-400">
              {formatCurrency(item.os.valorAprovado)}
            </span>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{days}d</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2 flex gap-1">
        <Button variant="ghost" size="sm" className="h-6 text-xs flex-1" asChild>
          <Link href={`/os/${item.os.id}`}>Ver OS</Link>
        </Button>
        {isMoving ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <Select onValueChange={(v) => onMove(item.os.id, v as Stage)}>
            <SelectTrigger className="h-6 text-xs w-24 border-border">
              <SelectValue placeholder="Mover" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.filter((s) => s.key !== item.os.status).map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs">
                  {s.key}
                </SelectItem>
              ))}
              <SelectItem value="Entregue" className="text-xs">Entregue</SelectItem>
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
  const { data: items = [], isLoading } = trpc.os.patio.useQuery({ consultor: consultor === "todos" ? undefined : consultor });
  const updateStatus = trpc.os.updateStatus.useMutation({
    onSuccess: () => {
      utils.os.patio.invalidate();
      utils.dashboard.kpis.invalidate();
      utils.dashboard.operacional.invalidate();
      setMovingId(null);
    },
    onError: (err) => {
      toast.error("Erro ao mover OS: " + err.message);
      setMovingId(null);
    },
  });

  const handleMove = (id: number, status: Stage | "Entregue") => {
    setMovingId(id);
    updateStatus.mutate({ id, status });
  };

  const handleDrop = (stage: string) => {
    if (draggingId !== null && stage !== items.find((i) => i.os.id === draggingId)?.os.status) {
      handleMove(draggingId, stage as Stage);
    }
    setDraggingId(null);
    setDragOverStage(null);
  };

  const grouped = STAGES.reduce(
    (acc, s) => {
      acc[s.key] = items.filter((i) => i.os.status === s.key);
      return acc;
    },
    {} as Record<string, typeof items>
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
                          item={item as PatioItem}
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
