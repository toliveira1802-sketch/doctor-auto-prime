import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Save, Users, Zap, ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CONSULTORES = [
  { id: "pedro", nome: "Pedro", ativo: true, carga: 12, max: 20, especialidade: "VW/Audi" },
  { id: "joao", nome: "João", ativo: true, carga: 8, max: 20, especialidade: "Geral" },
  { id: "rony", nome: "Rony", ativo: false, carga: 0, max: 15, especialidade: "Premium" },
  { id: "antonio", nome: "Antônio", ativo: true, carga: 15, max: 20, especialidade: "Geral" },
];

const REGRAS = [
  { id: "round-robin", label: "Round Robin", desc: "Distribui igualmente entre consultores ativos", ativo: false },
  { id: "menor-carga", label: "Menor Carga", desc: "Envia para o consultor com menos leads ativos", ativo: true },
  { id: "especialidade", label: "Por Especialidade", desc: "Direciona por marca/modelo do veículo", ativo: false },
  { id: "score", label: "Por Score", desc: "Leads quentes vão para consultores sênior", ativo: false },
];

export default function DistribuicaoLeads() {
  const [regras, setRegras] = useState(REGRAS);
  const [autoDistribuir, setAutoDistribuir] = useState(true);
  const [regrasAtivas, setRegrasAtivas] = useState<string[]>(["menor-carga"]);

  const toggleRegra = (id: string) => {
    setRegrasAtivas([id]); // só uma regra ativa por vez
  };

  const handleSave = () => {
    toast.success("Regras de distribuição salvas", {
      description: `Modo: ${regras.find((r) => regrasAtivas.includes(r.id))?.label} · Auto: ${autoDistribuir ? "Sim" : "Não"}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <GitBranch className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Distribuição de Leads</h1>
            <p className="text-sm text-muted-foreground">Configure como os leads são distribuídos entre consultores</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>

      {/* Toggle auto */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Distribuição Automática</p>
                <p className="text-sm text-muted-foreground">IA distribui leads automaticamente ao receber do Kommo</p>
              </div>
            </div>
            <Switch checked={autoDistribuir} onCheckedChange={setAutoDistribuir} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Regras */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Regra de Distribuição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {REGRAS.map((regra) => (
              <div
                key={regra.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${regrasAtivas.includes(regra.id) ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
                onClick={() => toggleRegra(regra.id)}
              >
                <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${regrasAtivas.includes(regra.id) ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{regra.label}</p>
                  <p className="text-xs text-muted-foreground">{regra.desc}</p>
                </div>
                {regrasAtivas.includes(regra.id) && <Badge className="text-[10px]">ATIVO</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Carga dos consultores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Carga Atual dos Consultores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CONSULTORES.map((c) => {
              const pct = Math.round((c.carga / c.max) * 100);
              const cor = pct >= 80 ? "#ef4444" : pct >= 50 ? "#f59e0b" : "#22c55e";
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.nome}</span>
                      <Badge variant="outline" className="text-[10px]">{c.especialidade}</Badge>
                      {!c.ativo && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                    </div>
                    <span className="font-mono text-xs" style={{ color: cor }}>{c.carga}/{c.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: cor }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
