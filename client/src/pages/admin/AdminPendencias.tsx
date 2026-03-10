/**
 * Pendências — OS críticas que precisam de ação imediata
 * Vermelho no diagrama = prioridade máxima
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Clock, Car, User, RefreshCw, Loader2, ChevronRight, Wrench, PackageX, Timer, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type PendenciaOS = {
  id: number;
  tipo: "atraso" | "aguardando_pecas" | "sem_mecanico" | "sem_orcamento";
  nomeCliente: string;
  placa: string;
  marcaModelo: string;
  mecanicoNome: string | null;
  status: string;
  valorTotalOs: number;
  diasEmAberto: number;
  motivoVisita: string | null;
};

const TIPO_CONFIG = {
  atraso:           { label: "Atraso +3d",      color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/40",    icon: Timer },
  aguardando_pecas: { label: "Aguard. Peças",   color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/40",  icon: PackageX },
  sem_mecanico:     { label: "Sem Mecânico",    color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/40", icon: Wrench },
  sem_orcamento:    { label: "Sem Orçamento",   color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/40", icon: AlertTriangle },
} as const;

function diasAberto(createdAt: number | string | Date | null): number {
  if (!createdAt) return 0;
  const ts = createdAt instanceof Date ? createdAt.getTime() : typeof createdAt === "number" ? createdAt : new Date(createdAt).getTime();
  return Math.floor((Date.now() - ts) / 86_400_000);
}

export default function AdminPendencias() {
  const [, navigate] = useLocation();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const { data: patioRaw, isLoading, refetch } = trpc.os.patio.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const patio = patioRaw ?? [];

  // Classifica OS em pendências
  const pendencias: PendenciaOS[] = [];
  for (const row of patio) {
    const os = row.os;
    const dias = diasAberto(os.createdAt);
    const nomeCliente = row.cliente?.nomeCompleto ?? "—";
    const placa = row.veiculo?.placa ?? os.placa ?? "—";
    const marcaModelo = row.veiculo ? `${row.veiculo.marca} ${row.veiculo.modelo}` : "—";
    const mecanicoNome = row.mecanico?.nome ?? null;
    const base = { id: os.id, nomeCliente, placa, marcaModelo, mecanicoNome, status: os.status ?? "—", valorTotalOs: Number(os.valorTotalOs ?? 0), diasEmAberto: dias, motivoVisita: os.motivoVisita ?? null };

    if (os.status === "Aguard. Pecas") pendencias.push({ ...base, tipo: "aguardando_pecas" });
    if (!os.mecanicoId) pendencias.push({ ...base, tipo: "sem_mecanico" });
    if (dias >= 3) pendencias.push({ ...base, tipo: "atraso" });
    if (!os.valorTotalOs || Number(os.valorTotalOs) === 0) pendencias.push({ ...base, tipo: "sem_orcamento" });
  }

  const filtradas = filtroTipo === "todos" ? pendencias : pendencias.filter((p) => p.tipo === filtroTipo);
  filtradas.sort((a, b) => {
    const prioridade = { atraso: 0, aguardando_pecas: 1, sem_mecanico: 2, sem_orcamento: 3 };
    if (prioridade[a.tipo] !== prioridade[b.tipo]) return prioridade[a.tipo] - prioridade[b.tipo];
    return b.diasEmAberto - a.diasEmAberto;
  });

  const contadores = Object.keys(TIPO_CONFIG).reduce((acc, tipo) => {
    acc[tipo] = pendencias.filter((p) => p.tipo === tipo).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            Pendências do Pátio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            OS que precisam de ação imediata · atualizado a cada 60s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards — clicáveis para filtrar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(TIPO_CONFIG) as [keyof typeof TIPO_CONFIG, typeof TIPO_CONFIG[keyof typeof TIPO_CONFIG]][]).map(([tipo, cfg]) => {
          const Icon = cfg.icon;
          const ativo = filtroTipo === tipo;
          return (
            <Card
              key={tipo}
              className={`border cursor-pointer transition-all ${cfg.border} ${ativo ? cfg.bg : "hover:bg-muted/20"}`}
              onClick={() => setFiltroTipo(ativo ? "todos" : tipo)}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                  <span className={`text-2xl font-bold ${cfg.color}`}>{contadores[tipo] ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtro + contador */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Tipo de pendência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
              <SelectItem key={tipo} value={tipo}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtroTipo !== "todos" && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFiltroTipo("todos")}>
            Limpar
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtradas.length} pendência{filtradas.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando...
        </div>
      ) : filtradas.length === 0 ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="text-4xl">✅</div>
            <p className="text-sm font-medium text-green-400">Nenhuma pendência!</p>
            <p className="text-xs text-muted-foreground">O pátio está em dia.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((p, idx) => {
            const cfg = TIPO_CONFIG[p.tipo];
            const Icon = cfg.icon;
            return (
              <Card
                key={`${p.id}-${p.tipo}-${idx}`}
                className={`border ${cfg.border} ${cfg.bg} cursor-pointer hover:opacity-90 transition-opacity`}
                onClick={() => navigate(`/admin/os/${p.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-background/50">
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{p.nomeCliente}</span>
                        <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>
                          {cfg.label}
                        </Badge>
                        {p.diasEmAberto >= 5 && (
                          <Badge variant="outline" className="text-xs text-red-400 border-red-500/40">
                            🔥 {p.diasEmAberto}d em aberto
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {p.placa} · {p.marcaModelo}
                        </span>
                        {p.mecanicoNome && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {p.mecanicoNome}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {p.diasEmAberto === 0 ? "Hoje" : `${p.diasEmAberto}d atrás`}
                        </span>
                        <Badge variant="secondary" className="text-xs">{p.status}</Badge>
                      </div>
                      {p.motivoVisita && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{p.motivoVisita}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right hidden sm:block">
                      {p.valorTotalOs > 0 && (
                        <p className="text-sm font-bold">
                          R${p.valorTotalOs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
