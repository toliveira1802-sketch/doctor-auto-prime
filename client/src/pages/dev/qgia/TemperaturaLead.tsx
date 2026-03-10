import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Thermometer, Save, Plus, Trash2, AlertTriangle, Flame, Snowflake, Minus } from "lucide-react";
import { toast } from "sonner";

interface Criterio {
  id: string;
  nome: string;
  descricao: string;
  pontos: number;
  categoria: "positivo" | "negativo";
}

const CRITERIOS_PADRAO: Criterio[] = [
  { id: "1", nome: "Respondeu mensagem em < 1h", descricao: "Lead respondeu rapidamente", pontos: 20, categoria: "positivo" },
  { id: "2", nome: "Agendou consulta", descricao: "Lead marcou horário na agenda", pontos: 30, categoria: "positivo" },
  { id: "3", nome: "Perguntou sobre preço", descricao: "Demonstrou interesse em valores", pontos: 15, categoria: "positivo" },
  { id: "4", nome: "Veículo premium (VW/Audi)", descricao: "Carro alvo do portfólio 2026", pontos: 25, categoria: "positivo" },
  { id: "5", nome: "Indicação de cliente", descricao: "Veio por recomendação", pontos: 20, categoria: "positivo" },
  { id: "6", nome: "Não respondeu em 48h", descricao: "Lead inativo por 2 dias", pontos: -25, categoria: "negativo" },
  { id: "7", nome: "Cancelou agendamento", descricao: "Desmarcou sem reagendar", pontos: -20, categoria: "negativo" },
  { id: "8", nome: "Pediu desconto excessivo", descricao: "Foco em preço, não em valor", pontos: -10, categoria: "negativo" },
];

const FAIXAS = [
  { min: 70, max: 100, label: "Quente", color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: Flame, desc: "Prioridade máxima — contato imediato" },
  { min: 40, max: 69, label: "Morno", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Thermometer, desc: "Nutrir com conteúdo e follow-up" },
  { min: 0, max: 39, label: "Frio", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: Snowflake, desc: "Reativação automática após 30 dias" },
];

export default function TemperaturaLead() {
  const [criterios, setCriterios] = useState<Criterio[]>(CRITERIOS_PADRAO);
  const [limiarQuente, setLimiarQuente] = useState(70);
  const [limiarMorno, setLimiarMorno] = useState(40);

  const handleSave = () => {
    toast.success("Configuração de temperatura salva", {
      description: `Quente ≥ ${limiarQuente} · Morno ≥ ${limiarMorno} · Frio < ${limiarMorno}`,
    });
  };

  const handleRemoveCriterio = (id: string) => {
    setCriterios((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdatePontos = (id: string, pontos: number) => {
    setCriterios((prev) => prev.map((c) => (c.id === id ? { ...c, pontos } : c)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Thermometer className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Temperatura de Lead</h1>
            <p className="text-sm text-muted-foreground">Configure os critérios de pontuação e faixas de temperatura</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configuração
        </Button>
      </div>

      {/* Faixas de temperatura */}
      <div className="grid grid-cols-3 gap-4">
        {FAIXAS.map((faixa) => {
          const Icon = faixa.icon;
          return (
            <Card key={faixa.label} style={{ borderColor: faixa.color + "40", background: faixa.bg }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5" style={{ color: faixa.color }} />
                  <span className="font-bold" style={{ color: faixa.color }}>{faixa.label}</span>
                </div>
                <p className="text-2xl font-bold mb-1">
                  {faixa.label === "Quente" ? `≥ ${limiarQuente}` : faixa.label === "Morno" ? `${limiarMorno}–${limiarQuente - 1}` : `< ${limiarMorno}`}
                  <span className="text-sm font-normal text-muted-foreground ml-1">pts</span>
                </p>
                <p className="text-xs text-muted-foreground">{faixa.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Limiares */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ajustar Limiares</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-500" />
              Limiar Quente: <span className="text-red-500 font-bold ml-1">{limiarQuente} pontos</span>
            </Label>
            <Slider value={[limiarQuente]} onValueChange={([v]) => setLimiarQuente(v)} min={50} max={90} step={5} />
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-amber-500" />
              Limiar Morno: <span className="text-amber-500 font-bold ml-1">{limiarMorno} pontos</span>
            </Label>
            <Slider value={[limiarMorno]} onValueChange={([v]) => setLimiarMorno(v)} min={10} max={60} step={5} />
          </div>
        </CardContent>
      </Card>

      {/* Critérios */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Critérios de Pontuação</CardTitle>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {criterios.map((criterio) => (
              <div
                key={criterio.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${criterio.categoria === "positivo" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  {criterio.categoria === "positivo"
                    ? <Plus className="h-4 w-4 text-green-500" />
                    : <Minus className="h-4 w-4 text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{criterio.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{criterio.descricao}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`font-mono font-bold ${criterio.pontos > 0 ? "text-green-600 border-green-500/30" : "text-red-600 border-red-500/30"}`}
                  >
                    {criterio.pontos > 0 ? "+" : ""}{criterio.pontos}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveCriterio(criterio.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
