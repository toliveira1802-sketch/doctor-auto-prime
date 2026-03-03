import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Briefcase, Phone, Mail, Calendar } from "lucide-react";

const CARGO_COLORS: Record<string, string> = {
  "Consultor": "bg-blue-500/20 text-blue-400",
  "Consultor de Vendas": "bg-blue-500/20 text-blue-400",
  "Consultor Técnico": "bg-cyan-500/20 text-cyan-400",
  "Vendedor": "bg-purple-500/20 text-purple-400",
  "Gerente": "bg-amber-500/20 text-amber-400",
  "Recepcionista": "bg-green-500/20 text-green-400",
  "Coordenador": "bg-orange-500/20 text-orange-400",
  "Coordenação Interna": "bg-orange-500/20 text-orange-400",
  "Sócio / Diretor Técnico": "bg-red-500/20 text-red-400",
  "Gestão / Administração": "bg-amber-500/20 text-amber-400",
  "Gestão / Financeiro": "bg-yellow-500/20 text-yellow-400",
};

export default function GestaoColaboradores() {
  const { data: colaboradores, isLoading } = trpc.colaboradores.list.useQuery(undefined);
  const cols: any[] = (colaboradores as any[]) ?? [];

  const ativos = cols.filter(c => c.ativo !== false);
  const consultores = cols.filter(c => c.cargo?.toLowerCase().includes("consul") || c.cargo?.toLowerCase().includes("vend"));
  const outros = cols.filter(c => !c.cargo?.toLowerCase().includes("consul") && !c.cargo?.toLowerCase().includes("vend"));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Colaboradores</h1>
        <p className="text-muted-foreground text-sm">Equipe administrativa e comercial</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Total Ativos</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{ativos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Consultores</span>
              <Briefcase className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{consultores.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Outros Cargos</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{outros.length}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cols.map((c: any) => {
            const initials = (c.nome ?? "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
            const admissao = c.dataAdmissao ? new Date(c.dataAdmissao) : null;
            return (
              <Card key={c.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{c.nome}</div>
                      <Badge className={`text-xs mt-1 ${CARGO_COLORS[c.cargo] ?? "bg-muted text-muted-foreground"}`}>
                        {c.cargo ?? "—"}
                      </Badge>
                      <div className="space-y-1 mt-2">
                        {c.telefone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{c.telefone}
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <Mail className="h-3 w-3" />{c.email}
                          </div>
                        )}
                        {admissao && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />Desde {admissao.toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </div>
                    </div>
                    {c.ativo === false && (
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
