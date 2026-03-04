import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle, Calendar, Loader2, Wrench
} from "lucide-react";

export default function AdminMechanicFeedback() {
  const [, setLocation] = useLocation();
  const [selectedMechanic, setSelectedMechanic] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");

  const { data: mecanicos, isLoading: loadingMec } = trpc.mecanicos.list.useQuery(undefined);
  const { data: todayFeedbacks, refetch: refetchToday } = trpc.mecanicoFeedback.listToday.useQuery(undefined);

  const addFeedback = trpc.mecanicoFeedback.add.useMutation({
    onSuccess: () => {
      refetchToday();
      setComentario("");
      toast.success("Feedback registrado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const mecList = mecanicos ?? [];
  const feedbacksHoje = todayFeedbacks ?? [];

  const getMechanicName = (id: number) =>
    mecList.find((m: any) => m.id === id)?.nome ?? "Mecânico";

  const handleFeedback = (tipo: "positivo" | "negativo") => {
    if (!selectedMechanic) return;
    addFeedback.mutate({ mecanicoId: selectedMechanic, tipo, comentario: comentario || undefined });
  };

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/mecanicos/analytics")} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ThumbsUp className="w-6 h-6 text-green-500" />
              Avaliação Diária
            </h1>
            <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{today}</span>
            </div>
          </div>
        </div>

        {loadingMec ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Selecione o Mecânico */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-400" />
                  Selecione o Mecânico
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mecList.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Nenhum mecânico cadastrado</p>
                ) : (
                  <div className="space-y-2">
                    {mecList.map((mec: any) => {
                      const jaAvaliado = feedbacksHoje.some((f: any) => f.mecanicoId === mec.id);
                      return (
                        <Button
                          key={mec.id}
                          variant={selectedMechanic === mec.id ? "default" : "outline"}
                          className={cn(
                            "w-full justify-between",
                            selectedMechanic === mec.id
                              ? "bg-red-600 hover:bg-red-700 border-red-600 text-white"
                              : "border-slate-700 text-white hover:bg-white/10"
                          )}
                          onClick={() => setSelectedMechanic(mec.id)}
                        >
                          <span>{mec.nome}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs opacity-70">{mec.especialidade ?? "Geral"}</span>
                            {jaAvaliado && <CheckCircle className="w-4 h-4 text-green-400" />}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Avaliação */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-base">Avaliação do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedMechanic ? (
                  <p className="text-slate-500 text-center py-8">Selecione um mecânico para avaliar</p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-center font-medium text-white">
                      Avaliando: <span className="text-red-400">{getMechanicName(selectedMechanic)}</span>
                    </p>
                    <Textarea
                      placeholder="Escreva o motivo do feedback (opcional)..."
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white resize-none"
                      rows={3}
                    />
                    <div className="flex gap-4">
                      <Button
                        size="lg"
                        variant="outline"
                        className="flex-1 h-20 flex-col gap-2 border-green-600 hover:bg-green-500/10 hover:border-green-500 text-white"
                        onClick={() => handleFeedback("positivo")}
                        disabled={addFeedback.isPending}
                      >
                        {addFeedback.isPending ? (
                          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                        ) : (
                          <ThumbsUp className="w-8 h-8 text-green-500" />
                        )}
                        <span className="text-green-400">Positivo</span>
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="flex-1 h-20 flex-col gap-2 border-red-600 hover:bg-red-500/10 hover:border-red-500 text-white"
                        onClick={() => handleFeedback("negativo")}
                        disabled={addFeedback.isPending}
                      >
                        {addFeedback.isPending ? (
                          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                        ) : (
                          <ThumbsDown className="w-8 h-8 text-red-500" />
                        )}
                        <span className="text-red-400">Negativo</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo do Dia */}
            <Card className="bg-slate-900/50 border-slate-800 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center justify-between">
                  <span>Resumo do Dia</span>
                  <Badge variant="outline" className="border-slate-700 text-slate-400">
                    {feedbacksHoje.length}/{mecList.length} avaliados
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Progress
                    value={mecList.length > 0 ? (feedbacksHoje.length / mecList.length) * 100 : 0}
                    className="flex-1 h-3 bg-slate-800"
                  />
                  <span className="text-white font-bold text-sm">{mecList.length > 0 ? Math.round((feedbacksHoje.length / mecList.length) * 100) : 0}%</span>
                </div>

                {feedbacksHoje.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Feedbacks de hoje:</p>
                    {feedbacksHoje.map((f: any) => (
                      <div key={f.id} className="p-3 bg-slate-800/50 rounded-lg flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">{getMechanicName(f.mecanicoId)}</span>
                            {f.tipo === "positivo" ? (
                              <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">Positivo</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">Negativo</Badge>
                            )}
                          </div>
                          {f.comentario && (
                            <p className="text-xs text-slate-400 mt-1">{f.comentario}</p>
                          )}
                        </div>
                        {f.tipo === "positivo" ? (
                          <ThumbsUp className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <ThumbsDown className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">Nenhum feedback registrado hoje ainda</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
