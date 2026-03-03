import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, BarChart2, Users, Wrench, DollarSign, Calendar } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function GestaoRelatorios() {
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1));
  const [ano, setAno] = useState(String(now.getFullYear()));

  const mesStr = `${ano}-${mes.padStart(2, "0")}`;
  const { data: fin } = trpc.dashboard.financeiro.useQuery({ mes: mesStr });
  const { data: prod } = trpc.dashboard.produtividade.useQuery({ mes: Number(mes), ano: Number(ano) });
  const { data: kpis } = trpc.dashboard.kpis.useQuery(undefined);

  const f = fin as any;
  const p = prod as any;
  const k = kpis as any;

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const exportReport = (tipo: string) => {
    toast.info(`Exportação de ${tipo} em desenvolvimento. Em breve disponível!`);
  };

  const reports = [
    {
      icon: DollarSign,
      title: "Relatório Financeiro",
      desc: "Faturamento, ticket médio, mix de serviços e histórico mensal",
      color: "text-green-400",
      stats: [
        { label: "Faturamento", value: fmt(f?.fatMensal ?? 0) },
        { label: "Ticket Médio", value: fmt(f?.ticketMedio ?? 0) },
        { label: "OS Entregues", value: String(f?.totalOS ?? 0) },
        { label: "% da Meta", value: `${f?.percentual ?? 0}%` },
      ],
    },
    {
      icon: Wrench,
      title: "Relatório de Produtividade",
      desc: "Ranking de mecânicos, OS por especialidade e desempenho",
      color: "text-primary",
      stats: [
        { label: "Total OS", value: String(p?.totalOsMes ?? 0) },
        { label: "Mecânicos Ativos", value: String((p?.ranking ?? []).length) },
        { label: "Líder", value: (p?.ranking?.[0]?.nome ?? "—").split(" ")[0] },
        { label: "Meta OS/Semana", value: String(p?.metaOsSemana ?? 15) },
      ],
    },
    {
      icon: BarChart2,
      title: "Relatório Operacional",
      desc: "Status do pátio, tempo médio de atendimento e gargalos",
      color: "text-blue-400",
      stats: [
        { label: "No Pátio", value: String(k?.veiculosNoPatio ?? 0) },
        { label: "Agendamentos Hoje", value: String(k?.agendamentosHoje ?? 0) },
        { label: "Entregas no Mês", value: String(k?.entregasMes ?? 0) },
        { label: "Status Ativos", value: "—" },
      ],
    },
    {
      icon: Users,
      title: "Relatório de Clientes",
      desc: "Base de clientes, retenção, novos clientes e CRM",
      color: "text-purple-400",
      stats: [
        { label: "Total Clientes", value: "—" },
        { label: "Novos no Mês", value: "—" },
        { label: "Recorrentes", value: "—" },
        { label: "NPS", value: "—" },
      ],
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Relatórios gerenciais e exportações</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((r, i) => (
          <Card key={i} className="hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted/50`}>
                    <r.icon className={`h-5 w-5 ${r.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{r.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{r.desc}</CardDescription>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => exportReport(r.title)} className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {r.stats.map((s, j) => (
                  <div key={j} className="bg-muted/30 rounded-lg p-2.5">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-sm font-bold mt-0.5">{s.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon */}
      <Card className="border-dashed border-border/50">
        <CardContent className="pt-6 pb-6 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <div className="text-sm font-medium">Exportação PDF/Excel</div>
          <div className="text-xs text-muted-foreground mt-1">
            Exportação completa de relatórios em PDF e Excel disponível em breve
          </div>
          <Badge variant="outline" className="mt-3 text-xs">Em desenvolvimento</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
