import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Car,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Trello,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return d;
}

const CATEGORIA_COLORS: Record<string, string> = {
  "Serviço Rápido (0-1 dia)": "bg-green-500/20 text-green-400",
  "Serviço Rápido Plus (1 dia)": "bg-emerald-500/20 text-emerald-400",
  "Serviço Médio (2-4 dias)": "bg-yellow-500/20 text-yellow-400",
  "Serviço Demorado (semanas+)": "bg-red-500/20 text-red-400",
  "Diagnóstico": "bg-blue-500/20 text-blue-400",
};

export default function TrelloMigracao() {
  const [incluirFevereiro, setIncluirFevereiro] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastExcelUrl, setLastExcelUrl] = useState<string | null>(null);

  const { data: boardStatus, isLoading: loadingBoard } = trpc.trello.boardStatus.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const { data: cardsData, isLoading: loadingCards, refetch: refetchCards } = trpc.trello.fetchEntregues.useQuery(
    { incluirFevereiro },
    { refetchOnWindowFocus: false }
  );

  const { data: historico } = trpc.trello.historico.useQuery();

  const gerarPlanilha = trpc.trello.gerarPlanilha.useMutation({
    onSuccess: (data) => {
      setLastExcelUrl(data.url);
      toast.success(`Planilha gerada! ${data.totalCards} cards exportados.`);
    },
    onError: (err) => {
      toast.error(`Erro ao gerar planilha: ${err.message}`);
    },
  });

  const handleGerarPlanilha = async () => {
    setIsGenerating(true);
    try {
      await gerarPlanilha.mutateAsync({ incluirFevereiro });
    } finally {
      setIsGenerating(false);
    }
  };

  const stats = cardsData?.stats;
  const cards = cardsData?.cards ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Trello className="w-6 h-6 text-blue-400" />
            </div>
            Migração Trello → Doctor Auto Prime
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Busca os cards da coluna <span className="text-white font-medium">Entregue</span> do Trello, gera planilha Excel e importa histórico para o sistema.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://trello.com/b/NkhINjF2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Trello
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCards()}
            disabled={loadingCards}
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingCards ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Board Status */}
      <Card className="bg-[#1a1f26] border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${boardStatus?.connected ? "bg-green-400" : "bg-red-400"}`} />
            Status do Board Trello
            {loadingBoard && <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {boardStatus?.connected ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {boardStatus.lists.map((list) => (
                <div
                  key={list.id}
                  className={`p-3 rounded-lg border text-center ${
                    list.name.includes("Entregue")
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-gray-700 bg-[#252b33]"
                  }`}
                >
                  <p className="text-2xl font-bold text-white">{list.totalCards}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-tight">{list.name.replace(/[🧠📝🤔😤🛠️🔩💰🙏🏻]/g, "").trim()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Não conectado ao Trello. Verifique as credenciais.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Controls */}
        <Card className="bg-[#1a1f26] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-300">Incluir Fevereiro</Label>
              <Switch
                checked={incluirFevereiro}
                onCheckedChange={(v) => {
                  setIncluirFevereiro(v);
                  setTimeout(() => refetchCards(), 100);
                }}
              />
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Coluna "Entregue": cards ativos</p>
              {incluirFevereiro && <p>• Coluna "Fevereiro": arquivo do mês</p>}
            </div>
            <div className="pt-2 space-y-2">
              <Button
                onClick={handleGerarPlanilha}
                disabled={isGenerating || loadingCards}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? "Gerando..." : "Gerar Planilha Excel"}
              </Button>
              {lastExcelUrl && (
                <a href={lastExcelUrl} download target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full border-green-600/50 text-green-400 hover:bg-green-600/10">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Última Planilha
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && (
          <>
            <Card className="bg-[#1a1f26] border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Car className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.totalOS}</p>
                    <p className="text-sm text-gray-400">Total OS Entregues</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1f26] border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalFaturamento)}</p>
                    <p className="text-sm text-gray-400">Faturamento Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1f26] border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.ticketMedio)}</p>
                    <p className="text-sm text-gray-400">Ticket Médio</p>
                    <p className="text-xs text-gray-500">Margem: {stats.margemMedia}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="cards">
        <TabsList className="bg-[#1a1f26] border border-gray-800">
          <TabsTrigger value="cards" className="data-[state=active]:bg-blue-600">
            <Car className="w-4 h-4 mr-2" />
            Cards ({cards.length})
          </TabsTrigger>
          <TabsTrigger value="mecanicos" className="data-[state=active]:bg-blue-600">
            <Users className="w-4 h-4 mr-2" />
            Ranking Mecânicos
          </TabsTrigger>
          <TabsTrigger value="marcas" className="data-[state=active]:bg-blue-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Mix por Marca
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-blue-600">
            <Clock className="w-4 h-4 mr-2" />
            Histórico Exports
          </TabsTrigger>
        </TabsList>

        {/* Cards Table */}
        <TabsContent value="cards">
          <Card className="bg-[#1a1f26] border-gray-800">
            <CardContent className="p-0">
              {loadingCards ? (
                <div className="flex items-center justify-center h-40 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Carregando cards do Trello...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-transparent">
                        <TableHead className="text-gray-400">Placa</TableHead>
                        <TableHead className="text-gray-400">Cliente</TableHead>
                        <TableHead className="text-gray-400">Marca/Modelo</TableHead>
                        <TableHead className="text-gray-400">Mecânico</TableHead>
                        <TableHead className="text-gray-400">Responsável</TableHead>
                        <TableHead className="text-gray-400">Categoria</TableHead>
                        <TableHead className="text-gray-400 text-right">Valor</TableHead>
                        <TableHead className="text-gray-400">Entrega</TableHead>
                        <TableHead className="text-gray-400">Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cards.map((card) => (
                        <TableRow key={card.id} className="border-gray-800 hover:bg-white/5">
                          <TableCell>
                            <span className="font-mono text-sm font-bold text-white bg-gray-800 px-2 py-1 rounded">
                              {card.placa || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-white text-sm font-medium">{card.nomeCliente || card.nomeCard}</p>
                              {card.telefone && (
                                <p className="text-xs text-gray-500">{card.telefone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-white text-sm">{card.marca || "—"}</p>
                              <p className="text-xs text-gray-500">{card.modelo || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-300">{card.mecanico || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-300">{card.responsavel || "—"}</span>
                          </TableCell>
                          <TableCell>
                            {card.categoria ? (
                              <span className={`text-xs px-2 py-1 rounded-full ${CATEGORIA_COLORS[card.categoria] || "bg-gray-700 text-gray-300"}`}>
                                {card.categoria.split("(")[0].trim()}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {card.valorAprovado > 0 ? (
                              <div>
                                <p className="text-green-400 font-medium text-sm">{formatCurrency(card.valorAprovado)}</p>
                                {card.margem > 0 && (
                                  <p className="text-xs text-gray-500">{card.margem}% margem</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-400">{formatDate(card.dataEntregaReal)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                card.listaOrigem === "Entregue"
                                  ? "border-blue-500/50 text-blue-400 text-xs"
                                  : "border-orange-500/50 text-orange-400 text-xs"
                              }
                            >
                              {card.listaOrigem}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {cards.length === 0 && !loadingCards && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-gray-500 py-10">
                            Nenhum card encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ranking Mecânicos */}
        <TabsContent value="mecanicos">
          <Card className="bg-[#1a1f26] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Ranking de Mecânicos — Veículos Entregues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.rankingMecanicos.map((m, i) => (
                  <div key={m.nome} className="flex items-center gap-4 p-3 rounded-lg bg-[#252b33] border border-gray-700">
                    <span className="text-2xl font-bold text-gray-500 w-8 text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium">{m.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${stats.rankingMecanicos[0]?.qtd
                                ? Math.round((m.qtd / stats.rankingMecanicos[0].qtd) * 100)
                                : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-16 text-right">{m.qtd} OS</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-medium">{formatCurrency(m.valor)}</p>
                      <p className="text-xs text-gray-500">
                        {m.qtd > 0 ? formatCurrency(m.valor / m.qtd) : "—"} / OS
                      </p>
                    </div>
                  </div>
                ))}
                {(!stats?.rankingMecanicos || stats.rankingMecanicos.length === 0) && (
                  <p className="text-center text-gray-500 py-8">Nenhum dado disponível</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mix por Marca */}
        <TabsContent value="marcas">
          <Card className="bg-[#1a1f26] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Mix por Marca — Veículos Entregues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {stats?.mixMarcas.map((m) => (
                  <div key={m.marca} className="p-4 rounded-lg bg-[#252b33] border border-gray-700 text-center">
                    <p className="text-3xl font-bold text-white">{m.qtd}</p>
                    <p className="text-sm text-gray-400 mt-1">{m.marca}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {stats.totalOS > 0 ? Math.round((m.qtd / stats.totalOS) * 100) : 0}%
                    </p>
                  </div>
                ))}
                {(!stats?.mixMarcas || stats.mixMarcas.length === 0) && (
                  <p className="col-span-4 text-center text-gray-500 py-8">Nenhum dado disponível</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico de Exports */}
        <TabsContent value="historico">
          <Card className="bg-[#1a1f26] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Histórico de Planilhas Geradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {historico?.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#252b33] border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      {log.status === "sucesso" ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <p className="text-sm text-white">
                          {log.executadoEm
                            ? new Date(log.executadoEm).toLocaleString("pt-BR")
                            : "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.totalCards} cards · {formatCurrency(Number(log.faturamentoTotal))} · Ticket {formatCurrency(Number(log.ticketMedio))}
                        </p>
                        {log.erro && <p className="text-xs text-red-400">{log.erro}</p>}
                      </div>
                    </div>
                    {log.excelUrl && (
                      <a href={log.excelUrl} download target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white">
                          <Download className="w-3 h-3 mr-1" />
                          Baixar
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
                {(!historico || historico.length === 0) && (
                  <p className="text-center text-gray-500 py-8">
                    Nenhuma planilha gerada ainda. Clique em "Gerar Planilha Excel" para começar.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
