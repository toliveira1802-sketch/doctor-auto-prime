import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ChevronLeft, ChevronRight, RefreshCw, Settings,
  DollarSign, TrendingUp, Calendar, AlertTriangle, Clock, CheckCircle, Target,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminFinanceiro() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;

  const { data, isLoading, refetch } = trpc.dashboard.financeiro.useQuery({ mes: mesStr });
  const d = data as any;

  const prevMonth = () => { if (mes === 1) { setMes(12); setAno(y => y - 1); } else setMes(m => m - 1); };
  const nextMonth = () => { if (mes === 12) { setMes(1); setAno(y => y + 1); } else setMes(m => m + 1); };

  const percentual = d?.percentual ?? 0;
  const metaMes = d?.metaMes ?? 300000;
  const fatMensal = d?.fatMensal ?? 0;
  const aprovadoPatio = d?.aprovadoPatio ?? 0;
  const mediaDiaParaAtingir = d?.mediaDiaParaAtingir ?? 0;
  const projecaoFechamento = d?.projecaoFechamento ?? 0;
  const diasRestantes = d?.diasRestantes ?? 0;
  const ticketMedio = d?.ticketMedio ?? 0;
  const saidaHoje = d?.saidaHoje ?? 0;
  const atrasadosCount = d?.atrasadosCount ?? 0;
  const atrasadosValor = d?.atrasadosValor ?? 0;
  const presosCount = d?.presosCount ?? 0;
  const presosValor = d?.presosValor ?? 0;
  const entreguesMes = d?.entreguesMes ?? 0;
  const diasPassados = Math.max(1, now.getDate());
  const mediaDia = fatMensal > 0 ? fatMensal / diasPassados : 0;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <h1 className="text-xl font-bold">Dashboard Financeiro</h1>
            <p className="text-xs text-muted-foreground">Última atualização: {new Date().toLocaleString("pt-BR")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-28 text-center">{MONTHS[mes-1]} {ano}</span>
            <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Link href="/admin/configuracoes">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Configurar Metas
            </Button>
          </Link>
          <Link href="/gestao/visao-geral">
            <Button variant="outline" size="sm">Abrir Painel de Metas</Button>
          </Link>
        </div>
      </div>

      {/* Meta Mensal Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Meta Mensal</p>
              <p className="text-xs text-muted-foreground">Acompanhamento do faturamento</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${percentual >= 100 ? "text-green-400" : percentual >= 70 ? "text-amber-400" : "text-red-400"}`}>
              {percentual.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">da meta atingida</p>
            <p className="text-xs text-muted-foreground">
              Se tudo aprovado sair: {metaMes > 0 ? (((fatMensal + aprovadoPatio) / metaMes) * 100).toFixed(1) : "0.0"}%
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-5">
          <div
            className={`h-2 rounded-full transition-all ${percentual >= 100 ? "bg-green-500" : percentual >= 70 ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${Math.min(percentual, 100)}%` }}
          />
        </div>

        {/* 4 metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
          <div className="pr-4">
            <p className="text-xs text-amber-400 font-medium">Meta Mensal</p>
            <p className="text-xl font-bold mt-1">{fmt(metaMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">Faltam {diasRestantes} dias de trabalho</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-muted-foreground font-medium">Realizado</p>
            <p className="text-xl font-bold mt-1">{fmt(fatMensal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{entreguesMes} OS entregues</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-muted-foreground font-medium">Aprovado (Pátio)</p>
            <p className="text-xl font-bold mt-1">{fmt(aprovadoPatio)}</p>
            <p className="text-xs text-muted-foreground mt-1">Em andamento</p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-amber-400 font-medium">Média/Dia p/ Atingir</p>
            <p className="text-xl font-bold mt-1 text-amber-400">{fmt(mediaDiaParaAtingir)}</p>
            <p className="text-xs text-muted-foreground mt-1">Necessário por dia</p>
          </div>
        </div>

        {/* Projeção */}
        <div className="mt-4 rounded-lg bg-violet-500/10 border border-violet-500/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-violet-400">Projeção de Fechamento</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Baseado no ritmo atual: {fmt(mediaDia)}/dia ({diasPassados} dias trabalhados) × {diasRestantes} dias restantes
            </p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${projecaoFechamento >= metaMes ? "text-green-400" : "text-violet-400"}`}>
              {fmt(projecaoFechamento)}
            </p>
            <p className="text-xs text-muted-foreground">
              {metaMes > 0 ? ((projecaoFechamento / metaMes) * 100).toFixed(1) : "0.0"}% da meta
            </p>
          </div>
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Faturado</span>
          </div>
          <p className="text-2xl font-bold">{fmt(fatMensal)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total entregue</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-blue-400 uppercase tracking-wide font-medium">Ticket Médio</span>
          </div>
          <p className="text-2xl font-bold">{fmt(ticketMedio)}</p>
          <p className="text-xs text-muted-foreground mt-1">Por veículo</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-teal-400" />
            <span className="text-xs text-teal-400 uppercase tracking-wide font-medium">Saída Hoje</span>
          </div>
          <p className="text-2xl font-bold">{fmt(saidaHoje)}</p>
          <p className="text-xs text-muted-foreground mt-1">Previsão de entrega</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-amber-400 uppercase tracking-wide font-medium">Atrasado</span>
          </div>
          <p className="text-2xl font-bold">{fmt(atrasadosValor)}</p>
          <p className="text-xs text-muted-foreground mt-1">{atrasadosCount} veículos</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-orange-400 uppercase tracking-wide font-medium">Preso</span>
          </div>
          <p className="text-2xl font-bold">{fmt(presosValor)}</p>
          <p className="text-xs text-muted-foreground mt-1">{presosCount} veículos</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-xs text-green-400 uppercase tracking-wide font-medium">Entregues</span>
          </div>
          <p className="text-2xl font-bold">{entreguesMes}</p>
          <p className="text-xs text-muted-foreground mt-1">Veículos finalizados</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Histórico */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-4">Histórico de Faturamento (6 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d?.historicoMensal ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                formatter={(v: any) => [fmt(Number(v)), "Faturamento"]}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mix de Serviços */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-4">Mix de Serviços</h2>
          <div className="space-y-2">
            {(d?.mixServicos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
            ) : (
              (d?.mixServicos ?? []).slice(0, 8).map((s: any, i: number) => {
                const total = (d?.mixServicos ?? []).reduce((acc: number, x: any) => acc + x.count, 0);
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-32 truncate">{s.tipo || "Outros"}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-mono w-16 text-right">{s.count} ({pct}%)</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Top OS */}
      {d?.topOS && d.topOS.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-3">Top OS do Mês</h2>
          <div className="divide-y divide-border">
            {d.topOS.map((os: any, i: number) => (
              <div key={os.id} className="flex items-center gap-4 py-2.5">
                <span className="text-muted-foreground text-sm w-5">{i + 1}</span>
                <Badge variant="outline" className="text-xs font-mono">{os.numeroOs ?? `#${os.id}`}</Badge>
                <span className="text-sm flex-1">{os.cliente}</span>
                <span className="text-xs text-muted-foreground font-mono">{os.placa}</span>
                <span className="text-sm font-bold text-green-400">{fmt(os.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
