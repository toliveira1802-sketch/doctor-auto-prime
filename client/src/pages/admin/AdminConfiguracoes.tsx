import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Target, Settings, Users, DollarSign, Save } from "lucide-react";

export default function AdminConfiguracoes() {
  const { data: metaMensal, refetch: refetchMeta } = trpc.config.get.useQuery({ chave: "meta_mensal" });
  const { data: metaTicket } = trpc.config.get.useQuery({ chave: "meta_ticket_medio" });
  const { data: metaOs } = trpc.config.get.useQuery({ chave: "meta_os_mes" });
  const { data: nomeEmpresa } = trpc.config.get.useQuery({ chave: "nome_empresa" });
  const { data: whatsapp } = trpc.config.get.useQuery({ chave: "whatsapp_oficina" });

  const [metas, setMetas] = useState({ meta_mensal: "", meta_ticket_medio: "", meta_os_mes: "" });
  const [empresa, setEmpresa] = useState({ nome_empresa: "", whatsapp_oficina: "" });

  useEffect(() => {
    if (metaMensal) setMetas(m => ({ ...m, meta_mensal: (metaMensal as any)?.valor ?? "" }));
  }, [metaMensal]);
  useEffect(() => {
    if (metaTicket) setMetas(m => ({ ...m, meta_ticket_medio: (metaTicket as any)?.valor ?? "" }));
  }, [metaTicket]);
  useEffect(() => {
    if (metaOs) setMetas(m => ({ ...m, meta_os_mes: (metaOs as any)?.valor ?? "" }));
  }, [metaOs]);
  useEffect(() => {
    if (nomeEmpresa) setEmpresa(e => ({ ...e, nome_empresa: (nomeEmpresa as any)?.valor ?? "" }));
  }, [nomeEmpresa]);
  useEffect(() => {
    if (whatsapp) setEmpresa(e => ({ ...e, whatsapp_oficina: (whatsapp as any)?.valor ?? "" }));
  }, [whatsapp]);

  const setConfig = trpc.config.set.useMutation({
    onSuccess: () => { refetchMeta(); toast.success("Configuração salva!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMetas = () => {
    Object.entries(metas).forEach(([chave, valor]) => {
      if (valor) setConfig.mutate({ chave, valor });
    });
  };

  const saveEmpresa = () => {
    Object.entries(empresa).forEach(([chave, valor]) => {
      if (valor) setConfig.mutate({ chave, valor });
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie metas, dados da empresa e preferências do sistema</p>
      </div>

      {/* Metas Financeiras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Metas Financeiras
          </CardTitle>
          <CardDescription>Defina as metas mensais para acompanhamento no dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Meta de Faturamento Mensal (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  className="pl-9"
                  placeholder="200000"
                  value={metas.meta_mensal}
                  onChange={e => setMetas(m => ({ ...m, meta_mensal: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Ex: 200000 = R$ 200.000</p>
            </div>
            <div className="space-y-2">
              <Label>Meta de Ticket Médio (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  className="pl-9"
                  placeholder="1500"
                  value={metas.meta_ticket_medio}
                  onChange={e => setMetas(m => ({ ...m, meta_ticket_medio: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meta de OS por Mês</Label>
              <Input
                type="number"
                placeholder="100"
                value={metas.meta_os_mes}
                onChange={e => setMetas(m => ({ ...m, meta_os_mes: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={saveMetas} disabled={setConfig.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {setConfig.isPending ? "Salvando..." : "Salvar Metas"}
          </Button>
        </CardContent>
      </Card>

      {/* Metas por Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Metas por Consultor
          </CardTitle>
          <CardDescription>Configure metas individuais para João e Pedro</CardDescription>
        </CardHeader>
        <CardContent>
          <MetasColaboradores />
        </CardContent>
      </Card>

      {/* Dados da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-5 w-5 text-primary" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>Informações gerais da oficina</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                placeholder="Doctor Auto Prime"
                value={empresa.nome_empresa}
                onChange={e => setEmpresa(em => ({ ...em, nome_empresa: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp da Oficina</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={empresa.whatsapp_oficina}
                onChange={e => setEmpresa(em => ({ ...em, whatsapp_oficina: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={saveEmpresa} disabled={setConfig.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {setConfig.isPending ? "Salvando..." : "Salvar Dados"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MetasColaboradores() {
  const { data: colaboradores } = trpc.colaboradores.list.useQuery(undefined);
  const setConfig = trpc.config.set.useMutation({
    onSuccess: () => toast.success("Meta salva!"),
    onError: (e: any) => toast.error(e.message),
  });
  const [metas, setMetas] = useState<Record<string, string>>({});

  const cols = ((colaboradores as any[]) ?? []).filter((c: any) => c.cargo === "Consultor" || c.cargo === "Vendedor" || c.cargo === "Consultor de Vendas");

  return (
    <div className="space-y-3">
      {cols.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum consultor cadastrado</p>
      ) : (
        cols.map((c: any) => (
          <div key={c.id} className="flex items-center gap-3">
            <div className="w-32 text-sm font-medium">{c.nome}</div>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Meta mensal R$"
                value={metas[`meta_colaborador_${c.id}`] ?? ""}
                onChange={e => setMetas(m => ({ ...m, [`meta_colaborador_${c.id}`]: e.target.value }))}
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              const val = metas[`meta_colaborador_${c.id}`];
              if (val) setConfig.mutate({ chave: `meta_colaborador_${c.id}`, valor: val });
            }}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
