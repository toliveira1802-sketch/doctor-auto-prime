import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Cog,
  Car,
  ClipboardList,
  CalendarClock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "Diagnóstico": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Orçamento": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Aguardando Aprovação": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Aguardando Peças": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Em Execução": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "Pronto / Aguardando Retirada": "bg-green-500/20 text-green-400 border-green-500/30",
  "Entregue": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "Cancelada": "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function GestaoOperacoes() {
  const { data: kpis, isLoading: loadingKpis } = trpc.dashboard.kpis.useQuery(undefined);
  const { data: agendamentos = [], isLoading: loadingAg } = trpc.agendamentos.list.useQuery(undefined);
  const { data: osData, isLoading: loadingOS } = trpc.os.list.useQuery({ limit: 50 });
  const osList = osData?.items ?? [];
  const { data: pendencias = [], isLoading: loadingPend } = trpc.pendencias.list.useQuery(undefined);

  const isLoading = loadingKpis || loadingOS;

  // Agrupa OS por status
  const statusCounts = kpis?.statusCounts ?? [];

  // OS em atraso (mais de 7 dias sem atualização e não entregue)
  const osAtrasadas = osList.filter((item: any) => {
    const os = item.os;
    if (os.status === "Entregue" || os.status === "Cancelada") return false;
    const updatedAt = os.updatedAt ? new Date(os.updatedAt) : null;
    if (!updatedAt) return false;
    const diasSemAtualizar = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    return diasSemAtualizar > 7;
  });

  // OS por mecânico
  const mecanicoMap = new Map<string, number>();
  osList.forEach((item: any) => {
    const os = item.os;
    if (os.status === "Entregue" || os.status === "Cancelada") return;
    const nome = item.mecanico?.nome || "Sem mecânico";
    mecanicoMap.set(nome, (mecanicoMap.get(nome) || 0) + 1);
  });
  const osPorMecanico = Array.from(mecanicoMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nome, count]) => ({ nome, count }));

  const agHoje = agendamentos.filter((a) => {
    const d = new Date(a.dataAgendamento || "");
    const hoje = new Date();
    return d.toDateString() === hoje.toDateString();
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Cog className="w-6 h-6 text-emerald-400" />
          </div>
          Operações
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Fluxo operacional, status das OS e agendamentos.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Car className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{kpis?.veiculosNoPatio ?? 0}</p>
                <p className="text-xs text-gray-400">Veículos no Pátio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CalendarClock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{kpis?.agendamentosHoje ?? 0}</p>
                <p className="text-xs text-gray-400">Agendamentos Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{kpis?.entregasMes ?? 0}</p>
                <p className="text-xs text-gray-400">Entregas no Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${osAtrasadas.length > 0 ? "bg-red-500/20" : "bg-gray-500/20"}`}>
                <AlertCircle className={`w-5 h-5 ${osAtrasadas.length > 0 ? "text-red-400" : "text-gray-400"}`} />
              </div>
              <div>
                <p className={`text-3xl font-bold ${osAtrasadas.length > 0 ? "text-red-400" : "text-white"}`}>
                  {osAtrasadas.length}
                </p>
                <p className="text-xs text-gray-400">OS em Atraso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status das OS */}
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-400" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-24 text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Carregando...
              </div>
            ) : statusCounts.length === 0 ? (
              <p className="text-gray-500 text-center py-6">Nenhuma OS ativa</p>
            ) : (
              statusCounts.map((s) => (
                <div key={s.status ?? 'unknown'} className="flex items-center justify-between p-2 rounded-lg bg-[#252b33]">
                  <Badge className={`text-xs ${s.status ? (STATUS_COLORS[s.status] || "bg-gray-500/20 text-gray-400") : "bg-gray-500/20 text-gray-400"}`}>
                    {s.status}
                  </Badge>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-700 rounded-full">
                      <div
                        className="h-2 bg-blue-500 rounded-full"
                    style={{
                      width: `${kpis?.veiculosNoPatio && kpis.veiculosNoPatio > 0 ? Math.min(Math.round((s.count / kpis.veiculosNoPatio) * 100), 100) : 0}%`,
                    }}
                      />
                    </div>
                    <span className="text-white font-bold text-sm w-6 text-right">{s.count}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* OS por Mecânico */}
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-400" />
              Carga por Mecânico (Ativas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {osPorMecanico.length === 0 ? (
              <p className="text-gray-500 text-center py-6">Sem OS ativas</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={osPorMecanico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="nome" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1f26", border: "1px solid #374151", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                    itemStyle={{ color: "#6ee7b7" }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="OS Ativas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agendamentos de Hoje */}
      {agHoje.length > 0 && (
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-green-400" />
              Agendamentos de Hoje ({agHoje.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agHoje.slice(0, 9).map((ag) => (
                <div key={ag.id} className="p-3 rounded-lg bg-[#252b33] border border-gray-700">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium text-sm">{(ag as any).nomeCliente || "Cliente"}</p>
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      {ag.horaAgendamento || "—"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{ag.motivoVisita || "Serviço não especificado"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* OS em Atraso */}
      {osAtrasadas.length > 0 && (
        <Card className="bg-[#1a1f26] border-red-800/50">
          <CardHeader>
            <CardTitle className="text-red-400 text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              OS em Atraso ({osAtrasadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {osAtrasadas.slice(0, 10).map((item: any) => {
                const os = item.os;
                const diasSem = os.updatedAt
                  ? Math.floor((Date.now() - new Date(os.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                return (
                  <div key={os.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div>
                      <p className="text-white font-medium text-sm">{os.placa || os.numeroOs}</p>
                      <p className="text-xs text-gray-500">{os.status}</p>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400 text-xs">
                      {diasSem}d sem atualização
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
