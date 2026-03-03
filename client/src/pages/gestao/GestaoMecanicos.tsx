import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Wrench, Star, ThumbsUp, ThumbsDown, Zap } from "lucide-react";

const GRAU_COLORS: Record<string, string> = {
  "Junior": "bg-blue-500/20 text-blue-400",
  "Pleno": "bg-amber-500/20 text-amber-400",
  "Senior": "bg-green-500/20 text-green-400",
  "Especialista": "bg-purple-500/20 text-purple-400",
};

const ESPEC_COLORS: Record<string, string> = {
  "Motor": "bg-red-500/20 text-red-400",
  "Elétrica": "bg-yellow-500/20 text-yellow-400",
  "Suspensão": "bg-blue-500/20 text-blue-400",
  "Transmissão": "bg-orange-500/20 text-orange-400",
  "Freios": "bg-rose-500/20 text-rose-400",
  "Geral": "bg-muted text-muted-foreground",
};

export default function GestaoMecanicos() {
  const { data: mecanicos, isLoading } = trpc.mecanicos.list.useQuery(undefined);
  const mecList: any[] = (mecanicos as any[]) ?? [];

  const ativos = mecList.filter(m => m.ativo !== false);
  const especialistas = mecList.filter(m => m.grauConhecimento === "Especialista" || m.grauConhecimento === "Senior");

  const byEspec: Record<string, number> = {};
  mecList.forEach(m => {
    const e = m.especialidade ?? "Geral";
    byEspec[e] = (byEspec[e] ?? 0) + 1;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mecânicos</h1>
        <p className="text-muted-foreground text-sm">Equipe técnica da oficina</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Total Ativos</span>
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{ativos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Sênior/Especialista</span>
              <Star className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-yellow-400">{especialistas.length}</div>
          </CardContent>
        </Card>
        {Object.entries(byEspec).slice(0, 2).map(([espec, count]) => (
          <Card key={espec}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{espec}</span>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mecList.map((m: any) => {
            const initials = (m.nome ?? "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
            const score = (m.qtdePositivos ?? 0) - (m.qtdeNegativos ?? 0);
            return (
              <Card key={m.id} className={`hover:border-primary/40 transition-colors ${m.ativo === false ? "opacity-50" : ""}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{m.nome}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge className={`text-xs ${GRAU_COLORS[m.grauConhecimento] ?? "bg-muted text-muted-foreground"}`}>
                          {m.grauConhecimento ?? "—"}
                        </Badge>
                        <Badge className={`text-xs ${ESPEC_COLORS[m.especialidade] ?? "bg-muted text-muted-foreground"}`}>
                          {m.especialidade ?? "Geral"}
                        </Badge>
                      </div>
                      {m.subEspecialidade && (
                        <div className="text-xs text-muted-foreground mt-1">{m.subEspecialidade}</div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <ThumbsUp className="h-3 w-3" />{m.qtdePositivos ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <ThumbsDown className="h-3 w-3" />{m.qtdeNegativos ?? 0}
                        </span>
                        <span className={`text-xs font-bold ${score >= 0 ? "text-green-400" : "text-red-400"}`}>
                          Score: {score >= 0 ? "+" : ""}{score}
                        </span>
                      </div>
                    </div>
                    {m.ativo === false && (
                      <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">Inativo</Badge>
                    )}
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
