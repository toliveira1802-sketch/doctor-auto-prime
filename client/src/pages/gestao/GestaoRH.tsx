import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserCog,
  Users,
  TrendingUp,
  Award,
  ThumbsUp,
  ThumbsDown,
  Star,
  RefreshCw,
  Wrench,
} from "lucide-react";

function calcScore(pos: number, neg: number) {
  const total = pos + neg;
  if (total === 0) return 0;
  return Math.round((pos / total) * 100);
}

const GRAU_COLORS: Record<string, string> = {
  Junior: "bg-gray-500/20 text-gray-400",
  Pleno: "bg-blue-500/20 text-blue-400",
  Senior: "bg-purple-500/20 text-purple-400",
  Especialista: "bg-yellow-500/20 text-yellow-400",
};

export default function GestaoRH() {
  const { data: mecanicosList = [], isLoading: loadingMec } = trpc.mecanicos.list.useQuery(undefined);
  const { data: colaboradores = [], isLoading: loadingColab } = trpc.colaboradores.list.useQuery(undefined);
  const { data: feedback = [], isLoading: loadingFeedback } = trpc.mecanicoFeedback.list.useQuery(undefined);
  const { data: produtividade } = trpc.dashboard.produtividade.useQuery(undefined);

  const isLoading = loadingMec || loadingColab;

  const totalMecanicos = mecanicosList.length;
  const mecAtivos = mecanicosList.filter((m) => m.ativo).length;
  const totalPositivos = mecanicosList.reduce((s, m) => s + (m.qtdePositivos ?? 0), 0);
  const totalNegativos = mecanicosList.reduce((s, m) => s + (m.qtdeNegativos ?? 0), 0);
  const scoreGeral = calcScore(totalPositivos, totalNegativos);

  const ranking = produtividade?.ranking ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <UserCog className="w-6 h-6 text-blue-400" />
          </div>
          Recursos Humanos
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Gestão de pessoas, performance e indicadores da equipe técnica.
        </p>
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
                <p className="text-3xl font-bold text-white">{totalMecanicos}</p>
                <p className="text-xs text-gray-400">Total Mecânicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Wrench className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{mecAtivos}</p>
                <p className="text-xs text-gray-400">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{scoreGeral}%</p>
                <p className="text-xs text-gray-400">Score Equipe</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Users className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{colaboradores.length}</p>
                <p className="text-xs text-gray-400">Colaboradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipe de Mecânicos */}
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-400" />
              Equipe de Mecânicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-24 text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Carregando...
              </div>
            ) : mecanicosList.length === 0 ? (
              <p className="text-gray-500 text-center py-6">Nenhum mecânico cadastrado</p>
            ) : (
              mecanicosList.map((m) => {
                const score = calcScore(m.qtdePositivos ?? 0, m.qtdeNegativos ?? 0);
                const osData = ranking.find((r) => r.id === m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#252b33] border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-blue-400 font-bold text-sm">
                          {m.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{m.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{m.especialidade || "Geral"}</span>
                          <Badge className={`text-xs ${GRAU_COLORS[m.grauConhecimento || "Pleno"] || "bg-gray-500/20 text-gray-400"}`}>
                            {m.grauConhecimento || "Pleno"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-gray-500">OS Mês</p>
                        <p className="text-white font-bold text-sm">{osData?.totalOS ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Score</p>
                        <p className={`font-bold text-sm ${score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                          {score}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400">{m.qtdePositivos ?? 0}</span>
                        <ThumbsDown className="w-3 h-3 text-red-400 ml-1" />
                        <span className="text-xs text-red-400">{m.qtdeNegativos ?? 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Ranking de Performance */}
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Ranking de Performance — Mês Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ranking.length === 0 ? (
              <p className="text-gray-500 text-center py-6">Sem dados de OS no mês</p>
            ) : (
              ranking.slice(0, 8).map((r, i) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">{r.nome}</span>
                      <span className="text-xs text-gray-400">{r.totalOS} OS</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full">
                      <div
                        className="h-2 bg-blue-500 rounded-full"
                        style={{
                          width: `${ranking[0]?.totalOS ? Math.round((r.totalOS / ranking[0].totalOS) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-400 font-medium">
                      {r.totalValor > 0
                        ? `R$ ${(r.totalValor / 1000).toFixed(1)}k`
                        : "—"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Colaboradores */}
      {colaboradores.length > 0 && (
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Equipe Administrativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {colaboradores.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#252b33] border border-gray-700"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 font-bold text-sm">
                      {c.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-gray-500">{c.cargo || "Colaborador"}</p>
                  </div>
                  <div className="ml-auto">
                    <Badge
                      className={c.ativo ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}
                    >
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
