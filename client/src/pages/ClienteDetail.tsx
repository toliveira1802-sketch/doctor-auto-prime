import { useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Car, Phone, Mail, MapPin, Loader2, Plus, FileText } from "lucide-react";
import { Link } from "wouter";

const STATUS_BADGE: Record<string, string> = {
  "Diagnóstico": "bg-indigo-500/20 text-indigo-300",
  "Orçamento": "bg-cyan-500/20 text-cyan-300",
  "Aguardando Aprovação": "bg-yellow-500/20 text-yellow-300",
  "Aguardando Peças": "bg-orange-500/20 text-orange-300",
  "Em Execução": "bg-green-500/20 text-green-300",
  "Pronto": "bg-emerald-500/20 text-emerald-300",
  "Entregue": "bg-slate-500/20 text-slate-300",
  "Cancelada": "bg-red-500/20 text-red-300",
};

function formatCurrency(v: string | number | null | undefined) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}

export default function ClienteDetail() {
  const [, params] = useRoute("/crm/:id");
  const id = parseInt(params?.id ?? "0");

  const { data, isLoading } = trpc.clientes.byId.useQuery({ id }, { enabled: id > 0 });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">
          <p>Cliente não encontrado.</p>
          <Button variant="ghost" className="mt-4" asChild>
            <Link href="/crm">Voltar para CRM</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const cliente = data;
  const veiculos = data.veiculos ?? [];
  const ordens = data.os ?? [];
  const totalGasto = ordens
    .filter((o) => o.status === "Entregue" && o.valorTotalOs)
    .reduce((sum: number, o) => sum + Number(o.valorTotalOs ?? 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{cliente.nomeCompleto}</h1>
              <p className="text-sm text-muted-foreground">
                Cliente desde {cliente.createdAt ? new Date(cliente.createdAt).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/os/nova">
              <Plus className="w-4 h-4 mr-2" />
              Nova OS
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total de OS", value: ordens.length },
            { label: "Veículos", value: veiculos.length },
            { label: "Total Gasto", value: formatCurrency(totalGasto) },
          ].map(({ label, value }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact Info */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: Phone, label: "Telefone", value: cliente.telefone },
                { icon: Mail, label: "Email", value: cliente.email },
                { icon: MapPin, label: "Endereço", value: cliente.endereco },
              ].map(({ icon: Icon, label, value }) =>
                value ? (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{value}</span>
                  </div>
                ) : null
              )}
              {cliente.origemCadastro && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Origem: {cliente.origemCadastro}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicles */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                Veículos ({veiculos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {veiculos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>
              ) : (
                veiculos.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Car className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-mono font-bold text-foreground">{v.placa}</span>
                    <span className="text-xs text-muted-foreground">
                      {v.marca} {v.modelo} {v.ano && `(${v.ano})`}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* OS History */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Histórico de Ordens de Serviço ({ordens.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma OS encontrada.</p>
            ) : (
              <div className="space-y-2">
                {(ordens as any[]).map((o) => (
                  <Link key={o.id} href={`/os/${o.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{o.numeroOs ?? `#${o.id}`}</span>
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${STATUS_BADGE[o.status ?? ""] ?? ""}`}>
                            {o.status ?? "—"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {o.motivoVisita ?? "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-green-400">
                          {formatCurrency(o.valorTotalOs ?? o.totalOrcamento)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.dataEntrada ? new Date(o.dataEntrada as string).toLocaleDateString("pt-BR") : "—"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
