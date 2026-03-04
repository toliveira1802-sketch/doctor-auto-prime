import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Car, Phone, Mail, MapPin, Wrench, Crown, Star, TrendingUp } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Diagnóstico": "bg-amber-500/20 text-amber-400",
  "Orçamento": "bg-blue-500/20 text-blue-400",
  "Aguardando Aprovação": "bg-purple-500/20 text-purple-400",
  "Aprovado": "bg-cyan-500/20 text-cyan-400",
  "Em Execução": "bg-orange-500/20 text-orange-400",
  "Aguardando Peça": "bg-red-500/20 text-red-400",
  "Pronto": "bg-green-500/20 text-green-400",
  "Entregue": "bg-muted text-muted-foreground",
  "Cancelada": "bg-destructive/20 text-destructive",
};

const NIVEL_CONFIG: Record<string, { label: string; color: string; badgeClass: string; nextLabel: string; nextMin: number; maxOs: number }> = {
  "Bronze": { label: "Bronze", color: "#cd7f32", badgeClass: "bg-amber-700/20 text-amber-500 border-amber-700/40", nextLabel: "Prata", nextMin: 3, maxOs: 3 },
  "Prata": { label: "Prata", color: "#c0c0c0", badgeClass: "bg-slate-400/20 text-slate-300 border-slate-400/40", nextLabel: "Ouro", nextMin: 8, maxOs: 8 },
  "Ouro": { label: "Ouro", color: "#ffd700", badgeClass: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", nextLabel: "VIP", nextMin: 15, maxOs: 15 },
  "VIP": { label: "VIP 👑", color: "#a855f7", badgeClass: "bg-purple-500/20 text-purple-400 border-purple-500/40", nextLabel: "", nextMin: 0, maxOs: 15 },
};

export default function AdminClienteDetalhe() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id ?? "0");

  const { data, isLoading } = trpc.clientes.byId.useQuery({ id }, { enabled: !!id });

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Cliente não encontrado</div>;

  const cliente = (data as any).cliente ?? data;
  const veiculos: any[] = (data as any).veiculos ?? [];
  const ordens: any[] = (data as any).os ?? [];
  const crm: any = (data as any).crm;

  const initials = (cliente.nomeCompleto ?? "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const totalGasto = parseFloat(String(cliente.totalGasto ?? 0)) || ordens.filter((o: any) => o.status === "Entregue").reduce((acc: number, o: any) => acc + Number(o.valorTotalOs ?? 0), 0);
  const totalOs = cliente.totalOsRealizadas ?? ordens.filter((o: any) => o.status === "Entregue").length;
  const nivel = (cliente.nivelFidelidade as string) || "Bronze";
  const nivelCfg = NIVEL_CONFIG[nivel] ?? NIVEL_CONFIG["Bronze"];
  const createdAt = cliente.createdAt ? new Date(cliente.createdAt) : null;

  // Progress to next level
  const progressPercent = nivelCfg.maxOs > 0 ? Math.min(100, Math.round((totalOs / nivelCfg.maxOs) * 100)) : 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clientes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            {nivel === "VIP" && (
              <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-0.5">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{cliente.nomeCompleto}</h1>
              <Badge className={`text-xs border ${nivelCfg.badgeClass}`}>
                {nivelCfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              {cliente.cpf && <span className="font-mono">{cliente.cpf}</span>}
              {createdAt && <span>Cliente desde {createdAt.toLocaleDateString("pt-BR")}</span>}
              {cliente.origemCadastro && <span>· {cliente.origemCadastro}</span>}
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/admin/nova-os?clienteId=${cliente.id}`)}>
          <Wrench className="h-4 w-4 mr-2" />Nova OS
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact + Loyalty + Stats */}
        <div className="space-y-4">
          {/* Loyalty Card */}
          <Card className="border-2" style={{ borderColor: `${nivelCfg.color}40` }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4" style={{ color: nivelCfg.color }} />
                Fidelidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold" style={{ color: nivelCfg.color }}>{nivelCfg.label}</span>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{totalOs} OS realizadas</div>
                  <div>R$ {totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} gastos</div>
                </div>
              </div>
              {nivel !== "VIP" && (
                <>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{totalOs}/{nivelCfg.maxOs} OS para {nivelCfg.nextLabel}</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Faltam {Math.max(0, nivelCfg.maxOs - totalOs)} OS ou R${(nivelCfg.nextMin === 3 ? 3000 : nivelCfg.nextMin === 8 ? 10000 : 20000).toLocaleString("pt-BR")} para {nivelCfg.nextLabel}
                  </p>
                </>
              )}
              {nivel === "VIP" && (
                <p className="text-xs text-purple-400">Cliente VIP — nível máximo atingido 🎉</p>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Contato</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {cliente.telefone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{cliente.telefone}</div>}
              {cliente.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{cliente.email}</div>}
              {(cliente.cidade || cliente.estado) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {[cliente.cidade, cliente.estado].filter(Boolean).join(", ")}
                </div>
              )}
              {cliente.endereco && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{cliente.endereco}</div>}
            </CardContent>
          </Card>

          {/* KPI Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold">{ordens.length}</div>
                <div className="text-xs text-muted-foreground">OS Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-green-400">
                  R${totalGasto > 999 ? `${(totalGasto / 1000).toFixed(1)}k` : totalGasto.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Gasto</div>
              </CardContent>
            </Card>
          </div>

          {/* CRM */}
          {crm && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />CRM</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {crm.origem && <div><span className="text-muted-foreground">Origem:</span> {crm.origem}</div>}
                {crm.comoConheceu && <div><span className="text-muted-foreground">Como conheceu:</span> {crm.comoConheceu}</div>}
                {crm.indicadoPor && <div><span className="text-muted-foreground">Indicado por:</span> {crm.indicadoPor}</div>}
                {crm.observacoes && <div className="text-muted-foreground text-xs mt-2">{crm.observacoes}</div>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Vehicles + OS History */}
        <div className="lg:col-span-2 space-y-4">
          {veiculos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />Veículos ({veiculos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {veiculos.map((v: any) => (
                    <div key={v.id} className="border rounded-lg p-3 space-y-1 bg-muted/20">
                      <div className="font-mono font-bold text-primary text-lg">{v.placa}</div>
                      <div className="font-semibold text-sm">{v.marca} {v.modelo}</div>
                      {v.versao && <div className="text-xs text-muted-foreground">{v.versao}</div>}
                      <div className="text-xs text-muted-foreground">
                        {[v.ano, v.combustivel, v.kmAtual ? `${v.kmAtual.toLocaleString("pt-BR")} km` : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />Histórico de OS ({ordens.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordens.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">Nenhuma OS encontrada</div>
              ) : (
                <div className="divide-y divide-border">
                  {ordens.map((o: any) => {
                    const osDate = o.createdAt ? new Date(o.createdAt) : null;
                    return (
                      <div key={o.id}
                        className="py-3 flex items-center justify-between cursor-pointer hover:bg-muted/20 px-2 rounded"
                        onClick={() => navigate(`/admin/os/${o.id}`)}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-primary">{o.numeroOs}</span>
                            <Badge className={`text-xs ${STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground"}`}>{o.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{o.motivoVisita ?? "—"}</div>
                          {osDate && <div className="text-xs text-muted-foreground">{osDate.toLocaleDateString("pt-BR")}</div>}
                        </div>
                        {(o.valorTotalOs ?? 0) > 0 && (
                          <span className="text-sm font-semibold text-green-400">
                            R$ {Number(o.valorTotalOs).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
