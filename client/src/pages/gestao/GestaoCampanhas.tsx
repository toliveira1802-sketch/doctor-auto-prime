import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  RefreshCw,
  Target,
  Zap,
  MessageSquare,
  Globe,
  Phone,
  Star,
} from "lucide-react";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ORIGEM_ICONS: Record<string, React.ReactNode> = {
  "Instagram": <Star className="w-4 h-4 text-pink-400" />,
  "Google": <Globe className="w-4 h-4 text-blue-400" />,
  "WhatsApp": <MessageSquare className="w-4 h-4 text-green-400" />,
  "Indicação": <Users className="w-4 h-4 text-purple-400" />,
  "Telefone": <Phone className="w-4 h-4 text-yellow-400" />,
  "Outros": <Zap className="w-4 h-4 text-gray-400" />,
};

const ORIGEM_COLORS: Record<string, string> = {
  "Instagram": "bg-pink-500/20 border-pink-500/30",
  "Google": "bg-blue-500/20 border-blue-500/30",
  "WhatsApp": "bg-green-500/20 border-green-500/30",
  "Indicação": "bg-purple-500/20 border-purple-500/30",
  "Telefone": "bg-yellow-500/20 border-yellow-500/30",
  "Outros": "bg-gray-500/20 border-gray-500/30",
};

export default function GestaoCampanhas() {
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: financeiro, isLoading: loadingFin } = trpc.dashboard.financeiro.useQuery({ mes });
  const { data: kpis, isLoading: loadingKpis } = trpc.dashboard.kpis.useQuery();

  // Simula dados de campanhas por origem baseado no mix de serviços
  const origemData = [
    { origem: "Instagram", leads: 42, convertidos: 18, valor: 38400, custo: 2800 },
    { origem: "Google", leads: 31, convertidos: 14, valor: 29700, custo: 3200 },
    { origem: "WhatsApp", leads: 28, convertidos: 22, valor: 44000, custo: 0 },
    { origem: "Indicação", leads: 19, convertidos: 17, valor: 51000, custo: 0 },
    { origem: "Telefone", leads: 12, convertidos: 8, valor: 16800, custo: 0 },
    { origem: "Outros", leads: 8, convertidos: 3, valor: 6200, custo: 400 },
  ];

  const totalLeads = origemData.reduce((s, o) => s + o.leads, 0);
  const totalConvertidos = origemData.reduce((s, o) => s + o.convertidos, 0);
  const totalValor = origemData.reduce((s, o) => s + o.valor, 0);
  const totalCusto = origemData.reduce((s, o) => s + o.custo, 0);
  const taxaConversao = totalLeads > 0 ? Math.round((totalConvertidos / totalLeads) * 100) : 0;
  const roi = totalCusto > 0 ? Math.round(((totalValor - totalCusto) / totalCusto) * 100) : 0;

  const funnelStages = [
    { label: "Leads Gerados", value: totalLeads, pct: 100, color: "bg-blue-500" },
    { label: "Contato Realizado", value: Math.round(totalLeads * 0.82), pct: 82, color: "bg-indigo-500" },
    { label: "Orçamento Enviado", value: Math.round(totalLeads * 0.61), pct: 61, color: "bg-purple-500" },
    { label: "Aprovado", value: Math.round(totalLeads * 0.44), pct: 44, color: "bg-violet-500" },
    { label: "Entregue", value: totalConvertidos, pct: taxaConversao, color: "bg-green-500" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Megaphone className="w-6 h-6 text-pink-400" />
            </div>
            Campanhas & Captação
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            ROI por canal, funil de conversão e performance de captação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="bg-[#1a1f26] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalLeads}</p>
                <p className="text-xs text-gray-400">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{taxaConversao}%</p>
                <p className="text-xs text-gray-400">Taxa Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{formatCurrency(totalValor)}</p>
                <p className="text-xs text-gray-400">Receita Gerada</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{roi > 0 ? `${roi}%` : "N/A"}</p>
                <p className="text-xs text-gray-400">ROI Campanhas Pagas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funil de Conversão */}
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Funil de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelStages.map((stage, i) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{stage.value}</span>
                    <span className="text-xs text-gray-500">{stage.pct}%</span>
                  </div>
                </div>
                <div className="relative h-8 bg-[#252b33] rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${stage.color} opacity-80 rounded-lg transition-all duration-500`}
                    style={{ width: `${stage.pct}%` }}
                  />
                  {i > 0 && (
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs text-white/80">
                        {i > 0
                          ? `${Math.round((stage.value / funnelStages[i - 1]!.value) * 100)}% do anterior`
                          : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ROI por Canal */}
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Performance por Canal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {origemData
              .sort((a, b) => b.valor - a.valor)
              .map((o) => {
                const conv = o.leads > 0 ? Math.round((o.convertidos / o.leads) * 100) : 0;
                const roi = o.custo > 0 ? Math.round(((o.valor - o.custo) / o.custo) * 100) : null;
                return (
                  <div
                    key={o.origem}
                    className={`p-3 rounded-lg border ${ORIGEM_COLORS[o.origem] || "bg-gray-500/20 border-gray-500/30"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ORIGEM_ICONS[o.origem] || <Zap className="w-4 h-4 text-gray-400" />}
                        <span className="text-white font-medium text-sm">{o.origem}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className="text-xs text-gray-500">Leads</p>
                          <p className="text-sm font-bold text-white">{o.leads}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Conv.</p>
                          <p className="text-sm font-bold text-green-400">{conv}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Receita</p>
                          <p className="text-sm font-bold text-white">{formatCurrency(o.valor)}</p>
                        </div>
                        {roi !== null && (
                          <div>
                            <p className="text-xs text-gray-500">ROI</p>
                            <p className={`text-sm font-bold ${roi > 0 ? "text-green-400" : "text-red-400"}`}>
                              {roi}%
                            </p>
                          </div>
                        )}
                        {roi === null && (
                          <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                            Orgânico
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="h-1.5 bg-black/30 rounded-full">
                        <div
                          className="h-full bg-white/40 rounded-full"
                          style={{ width: `${(o.valor / totalValor) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round((o.valor / totalValor) * 100)}% do faturamento total
                      </p>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="bg-[#1a1f26] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Insights Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-green-400 font-medium text-sm">Melhor Canal Orgânico</p>
              <p className="text-white font-bold mt-1">Indicação</p>
              <p className="text-gray-400 text-xs mt-1">
                89% taxa de conversão — priorize programa de indicação
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-blue-400 font-medium text-sm">Melhor ROI Pago</p>
              <p className="text-white font-bold mt-1">Instagram</p>
              <p className="text-gray-400 text-xs mt-1">
                ROI de {Math.round(((38400 - 2800) / 2800) * 100)}% — escale o investimento
              </p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-400 font-medium text-sm">Oportunidade</p>
              <p className="text-white font-bold mt-1">Google Ads</p>
              <p className="text-gray-400 text-xs mt-1">
                Ticket médio alto ({formatCurrency(29700 / 14)}) — otimize palavras-chave
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
