import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, BarChart3, ThumbsUp, ThumbsDown, Wrench,
  TrendingUp, Star, Award, DollarSign, ClipboardList, Loader2
} from "lucide-react";

const grauConfig: Record<string, { color: string; label: string }> = {
  "Junior":      { color: "bg-slate-500/20 text-slate-400 border-slate-500/30", label: "Junior" },
  "Pleno":       { color: "bg-blue-500/20 text-blue-400 border-blue-500/30",    label: "Pleno"  },
  "Senior":      { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Sênior" },
  "Especialista":{ color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Especialista" },
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminMechanicAnalytics() {
  const [, setLocation] = useLocation();
  const [periodo, setPeriodo] = useState("mes");

  const { data: mecanicos, isLoading: loadingMec } = trpc.mecanicos.list.useQuery(undefined);
  const { data: prodData, isLoading: loadingProd } = trpc.dashboard.produtividade.useQuery(undefined);

  const isLoading = loadingMec || loadingProd;

  // Use ranking directly from produtividade (already includes mecanico data)
  const ranking = prodData?.ranking ?? [];
  const mecList = mecanicos ?? [];
  const maxOS = Math.max(...ranking.map((r: any) => r.totalOS ?? 0), 1);
  const maxValor = Math.max(...ranking.map((r: any) => r.totalValor ?? 0), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-red-500" />
                Analytics dos Mecânicos
              </h1>
              <p className="text-slate-400 text-sm">Desempenho individual da equipe técnica</p>
            </div>
          </div>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <Wrench className="w-8 h-8 text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Mecânicos Ativos</p>
                    <p className="text-2xl font-bold text-white">{mecList.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <ClipboardList className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Total OS (mês)</p>
                    <p className="text-2xl font-bold text-white">{prodData?.totalOsMes ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Faturamento (mês)</p>
                    <p className="text-xl font-bold text-green-400">{fmt(ranking.reduce((a: number, r: any) => a + (r.totalValor ?? 0), 0))}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <Star className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Score Médio</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {mecList.length > 0
                        ? Math.round(mecList.reduce((a: number, m: any) => {
                            const pos = m.qtdePositivos ?? 0;
                            const neg = m.qtdeNegativos ?? 0;
                            const total = pos + neg;
                            return a + (total > 0 ? (pos / total) * 100 : 0);
                          }, 0) / mecList.length)
                        : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mechanic Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ranking.map((mec: any, idx: number) => {
                const totalOS = mec.totalOS ?? 0;
                const totalValor = mec.totalValor ?? 0;
                const pos = mec.positivos ?? 0;
                const neg = mec.negativos ?? 0;
                const totalFeedback = pos + neg;
                const scorePercent = totalFeedback > 0 ? Math.round((pos / totalFeedback) * 100) : 0;
                const grau = grauConfig[mec.grau ?? "Junior"] ?? grauConfig["Junior"];

                return (
                  <Card key={mec.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-500 text-xs font-mono">#{idx + 1}</span>
                            <CardTitle className="text-white text-base">{mec.nome}</CardTitle>
                          </div>
                          <p className="text-slate-400 text-xs">{mec.especialidade}</p>
                        </div>
                        <Badge variant="outline" className={cn("text-xs", grau.color)}>
                          {grau.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* OS Bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">OS Realizadas</span>
                          <span className="text-white font-bold">{totalOS}</span>
                        </div>
                        <Progress value={(totalOS / maxOS) * 100} className="h-2 bg-slate-800" />
                      </div>

                      {/* Valor Bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Valor Gerado</span>
                          <span className="text-green-400 font-bold">{fmt(totalValor)}</span>
                        </div>
                        <Progress value={(totalValor / maxValor) * 100} className="h-2 bg-slate-800" />
                      </div>

                      {/* Score */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Score de Qualidade</span>
                          <span className={cn("font-bold",
                            scorePercent >= 80 ? "text-green-400" :
                            scorePercent >= 60 ? "text-yellow-400" : "text-red-400"
                          )}>{scorePercent}%</span>
                        </div>
                        <Progress
                          value={scorePercent}
                          className={cn("h-2 bg-slate-800",
                            scorePercent >= 80 ? "[&>div]:bg-green-500" :
                            scorePercent >= 60 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                          )}
                        />
                      </div>

                      {/* Feedback Counts */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <div className="flex items-center gap-2 text-green-400">
                          <ThumbsUp className="h-4 w-4" />
                          <span className="text-sm font-medium">{pos}</span>
                          <span className="text-xs text-slate-500">positivos</span>
                        </div>
                        <div className="flex items-center gap-2 text-red-400">
                          <ThumbsDown className="h-4 w-4" />
                          <span className="text-sm font-medium">{neg}</span>
                          <span className="text-xs text-slate-500">negativos</span>
                        </div>
                      </div>

                      {/* Action */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-slate-700 text-white hover:bg-white/10 text-xs"
                        onClick={() => setLocation("/admin/mecanicos/feedback")}
                      >
                        <Award className="w-3 h-3 mr-2" />
                        Registrar Feedback
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {ranking.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum mecânico cadastrado ainda</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
