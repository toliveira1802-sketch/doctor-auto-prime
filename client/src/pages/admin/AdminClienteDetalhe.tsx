import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Car, Phone, Mail, MapPin, Wrench, Calendar, DollarSign } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Diagnóstico": "bg-amber-500/20 text-amber-400",
  "Em Execução": "bg-orange-500/20 text-orange-400",
  "Pronto": "bg-green-500/20 text-green-400",
  "Entregue": "bg-muted text-muted-foreground",
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
  const totalGasto = ordens.filter((o: any) => o.status === "Entregue").reduce((acc: number, o: any) => acc + Number(o.valorTotalOs ?? 0), 0);
  const createdAt = cliente.createdAt ? new Date(cliente.createdAt) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clientes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{cliente.nomeCompleto}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {cliente.cpf && <span className="font-mono">{cliente.cpf}</span>}
              {createdAt && <span>Cliente desde {createdAt.toLocaleDateString("pt-BR")}</span>}
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/admin/nova-os?clienteId=${cliente.id}`)}>
          <Wrench className="h-4 w-4 mr-2" />Nova OS
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact & Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Contato</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {cliente.telefone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{cliente.telefone}</div>}
              {cliente.celular && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{cliente.celular} <Badge variant="outline" className="text-xs">WhatsApp</Badge></div>}
              {cliente.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{cliente.email}</div>}
              {cliente.endereco && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{cliente.endereco}</div>}
            </CardContent>
          </Card>

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
                  R${totalGasto > 999 ? `${(totalGasto / 1000).toFixed(1)}k` : totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-muted-foreground">Total Gasto</div>
              </CardContent>
            </Card>
          </div>

          {crm && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">CRM</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {crm.origem && <div><span className="text-muted-foreground">Origem:</span> {crm.origem}</div>}
                {crm.comoConheceu && <div><span className="text-muted-foreground">Como conheceu:</span> {crm.comoConheceu}</div>}
                {crm.indicadoPor && <div><span className="text-muted-foreground">Indicado por:</span> {crm.indicadoPor}</div>}
                {crm.observacoes && <div className="text-muted-foreground text-xs mt-2">{crm.observacoes}</div>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Vehicles & OS History */}
        <div className="lg:col-span-2 space-y-4">
          {veiculos.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4 text-primary" />Veículos ({veiculos.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {veiculos.map((v: any) => (
                    <div key={v.id} className="border rounded-lg p-3 space-y-1">
                      <div className="font-mono font-bold text-primary">{v.placa}</div>
                      <div className="font-semibold text-sm">{v.marca} {v.modelo} {v.versao}</div>
                      <div className="text-xs text-muted-foreground">{v.ano} · {v.cor} · {v.combustivel}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" />Histórico de OS ({ordens.length})</CardTitle></CardHeader>
            <CardContent>
              {ordens.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">Nenhuma OS encontrada</div>
              ) : (
                <div className="divide-y divide-border">
                  {ordens.map((o: any) => {
                    const createdAt = o.createdAt ? new Date(o.createdAt) : null;
                    return (
                      <div key={o.id} className="py-3 flex items-center justify-between cursor-pointer hover:bg-muted/20 px-2 rounded"
                        onClick={() => navigate(`/admin/os/${o.id}`)}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-primary">{o.numeroOs}</span>
                            <Badge className={`text-xs ${STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground"}`}>{o.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{o.motivoVisita ?? "—"}</div>
                          {createdAt && <div className="text-xs text-muted-foreground">{createdAt.toLocaleDateString("pt-BR")}</div>}
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
