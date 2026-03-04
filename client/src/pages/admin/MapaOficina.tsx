/**
 * MapaOficina — Segunda visão do Pátio
 * Layout CSS Grid fiel ao mapa físico da oficina.
 * Cada vaga mostra: nome, status (livre/ocupado), placa e OS.
 * Clique em vaga ocupada → navega para OS. Clique em vaga livre → modal para alocar OS.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Car, CheckCircle2, Clock, Wrench, X, RefreshCw } from "lucide-react";

// ── Status color mapping ──────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  "Diagnóstico":          { bg: "bg-amber-500/10",   border: "border-amber-500/40",   text: "text-amber-300",  dot: "bg-amber-400" },
  "Orçamento":            { bg: "bg-blue-500/10",    border: "border-blue-500/40",    text: "text-blue-300",   dot: "bg-blue-400" },
  "Aguardando Aprovação": { bg: "bg-purple-500/10",  border: "border-purple-500/40",  text: "text-purple-300", dot: "bg-purple-400" },
  "Aprovado":             { bg: "bg-cyan-500/10",    border: "border-cyan-500/40",    text: "text-cyan-300",   dot: "bg-cyan-400" },
  "Em Execução":          { bg: "bg-orange-500/10",  border: "border-orange-500/40",  text: "text-orange-300", dot: "bg-orange-400" },
  "Aguardando Peça":      { bg: "bg-red-500/10",     border: "border-red-500/40",     text: "text-red-300",    dot: "bg-red-400" },
  "Teste":                { bg: "bg-yellow-500/10",  border: "border-yellow-500/40",  text: "text-yellow-300", dot: "bg-yellow-400" },
  "Pronto":               { bg: "bg-green-500/10",   border: "border-green-500/40",   text: "text-green-300",  dot: "bg-green-400" },
  "Agendado":             { bg: "bg-indigo-500/10",  border: "border-indigo-500/40",  text: "text-indigo-300", dot: "bg-indigo-400" },
  "Cancelado":            { bg: "bg-zinc-500/10",    border: "border-zinc-500/40",    text: "text-zinc-400",   dot: "bg-zinc-400" },
  "__livre":              { bg: "bg-emerald-500/8",  border: "border-emerald-500/25", text: "text-emerald-400",dot: "bg-emerald-400" },
};

function getColors(status: string | null | undefined) {
  if (!status) return STATUS_COLORS["__livre"];
  return STATUS_COLORS[status] ?? STATUS_COLORS["__livre"];
}

// ── Tipo de vaga icon ─────────────────────────────────────────────────────────
function TipoIcon({ tipo, occupied }: { tipo: string; occupied: boolean }) {
  if (occupied) return <Car className="h-4 w-4" />;
  if (tipo === "especial") return <Wrench className="h-4 w-4" />;
  return <CheckCircle2 className="h-4 w-4" />;
}

type Vaga = {
  id: number;
  nome: string;
  tipo: string | null;
  colStart: number;
  rowStart: number;
  colSpan: number | null;
  rowSpan: number | null;
  osId: number | null;
  os: { placa: string | null; status: string | null; numeroOs: string | null; mecanicoId: number | null } | null;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function MapaOficina() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: vagas = [], isLoading, refetch } = trpc.vagas.list.useQuery(undefined, {
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const { data: patioData } = trpc.os.patio.useQuery();

  const alocarMutation = trpc.vagas.alocar.useMutation({
    onSuccess: () => {
      toast.success("OS alocada à vaga!");
      utils.vagas.list.invalidate();
      setAlocarVaga(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const liberarMutation = trpc.vagas.liberar.useMutation({
    onSuccess: () => {
      toast.success("Vaga liberada.");
      utils.vagas.list.invalidate();
      setLiberarVaga(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const [alocarVaga, setAlocarVaga] = useState<Vaga | null>(null);
  const [liberarVaga, setLiberarVaga] = useState<Vaga | null>(null);
  const [selectedOsId, setSelectedOsId] = useState<string>("");

  // OS disponíveis para alocar (no pátio, sem vaga já alocada)
  const vagasOsIds = new Set((vagas as Vaga[]).filter(v => v.osId).map(v => v.osId));
  const osDisponiveis = (patioData ?? []) as any[];
  const osParaAlocar = osDisponiveis.filter((c: any) => {
    const id = c.os?.id ?? c.id;
    return !vagasOsIds.has(id);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando mapa da oficina...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mapa da Oficina</h2>
          <p className="text-xs text-muted-foreground">Clique em uma vaga para alocar ou liberar um veículo</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-muted-foreground">Livre</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-400" /><span className="text-muted-foreground">Em Execução</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="text-muted-foreground">Aguardando Peça</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-muted-foreground">Diagnóstico</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400" /><span className="text-muted-foreground">Teste</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-400" /><span className="text-muted-foreground">Pronto</span></div>
      </div>

      {/* Grid Map */}
      <div
        className="relative w-full overflow-x-auto"
        style={{ minHeight: 600 }}
      >
        <div
          className="grid gap-2"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, minmax(72px, 1fr))",
            gridTemplateRows: "repeat(10, 80px)",
            width: "100%",
            minWidth: 900,
          }}
        >
          {(vagas as Vaga[]).map((vaga) => {
            const occupied = !!vaga.osId && !!vaga.os;
            const colors = getColors(vaga.os?.status);
            const isRecepcao = vaga.tipo === "recepcao";

            return (
              <div
                key={vaga.id}
                className={`
                  relative rounded-xl border-2 p-2 flex flex-col items-center justify-center gap-1 transition-all
                  ${colors.bg} ${colors.border}
                  ${!isRecepcao ? "cursor-pointer hover:brightness-125 hover:scale-[1.02]" : "cursor-default"}
                `}
                style={{
                  gridColumnStart: vaga.colStart,
                  gridColumnEnd: `span ${vaga.colSpan ?? 1}`,
                  gridRowStart: vaga.rowStart,
                  gridRowEnd: `span ${vaga.rowSpan ?? 1}`,
                }}
                onClick={() => {
                  if (isRecepcao) return;
                  if (occupied) {
                    setLiberarVaga(vaga);
                  } else {
                    setSelectedOsId("");
                    setAlocarVaga(vaga);
                  }
                }}
              >
                {/* Status dot */}
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${colors.dot}`} />

                {/* Icon */}
                <div className={`${colors.text} opacity-70`}>
                  <TipoIcon tipo={vaga.tipo ?? "elevador"} occupied={occupied} />
                </div>

                {/* Name */}
                <span className="text-[11px] font-semibold text-center leading-tight text-foreground/90">
                  {vaga.nome}
                </span>

                {/* Plate if occupied */}
                {occupied && vaga.os?.placa && (
                  <span className={`text-[10px] font-mono font-bold ${colors.text}`}>
                    {vaga.os.placa}
                  </span>
                )}

                {/* Status badge if occupied */}
                {occupied && vaga.os?.status && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 h-4 border-current ${colors.text} hidden sm:flex`}
                  >
                    {vaga.os.status}
                  </Badge>
                )}

                {/* OS number */}
                {occupied && vaga.os?.numeroOs && (
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {vaga.os.numeroOs}
                  </span>
                )}

                {/* Navigate to OS on click when occupied */}
                {occupied && (
                  <button
                    className="absolute inset-0 w-full h-full opacity-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Show liberar dialog
                      setLiberarVaga(vaga);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ALOCAR MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={!!alocarVaga} onOpenChange={(o) => !o && setAlocarVaga(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alocar Veículo — {alocarVaga?.nome}</DialogTitle>
            <DialogDescription>
              Selecione a OS/veículo que está nesta vaga agora.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedOsId} onValueChange={setSelectedOsId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma OS..." />
              </SelectTrigger>
              <SelectContent>
                {osParaAlocar.map((c: any) => {
                  const os = c.os ?? c;
                  const veiculo = c.veiculo;
                  const placa = veiculo?.placa ?? os.placa ?? "—";
                  const modelo = veiculo?.modelo ?? os.modelo ?? "";
                  return (
                    <SelectItem key={os.id} value={String(os.id)}>
                      <span className="font-mono font-bold">{placa}</span>
                      {modelo && <span className="text-muted-foreground ml-1">· {modelo}</span>}
                      <span className="text-muted-foreground ml-1 text-xs">({os.numeroOs ?? `#${os.id}`})</span>
                    </SelectItem>
                  );
                })}
                {osParaAlocar.length === 0 && (
                  <SelectItem value="__none" disabled>Nenhuma OS disponível</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlocarVaga(null)}>Cancelar</Button>
            <Button
              disabled={!selectedOsId || alocarMutation.isPending}
              onClick={() => {
                if (!alocarVaga || !selectedOsId) return;
                alocarMutation.mutate({ vagaId: alocarVaga.id, osId: Number(selectedOsId) });
              }}
            >
              {alocarMutation.isPending ? "Alocando..." : "Alocar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── LIBERAR / VER OS MODAL ───────────────────────────────────────── */}
      <Dialog open={!!liberarVaga} onOpenChange={(o) => !o && setLiberarVaga(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{liberarVaga?.nome}</DialogTitle>
            <DialogDescription>
              {liberarVaga?.os?.placa && (
                <span>
                  Ocupada por <strong className="font-mono">{liberarVaga.os.placa}</strong>
                  {liberarVaga.os.numeroOs && ` · OS ${liberarVaga.os.numeroOs}`}
                  {liberarVaga.os.status && ` · ${liberarVaga.os.status}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (liberarVaga?.osId) navigate(`/admin/os/${liberarVaga.osId}`);
                setLiberarVaga(null);
              }}
            >
              <Car className="h-4 w-4 mr-2" />
              Ver OS
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={liberarMutation.isPending}
              onClick={() => liberarVaga && liberarMutation.mutate({ vagaId: liberarVaga.id })}
            >
              <X className="h-4 w-4 mr-2" />
              {liberarMutation.isPending ? "Liberando..." : "Liberar Vaga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
