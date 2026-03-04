import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const HORARIOS = ["08h00", "09h00", "10h00", "11h00", "ALMOÇO", "13h30", "14h30", "15h30", "16h30"];
const EXTRAS = ["EXTRA 1", "EXTRA 2", "EXTRA 3"];
const ALL_SLOTS = [...HORARIOS, ...EXTRAS];

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function AdminAgendaMecanicos() {
  const [date, setDate] = useState(() => new Date());
  const dateStr = formatDate(date);

  const { data: mecData } = trpc.mecanicos.list.useQuery();
  const { data: agData, isLoading, refetch } = trpc.agendamentos.list.useQuery({ data: dateStr });

  const mecanicos: any[] = mecData ?? [];
  const agendamentos: any[] = (agData as any) ?? [];

  // Build a map: mecanicoId -> horario -> agendamento
  const slotMap: Record<string, Record<string, any>> = {};
  mecanicos.forEach(m => { slotMap[m.id] = {}; });
  agendamentos.forEach((a: any) => {
    const hora = a.ag?.horaAgendamento ?? "";
    const mecId = a.ag?.mecanicoId ?? a.ag?.colaboradorId;
    if (mecId && hora) {
      // Match hora to slot label
      const slotLabel = hora.substring(0, 5).replace(":", "h");
      if (!slotMap[mecId]) slotMap[mecId] = {};
      slotMap[mecId][slotLabel] = a;
    }
  });

  // Próximos serviços: next 3 OS per mechanic
  const { data: osData } = trpc.os.list.useQuery({ status: "Em Execucao" });
  const osList: any[] = (osData as any)?.os ?? [];

  const nextByMecanico: Record<string, any[]> = {};
  mecanicos.forEach(m => { nextByMecanico[m.id] = []; });
  osList.forEach((item: any) => {
    const mecId = item.mecanico?.id;
    if (mecId && nextByMecanico[mecId] && nextByMecanico[mecId].length < 3) {
      nextByMecanico[mecId].push(item);
    }
  });

  const isAlmoco = (slot: string) => slot === "ALMOÇO";
  const isExtra = (slot: string) => slot.startsWith("EXTRA");

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">Agenda dos Mecânicos</h1>
            <p className="text-xs text-muted-foreground">Passe o mouse nas células para ver detalhes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDate(d => addDays(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={dateStr}
            onChange={e => setDate(new Date(e.target.value + "T12:00:00"))}
            className="text-sm border border-border rounded-md px-2 py-1 bg-background"
          />
          <Button variant="outline" size="sm" onClick={() => setDate(d => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Grade Horária */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="bg-blue-600 text-white px-4 py-2.5 text-left font-semibold min-w-[140px]">Mecânico</th>
              {HORARIOS.map(h => (
                <th key={h} className={`px-3 py-2.5 text-center font-semibold min-w-[80px] ${
                  isAlmoco(h) ? "bg-slate-500/30 text-muted-foreground" : "bg-blue-600 text-white"
                }`}>{h}</th>
              ))}
              {EXTRAS.map(e => (
                <th key={e} className="bg-orange-500 text-white px-3 py-2.5 text-center font-semibold min-w-[80px]">{e}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mecanicos.length === 0 ? (
              <tr>
                <td colSpan={ALL_SLOTS.length + 1} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Carregando..." : "Nenhum mecânico cadastrado"}
                </td>
              </tr>
            ) : (
              mecanicos.map((m, idx) => (
                <tr key={m.id} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-4 py-3 font-medium border-r border-border">{m.nome}</td>
                  {ALL_SLOTS.map(slot => {
                    const slotKey = slot.replace(":", "h").replace(" ", "");
                    const ag = slotMap[m.id]?.[slotKey];
                    if (isAlmoco(slot)) {
                      return (
                        <td key={slot} className="px-2 py-3 text-center bg-slate-500/10 border border-border/30">
                          <span className="text-muted-foreground text-xs">-</span>
                        </td>
                      );
                    }
                    return (
                      <td key={slot} className="px-2 py-3 text-center border border-border/30 group relative cursor-pointer hover:bg-primary/10 transition-colors">
                        {ag ? (
                          <div className="group relative">
                            <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-xs font-bold ${
                              isExtra(slot) ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                            }`}>
                              🚗
                            </div>
                            {/* Tooltip */}
                            <div className="absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-popover border border-border rounded-lg p-2 shadow-lg text-left">
                              <p className="font-semibold text-xs">{ag.cliente?.nome ?? "Cliente"}</p>
                              <p className="text-xs text-muted-foreground">{ag.veiculo?.placa ?? ""} · {ag.veiculo?.modelo ?? ""}</p>
                              <p className="text-xs text-primary mt-1">{ag.ag?.observacoes ?? "Sem observações"}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-lg leading-none">+</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">🚗</div>
          <span>Agendado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center text-xs">🚗</div>
          <span>Encaixe</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-slate-500/20"></div>
          <span>Almoço</span>
        </div>
        <span className="text-amber-400">⚡ Passe o mouse sobre os ícones para ver detalhes e ações</span>
      </div>

      <div className="text-xs text-muted-foreground text-right">
        Horários: 8h-16h30 · Almoço: 12h15-13h30 · 3 slots extras para encaixes
        <br />
        <span className="text-amber-400">⚡ Produtividade monitorada - Registros de tempo salvos automaticamente</span>
      </div>

      {/* Próximos Serviços */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">🚗</span>
            <h2 className="font-semibold">Próximos Serviços</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Próximos 3 serviços de cada mecânico</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600">
                {mecanicos.map(m => (
                  <th key={m.id} className="text-white px-4 py-2.5 text-center font-semibold">{m.nome}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map(rowIdx => (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  {mecanicos.map(m => {
                    const item = nextByMecanico[m.id]?.[rowIdx];
                    return (
                      <td key={m.id} className="px-4 py-3 text-center border border-border/20">
                        {item ? (
                          <div>
                            <p className="font-medium text-xs">{item.cliente?.nome ?? "Cliente"}</p>
                            <p className="text-xs text-muted-foreground">{item.veiculo?.placa ?? ""}</p>
                            <p className="text-xs text-primary">{item.os?.tipoServico ?? item.os?.status}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs italic">FALAR COM CONSULTOR</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
