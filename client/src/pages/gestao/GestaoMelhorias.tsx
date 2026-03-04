import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb,
  Plus,
  ThumbsUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Rocket,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_CONFIG = {
  pendente: { label: "Pendente", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Clock },
  em_analise: { label: "Em Análise", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: AlertCircle },
  aprovada: { label: "Aprovada", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: CheckCircle },
  implementada: { label: "Implementada", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Rocket },
};

const CATEGORIA_LABELS: Record<string, string> = {
  sistema: "Sistema",
  comunicacao: "Comunicação",
  integracao: "Integração",
  relatorios: "Relatórios",
  operacional: "Operacional",
  comercial: "Comercial",
  rh: "RH",
};

export default function GestaoMelhorias() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [novaMelhoria, setNovaMelhoria] = useState({
    titulo: "",
    descricao: "",
    categoria: "sistema",
  });

  const utils = trpc.useUtils();

  const { data: melhorias = [], isLoading } = trpc.melhorias.list.useQuery();

  const createMutation = trpc.melhorias.create.useMutation({
    onSuccess: () => {
      utils.melhorias.list.invalidate();
      setModalOpen(false);
      setNovaMelhoria({ titulo: "", descricao: "", categoria: "sistema" });
      toast.success("Sugestão enviada com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const voteMutation = trpc.melhorias.vote.useMutation({
    onSuccess: () => utils.melhorias.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.melhorias.updateStatus.useMutation({
    onSuccess: () => {
      utils.melhorias.list.invalidate();
      toast.success("Status atualizado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!novaMelhoria.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    createMutation.mutate({
      ...novaMelhoria,
      criadoPor: user?.name || "Equipe",
    });
  };

  const filtered = filterStatus === "todos"
    ? melhorias
    : melhorias.filter((m) => m.status === filterStatus);

  const counts = {
    todos: melhorias.length,
    pendente: melhorias.filter((m) => m.status === "pendente").length,
    em_analise: melhorias.filter((m) => m.status === "em_analise").length,
    aprovada: melhorias.filter((m) => m.status === "aprovada").length,
    implementada: melhorias.filter((m) => m.status === "implementada").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
            </div>
            Melhorias & Sugestões
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Board de ideias da equipe — vote nas melhores e acompanhe o progresso.
          </p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nova Sugestão
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1f26] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                Nova Sugestão de Melhoria
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-gray-300">Título *</Label>
                <Input
                  value={novaMelhoria.titulo}
                  onChange={(e) => setNovaMelhoria({ ...novaMelhoria, titulo: e.target.value })}
                  placeholder="Ex: Notificação WhatsApp ao mudar status da OS"
                  className="bg-[#252b33] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Descrição</Label>
                <Textarea
                  value={novaMelhoria.descricao}
                  onChange={(e) => setNovaMelhoria({ ...novaMelhoria, descricao: e.target.value })}
                  placeholder="Descreva a melhoria em detalhes..."
                  className="bg-[#252b33] border-gray-700 text-white mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-gray-300">Categoria</Label>
                <Select
                  value={novaMelhoria.categoria}
                  onValueChange={(v) => setNovaMelhoria({ ...novaMelhoria, categoria: v })}
                >
                  <SelectTrigger className="bg-[#252b33] border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#252b33] border-gray-700">
                    {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {createMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Enviar Sugestão
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="border-gray-700 text-gray-400"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "todos", label: "Todas" },
          { key: "pendente", label: "Pendentes" },
          { key: "em_analise", label: "Em Análise" },
          { key: "aprovada", label: "Aprovadas" },
          { key: "implementada", label: "Implementadas" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === key
                ? "bg-yellow-600 text-white"
                : "bg-[#1a1f26] text-gray-400 hover:text-white border border-gray-800"
            }`}
          >
            {label}
            <span className="ml-2 text-xs opacity-70">
              {counts[key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Carregando sugestões...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((melhoria) => {
            const statusCfg = STATUS_CONFIG[melhoria.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente;
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={melhoria.id} className="bg-[#1a1f26] border-gray-800 hover:border-gray-600 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-white text-sm font-medium leading-tight flex-1">
                      {melhoria.titulo}
                    </CardTitle>
                    <Badge className={`text-xs shrink-0 ${statusCfg.color}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {melhoria.descricao && (
                    <p className="text-sm text-gray-400 leading-relaxed">{melhoria.descricao}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-gray-700 text-gray-500">
                        {CATEGORIA_LABELS[melhoria.categoria || "sistema"] || melhoria.categoria}
                      </Badge>
                      {melhoria.criadoPor && (
                        <span className="text-xs text-gray-600">por {melhoria.criadoPor}</span>
                      )}
                    </div>
                    <button
                      onClick={() => voteMutation.mutate({ id: melhoria.id })}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#252b33] hover:bg-blue-500/20 hover:text-blue-400 text-gray-400 transition-colors text-sm"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span className="font-medium">{melhoria.votos || 0}</span>
                    </button>
                  </div>
                  {/* Status change (admin) */}
                  <Select
                    value={melhoria.status || "pendente"}
                    onValueChange={(v) =>
                      updateStatusMutation.mutate({
                        id: melhoria.id,
                        status: v as "pendente" | "em_analise" | "aprovada" | "implementada",
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs bg-[#252b33] border-gray-700 text-gray-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252b33] border-gray-700">
                      <SelectItem value="pendente" className="text-white text-xs">Pendente</SelectItem>
                      <SelectItem value="em_analise" className="text-white text-xs">Em Análise</SelectItem>
                      <SelectItem value="aprovada" className="text-white text-xs">Aprovada</SelectItem>
                      <SelectItem value="implementada" className="text-white text-xs">Implementada</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-500">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma sugestão encontrada</p>
              <p className="text-sm mt-1">Clique em "Nova Sugestão" para adicionar a primeira!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
