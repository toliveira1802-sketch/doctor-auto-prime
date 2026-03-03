import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Target, Save, DollarSign, Wrench, TrendingUp, Users } from "lucide-react";

export default function GestaoMetas() {
  const { data: metaMensal } = trpc.config.get.useQuery({ chave: "meta_mensal" });
  const { data: metaTicket } = trpc.config.get.useQuery({ chave: "meta_ticket_medio" });
  const { data: metaOs } = trpc.config.get.useQuery({ chave: "meta_os_mes" });
  const { data: metaOsSemana } = trpc.config.get.useQuery({ chave: "meta_os_semana" });
  const { data: fin } = trpc.dashboard.financeiro.useQuery(undefined);
  const { data: prod } = trpc.dashboard.produtividade.useQuery(undefined);

  const [metas, setMetas] = useState({
    meta_mensal: "",
    meta_ticket_medio: "",
    meta_os_mes: "",
    meta_os_semana: "",
  });

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
    if (metaOsSemana) setMetas(m => ({ ...m, meta_os_semana: (metaOsSemana as any)?.valor ?? "" }));
  }, [metaOsSemana]);

  const setConfig = trpc.config.set.useMutation({
    onSuccess: () => toast.success("Meta salva com sucesso!"),
    onError: (e: any) => toast.error(e.message),
  });

  const saveMeta = (chave: string, valor: string) => {
    if (!valor) return;
    setConfig.mutate({ chave, valor });
  };

  const f = fin as any;
  const p = prod as any;

  const fmt = (v: number) =>
    v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  const metaAtual = Number(metas.meta_mensal) || 200000;
  const fatAtual = f?.fatMensal ?? 0;
  const pctFat = metaAtual > 0 ? Math.round((fatAtual / metaAtual) * 100) : 0;

  const metaOsMes = Number(metas.meta_os_mes) || 100;
  const osAtual = p?.totalOsMes ?? 0;
  const pctOs = metaOsMes > 0 ? Math.round((osAtual / metaOsMes) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Metas</h1>
        <p className="text-muted-foreground text-sm">Configure e acompanhe as metas da oficina</p>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Faturamento Mensal</span>
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-2xl font-bold text-green-400">{fmt(fatAtual)}</div>
                <div className="text-xs text-muted-foreground">de {fmt(metaAtual)}</div>
              </div>
              <div className={`text-3xl font-bold ${pctFat >= 100 ? "text-green-400" : pctFat >= 70 ? "text-amber-400" : "text-red-400"}`}>
                {pctFat}%
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${pctFat >= 100 ? "bg-green-400" : pctFat >= 70 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${Math.min(pctFat, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">OS no Mês</span>
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-2xl font-bold text-primary">{osAtual}</div>
                <div className="text-xs text-muted-foreground">de {metaOsMes} OS</div>
              </div>
              <div className={`text-3xl font-bold ${pctOs >= 100 ? "text-green-400" : pctOs >= 70 ? "text-amber-400" : "text-red-400"}`}>
                {pctOs}%
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${pctOs >= 100 ? "bg-green-400" : pctOs >= 70 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${Math.min(pctOs, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meta Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Configurar Metas
          </CardTitle>
          <CardDescription>Defina as metas mensais para acompanhamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: "meta_mensal", label: "Meta de Faturamento Mensal (R$)", placeholder: "200000", icon: DollarSign },
              { key: "meta_ticket_medio", label: "Meta de Ticket Médio (R$)", placeholder: "1500", icon: TrendingUp },
              { key: "meta_os_mes", label: "Meta de OS por Mês", placeholder: "100", icon: Wrench },
              { key: "meta_os_semana", label: "Meta de OS por Semana", placeholder: "25", icon: Wrench },
            ].map(({ key, label, placeholder, icon: Icon }) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-9"
                      placeholder={placeholder}
                      value={metas[key as keyof typeof metas]}
                      onChange={e => setMetas(m => ({ ...m, [key]: e.target.value }))}
                    />
                  </div>
                  <Button size="icon" variant="outline" onClick={() => saveMeta(key, metas[key as keyof typeof metas])} disabled={setConfig.isPending}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metas por Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Metas por Consultor
          </CardTitle>
          <CardDescription>Metas individuais para cada consultor</CardDescription>
        </CardHeader>
        <CardContent>
          <MetasColaboradores />
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

  const cols = ((colaboradores as any[]) ?? []).filter((c: any) =>
    c.cargo?.toLowerCase().includes("consul") || c.cargo?.toLowerCase().includes("vend")
  );

  // Load existing metas
  const metaQueries = cols.map(c => {
    const key = `meta_colaborador_${c.id}`;
    return { id: c.id, key };
  });

  return (
    <div className="space-y-3">
      {cols.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum consultor cadastrado</p>
      ) : (
        cols.map((c: any) => {
          const key = `meta_colaborador_${c.id}`;
          return (
            <div key={c.id} className="flex items-center gap-3">
              <div className="w-36 text-sm font-medium">{c.nome}</div>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Meta mensal R$"
                  value={metas[key] ?? ""}
                  onChange={e => setMetas(m => ({ ...m, [key]: e.target.value }))}
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                const val = metas[key];
                if (val) setConfig.mutate({ chave: key, valor: val });
              }} disabled={setConfig.isPending}>
                <Save className="h-3.5 w-3.5 mr-1" />Salvar
              </Button>
            </div>
          );
        })
      )}
    </div>
  );
}
