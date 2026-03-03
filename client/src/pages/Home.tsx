"use client";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Car,
  CalendarClock,
  DollarSign,
  CheckCircle2,
  Plus,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  "Diagnóstico": "#6366f1",
  "Orçamento": "#06b6d4",
  "Aguardando Aprovação": "#eab308",
  "Aguardando Peças": "#f97316",
  "Em Execução": "#22c55e",
  "Pronto": "#10b981",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const today = new Date();
  const diasUteis = 22;
  const diasTrabalhados = Math.min(today.getDate(), diasUteis);
  const projecaoDiaria =
    kpis && diasTrabalhados > 0
      ? (kpis.faturamentoMes / diasTrabalhados) * diasUteis
      : 0;
  const metaPercent = kpis
    ? Math.min(100, Math.round((kpis.faturamentoMes / kpis.metaMensal) * 100))
    : 0;

  const kpiCards = [
    {
      label: "Veículos no Pátio",
      value: kpisLoading ? "—" : String(kpis?.veiculosNoPatio ?? 0),
      icon: Car,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      href: "/patio",
    },
    {
      label: "Agendamentos Hoje",
      value: kpisLoading ? "—" : String(kpis?.agendamentosHoje ?? 0),
      icon: CalendarClock,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      href: "/agenda",
    },
    {
      label: "Faturamento do Mês",
      value: kpisLoading ? "—" : formatCurrency(kpis?.faturamentoMes ?? 0),
      icon: DollarSign,
      color: "text-green-400",
      bg: "bg-green-500/10",
      href: "/financeiro",
    },
    {
      label: "Entregas no Mês",
      value: kpisLoading ? "—" : String(kpis?.entreguesMes ?? 0),
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      href: "/os",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {today.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <Button asChild>
            <Link href="/os/nova">
              <Plus className="w-4 h-4 mr-2" />
              Nova OS
            </Link>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map(({ label, value, icon: Icon, color, bg, href }) => (
            <Link key={label} href={href}>
              <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${bg}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meta do Mês */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Meta do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(kpis?.faturamentoMes ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de {formatCurrency(kpis?.metaMensal ?? 200000)}
                  </p>
                </div>
                <span
                  className={`text-2xl font-bold ${
                    metaPercent >= 100 ? "text-green-400" : "text-primary"
                  }`}
                >
                  {metaPercent}%
                </span>
              </div>
              <Progress value={metaPercent} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  Dias trabalhados: {diasTrabalhados}/{diasUteis}
                </span>
                {projecaoDiaria > 0 && (
                  <span
                    className={
                      projecaoDiaria >= (kpis?.metaMensal ?? 200000)
                        ? "text-green-400"
                        : "text-yellow-400"
                    }
                  >
                    Projeção: {formatCurrency(projecaoDiaria)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status do Pátio */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Car className="w-4 h-4 text-primary" />
                  Pátio por Status
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                  <Link href="/patio">Ver Kanban</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {kpis?.statusCounts && kpis.statusCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={kpis.statusCounts}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 10, fill: "oklch(0.60 0.01 240)" }}
                      tickFormatter={(v: string) => v.split(" ")[0]}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.01 240)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.20 0.01 240)",
                        border: "1px solid oklch(0.30 0.01 240)",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {kpis.statusCounts.map((entry) => (
                        <Cell
                          key={entry.status ?? "unknown"}
                          fill={STATUS_COLORS[entry.status ?? ""] ?? "#6366f1"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                  {kpisLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    "Nenhum veículo no pátio"
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Nova OS", href: "/os/nova", icon: Plus },
                { label: "Ver Pátio", href: "/patio", icon: Car },
                { label: "Agenda", href: "/agenda", icon: CalendarClock },
                { label: "Financeiro", href: "/financeiro", icon: DollarSign },
              ].map(({ label, href, icon: Icon }) => (
                <Button
                  key={label}
                  variant="outline"
                  className="h-16 flex-col gap-1 border-border"
                  asChild
                >
                  <Link href={href}>
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-xs">{label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
