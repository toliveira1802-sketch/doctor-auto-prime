import { useState, useRef, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
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
  Database,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null | undefined) {
  if (!d) return "--";
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
  const [importStep, setImportStep] = useState<"idle" | "preview" | "importing" | "done">("idle");
  const [importResults, setImportResults] = useState<{
    total: number;
    clientesCriados: number;
    clientesExistentes: number;
    veiculosCriados: number;
    veiculosExistentes: number;
    osCriadas: number;
    osExistentes: number;
    erros: string[];
  } | null>(null);

  const utils = trpc.useUtils();

  // Overrides do banco
  const { data: overridesData, refetch: refetchOverrides } = trpc.trello.getOverrides.useQuery();
  const overridesMap = Object.fromEntries((overridesData ?? []).map((o) => [o.cardId, o]));

  // Mutation para salvar edições
  const updateCardMutation = trpc.trello.updateCard.useMutation({
    onSuccess: () => {
      refetchOverrides();
      toast.success("Campo salvo!");
    },
    onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  // Estado de edição inline: { cardId_field: value }
  const [editingCell, setEditingCell] = useState<{ cardId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback((cardId: string, field: string, currentValue: string) => {
    setEditingCell({ cardId, field });
    setEditValue(currentValue);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const commitEdit = useCallback((cardId: string, field: string) => {
    updateCardMutation.mutate({ cardId, [field]: editValue });
    setEditingCell(null);
  }, [editValue, updateCardMutation]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  // Helper: retorna valor com override aplicado
  const getVal = (cardId: string, field: string, fallback: string | null | undefined) => {
    const ov = overridesMap[cardId] as unknown as Record<string, string | null> | undefined;
    if (ov && ov[field] != null) {
      return ov[field] as string;
    }
    return fallback ?? "";
  };

  // Componente de célula editável
  const EditableCell = ({ cardId, field, value, className = "" }: { cardId: string; field: string; value: string; className?: string }) => {
    const isEditing = editingCell?.cardId === cardId && editingCell?.field === field;
    const ovRecord = overridesMap[cardId] as unknown as Record<string, string | null> | undefined;
    const hasOverride = ovRecord && ovRecord[field] != null;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1 min-w-[120px]">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit(cardId, field);
              if (e.key === "Escape") cancelEdit();
            }}
            className="h-7 text-xs bg-gray-900 border-blue-500 text-white px-2 py-1"
          />
          <button onClick={() => commitEdit(cardId, field)} className="text-green-400 hover:text-green-300">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={cancelEdit} className="text-red-400 hover:text-red-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    return (
      <div
        className={`group flex items-center gap-1 cursor-pointer hover:bg-white/5 rounded px-1 py-0.5 ${className}`}
        onClick={() => startEdit(cardId, field, value)}
        title="Clique para editar"
      >
        <span className={`text-sm ${value ? (hasOverride ? "text-yellow-300" : "text-white") : "text-gray-500"}`}>
          {value || "--"}
        </span>
        <Pencil className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    );
  };

  const importMutation = trpc.trello.importFromTrello.useMutation({
    onSuccess: (data) => {
      setImportResults(data);
      setImportStep("done");
      if (data.osCriadas > 0) {
        toast.success(`Importação concluída! ${data.osCriadas} OS criadas no sistema.`);
        utils.os.list.invalidate();
        utils.os.patio.invalidate();
        utils.dashboard.kpis.invalidate();
      } else {
        toast.info("Nenhuma OS nova para importar -- todos os cards já estão no sistema.");
      }
    },
    onError: (err) => {
      setImportStep("idle");
      toast.error(`Erro na importação: ${err.message}`);
    },
  });

  const previewMutation = trpc.trello.importFromTrello.useMutation({
    onSuccess: (data) => {
      setImportResults(data);
      setImportStep("preview");
    },
    onError: (err) => {
      setImportStep("idle");
      toast.error(`Erro ao simular importação: ${err.message}`);
    },
  });

  const handlePreviewImport = () => {
    setImportStep("importing");
    previewMutation.mutate({ incluirFevereiro, dryRun: true });
  };

  const handleConfirmImport = () => {
    setImportStep("importing");
    importMutation.mutate({ incluirFevereiro, dryRun: false });
  };

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
              <div className="border-t border-gray-700 pt-2">
                {importStep === "idle" && (
                  <Button
                    onClick={handlePreviewImport}
                    disabled={loadingCards}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Importar para o Sistema
                  </Button>
                )}
                {importStep === "importing" && (
                  <Button disabled className="w-full bg-blue-600/50 text-white">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </Button>
                )}
                {importStep === "preview" && importResults && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs space-y-1">
                      <p className="text-yellow-400 font-medium">Prévia da Importação</p>
                      <p className="text-gray-300">{importResults.total} cards → {importResults.osCriadas} OS a criar</p>
                      <p className="text-gray-300">{importResults.veiculosCriados} veículos novos / {importResults.veiculosExistentes} existentes</p>
                    </div>
                    <Button
                      onClick={handleConfirmImport}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Importação
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setImportStep("idle"); setImportResults(null); }}
                      className="w-full border-gray-600 text-gray-400"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
                {importStep === "done" && importResults && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-xs space-y-1">
                      <p className="text-green-400 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Importação Concluída!
                      </p>
                      <p className="text-gray-300">{importResults.osCriadas} OS criadas</p>
                      <p className="text-gray-300">{importResults.clientesCriados} clientes novos</p>
                      <p className="text-gray-300">{importResults.veiculosCriados} veículos novos</p>
                      {importResults.osExistentes > 0 && (
                        <p className="text-gray-500">{importResults.osExistentes} já existiam (ignorados)</p>
                      )}
                      {importResults.erros.length > 0 && (
                        <p className="text-red-400">{importResults.erros.length} erros</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => { setImportStep("idle"); setImportResults(null); }}
                      className="w-full border-gray-600 text-gray-400"
                    >
                      Nova Importação
                    </Button>
                  </div>
                )}
              </div>
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
                        <TableHead className="text-gray-400 text-xs">Placa</TableHead>
                        <TableHead className="text-gray-400 text-xs">Cliente</TableHead>
                        <TableHead className="text-gray-400 text-xs">Tel / Email</TableHead>
                        <TableHead className="text-gray-400 text-xs">Marca</TableHead>
                        <TableHead className="text-gray-400 text-xs">Modelo</TableHead>
                        <TableHead className="text-gray-400 text-xs">Mecânico</TableHead>
                        <TableHead className="text-gray-400 text-xs">Responsável</TableHead>
                        <TableHead className="text-gray-400 text-xs">Categoria</TableHead>
                        <TableHead className="text-gray-400 text-xs">Valor Aprov.</TableHead>
                        <TableHead className="text-gray-400 text-xs">Custo OS</TableHead>
                        <TableHead className="text-gray-400 text-xs">KM</TableHead>
                        <TableHead className="text-gray-400 text-xs">Entrada</TableHead>
                        <TableHead className="text-gray-400 text-xs">Previsão</TableHead>
                        <TableHead className="text-gray-400 text-xs">Diagnóstico</TableHead>
                        <TableHead className="text-gray-400 text-xs">Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cards.map((card) => (
                        <TableRow key={card.id} className="border-gray-800 hover:bg-white/5">
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="placa" value={getVal(card.id, "placa", card.placa)} className="font-mono font-bold" />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="nomeCliente" value={getVal(card.id, "nomeCliente", card.nomeCliente || card.nomeCard)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <div className="space-y-0.5">
                              <EditableCell cardId={card.id} field="telefone" value={getVal(card.id, "telefone", card.telefone)} />
                              <EditableCell cardId={card.id} field="email" value={getVal(card.id, "email", card.email)} />
                            </div>
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="marca" value={getVal(card.id, "marca", card.marca)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="modelo" value={getVal(card.id, "modelo", card.modelo)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="mecanico" value={getVal(card.id, "mecanico", card.mecanico)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="responsavel" value={getVal(card.id, "responsavel", card.responsavel)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="categoria" value={getVal(card.id, "categoria", card.categoria)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="valorAprovado" value={getVal(card.id, "valorAprovado", card.valorAprovado > 0 ? String(card.valorAprovado) : "")} />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="valorCusto" value={getVal(card.id, "valorCusto", card.valorCusto > 0 ? String(card.valorCusto) : "")} />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="km" value={getVal(card.id, "km", card.km > 0 ? String(card.km) : "")} />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="dataEntrada" value={getVal(card.id, "dataEntrada", card.dataEntrada)} />
                          </TableCell>
                          <TableCell className="p-1">
                            <EditableCell cardId={card.id} field="previsaoEntrega" value={getVal(card.id, "previsaoEntrega", card.previsaoEntrega)} />
                          </TableCell>
                          <TableCell className="p-1 max-w-[200px]">
                            <EditableCell cardId={card.id} field="diagnostico" value={getVal(card.id, "diagnostico", "")} />
                          </TableCell>
                          <TableCell className="p-1">
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
              <CardTitle className="text-white text-base">Ranking de Mecânicos -- Veículos Entregues</CardTitle>
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
                        {m.qtd > 0 ? formatCurrency(m.valor / m.qtd) : "--"} / OS
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
              <CardTitle className="text-white text-base">Mix por Marca -- Veículos Entregues</CardTitle>
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
                            : "--"}
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
