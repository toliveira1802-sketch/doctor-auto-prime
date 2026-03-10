import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Flame, Thermometer, Snowflake, Search, Download, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

const HISTORICO = [
  { id: 1, lead: "Carlos Mendes", veiculo: "VW Golf GTI", score: 85, temperatura: "quente", evento: "Agendou consulta", data: "2026-03-10 09:14", delta: +30, consultor: "Pedro" },
  { id: 2, lead: "Fernanda Lima", veiculo: "Audi A3", score: 72, temperatura: "quente", evento: "Respondeu em < 1h", data: "2026-03-10 08:52", delta: +20, consultor: "João" },
  { id: 3, lead: "Roberto Souza", veiculo: "VW Jetta", score: 45, temperatura: "morno", evento: "Perguntou sobre preço", data: "2026-03-09 17:30", delta: +15, consultor: "Pedro" },
  { id: 4, lead: "Ana Paula Costa", veiculo: "Audi Q3", score: 20, temperatura: "frio", evento: "Não respondeu em 48h", data: "2026-03-09 14:00", delta: -25, consultor: "Antônio" },
  { id: 5, lead: "Marcos Oliveira", veiculo: "VW Tiguan", score: 60, temperatura: "morno", evento: "Indicação de cliente", data: "2026-03-09 11:20", delta: +20, consultor: "João" },
  { id: 6, lead: "Juliana Ferreira", veiculo: "Audi A4", score: 35, temperatura: "frio", evento: "Cancelou agendamento", data: "2026-03-08 16:45", delta: -20, consultor: "Rony" },
  { id: 7, lead: "Paulo Rodrigues", veiculo: "VW Polo", score: 90, temperatura: "quente", evento: "Veículo premium + agendou", data: "2026-03-08 10:30", delta: +55, consultor: "Pedro" },
];

const TEMP_CONFIG = {
  quente: { label: "Quente", color: "#ef4444", bg: "rgba(239,68,68,0.1)", Icon: Flame },
  morno: { label: "Morno", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", Icon: Thermometer },
  frio: { label: "Frio", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", Icon: Snowflake },
};

export default function HistoricoPontuacao() {
  const [busca, setBusca] = useState("");

  const filtrado = HISTORICO.filter(
    (h) =>
      h.lead.toLowerCase().includes(busca.toLowerCase()) ||
      h.veiculo.toLowerCase().includes(busca.toLowerCase()) ||
      h.consultor.toLowerCase().includes(busca.toLowerCase())
  );

  const totais = {
    quente: HISTORICO.filter((h) => h.temperatura === "quente").length,
    morno: HISTORICO.filter((h) => h.temperatura === "morno").length,
    frio: HISTORICO.filter((h) => h.temperatura === "frio").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Histórico de Pontuação</h1>
            <p className="text-sm text-muted-foreground">Rastreie como os scores dos leads evoluíram</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        {(["quente", "morno", "frio"] as const).map((temp) => {
          const cfg = TEMP_CONFIG[temp];
          const Icon = cfg.Icon;
          return (
            <Card key={temp} style={{ borderColor: cfg.color + "40", background: cfg.bg }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                  <span className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: cfg.color }}>{totais[temp]}</p>
                <p className="text-xs text-muted-foreground">leads nesta semana</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Eventos de Pontuação</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar lead, veículo..."
                className="pl-8 h-8 text-sm"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Lead</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Veículo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Evento</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Delta</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Score</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Temp</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Consultor</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.map((h) => {
                  const cfg = TEMP_CONFIG[h.temperatura as keyof typeof TEMP_CONFIG];
                  const Icon = cfg.Icon;
                  return (
                    <tr key={h.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{h.lead}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{h.veiculo}</td>
                      <td className="px-4 py-3 text-xs">{h.evento}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs ${h.delta > 0 ? "text-green-600" : "text-red-600"}`}>
                          {h.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {h.delta > 0 ? "+" : ""}{h.delta}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold font-mono" style={{ color: cfg.color }}>{h.score}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1"
                          style={{ borderColor: cfg.color + "50", color: cfg.color, background: cfg.bg }}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{h.consultor}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{h.data}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
