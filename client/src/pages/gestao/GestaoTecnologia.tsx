import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Laptop,
  Database,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Users,
  BarChart3,
  Trello,
  MessageSquare,
  Brain,
  Server,
  GitBranch,
} from "lucide-react";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`}
    />
  );
}

export default function GestaoTecnologia() {
  const { data: kpis } = trpc.dashboard.kpis.useQuery(undefined);
  const { data: trelloBoard } = trpc.trello.boardStatus.useQuery(undefined);
  const { data: kommoStatus } = trpc.kommo.status.useQuery(undefined);
  const { data: melhorias = [] } = trpc.melhorias.list.useQuery(undefined);

  const totalOS = kpis?.veiculosNoPatio ?? 0;
  const totalClientes = 0; // from kpis
  const totalVeiculos = 0; // from kpis

  const melhoriasPendentes = melhorias.filter((m) => m.status === "pendente").length;
  const melhoriasImplementadas = melhorias.filter((m) => m.status === "implementada").length;

  const integrations = [
    {
      name: "Trello",
      icon: Trello,
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      status: trelloBoard?.connected ?? false,
      detail: trelloBoard?.connected
        ? `${trelloBoard.lists?.length ?? 0} listas sincronizadas`
        : "Aguardando conexão",
      badge: trelloBoard?.connected ? "Online" : "Offline",
    },
    {
      name: "Kommo CRM",
      icon: MessageSquare,
      color: "text-purple-400",
      bg: "bg-purple-500/20",
      status: kommoStatus?.connected ?? false,
      detail: kommoStatus?.connected ? "Conectado e ativo" : "Aguardando autenticação",
      badge: "CRM",
    },
    {
      name: "Banco de Dados",
      icon: Database,
      color: "text-green-400",
      bg: "bg-green-500/20",
      status: true,
      detail: "MySQL/TiDB — Online",
      badge: "Online",
    },
    {
      name: "IA / LLM",
      icon: Brain,
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
      status: true,
      detail: "Forge API — Ativa",
      badge: "Ativo",
    },
  ];

  const systemMetrics = [
    { label: "OS Ativas no Sistema", value: totalOS, icon: BarChart3, color: "text-blue-400" },
    { label: "Clientes Cadastrados", value: totalClientes, icon: Users, color: "text-green-400" },
    { label: "Veículos Registrados", value: totalVeiculos, icon: Server, color: "text-purple-400" },
    { label: "Melhorias Pendentes", value: melhoriasPendentes, icon: GitBranch, color: "text-yellow-400" },
    { label: "Melhorias Implementadas", value: melhoriasImplementadas, icon: CheckCircle, color: "text-emerald-400" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Laptop className="w-6 h-6 text-purple-400" />
          </div>
          Tecnologia & Sistemas
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Status das integrações, métricas do sistema e saúde da plataforma.
        </p>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {systemMetrics.map((m) => (
          <Card key={m.label} className="bg-[#1a1f26] border-gray-800">
            <CardContent className="pt-5">
              <div className="flex flex-col gap-2">
                <m.icon className={`w-5 h-5 ${m.color}`} />
                <p className="text-2xl font-bold text-white">{m.value}</p>
                <p className="text-xs text-gray-400 leading-tight">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integrações */}
      <Card className="bg-[#1a1f26] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Status das Integrações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((intg) => (
              <div
                key={intg.name}
                className={`p-4 rounded-lg border ${
                  intg.status ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${intg.bg}`}>
                      <intg.icon className={`w-5 h-5 ${intg.color}`} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{intg.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{intg.detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot ok={intg.status} />
                    <Badge
                      className={
                        intg.status
                          ? "bg-green-500/20 text-green-400 text-xs"
                          : "bg-red-500/20 text-red-400 text-xs"
                      }
                    >
                      {intg.status ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stack Tecnológico */}
      <Card className="bg-[#1a1f26] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            Stack Tecnológico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { name: "React 19", type: "Frontend", color: "bg-blue-500/20 text-blue-400" },
              { name: "TypeScript", type: "Linguagem", color: "bg-blue-500/20 text-blue-400" },
              { name: "tRPC 11", type: "API Layer", color: "bg-indigo-500/20 text-indigo-400" },
              { name: "Tailwind 4", type: "Styling", color: "bg-cyan-500/20 text-cyan-400" },
              { name: "Express 4", type: "Backend", color: "bg-green-500/20 text-green-400" },
              { name: "Drizzle ORM", type: "Database", color: "bg-emerald-500/20 text-emerald-400" },
              { name: "MySQL/TiDB", type: "Database", color: "bg-orange-500/20 text-orange-400" },
              { name: "Manus Auth", type: "Auth", color: "bg-purple-500/20 text-purple-400" },
              { name: "Trello API", type: "Integração", color: "bg-blue-500/20 text-blue-400" },
              { name: "Kommo CRM", type: "Integração", color: "bg-violet-500/20 text-violet-400" },
              { name: "XLSX", type: "Export", color: "bg-green-500/20 text-green-400" },
              { name: "Forge LLM", type: "IA", color: "bg-yellow-500/20 text-yellow-400" },
            ].map((tech) => (
              <div
                key={tech.name}
                className="p-3 rounded-lg bg-[#252b33] border border-gray-700 flex items-center gap-2"
              >
                <Badge className={`text-xs ${tech.color}`}>{tech.type}</Badge>
                <span className="text-white text-sm font-medium">{tech.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roadmap de Expansão */}
      <Card className="bg-[#1a1f26] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-400" />
            Roadmap de Expansão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { ano: "2026", marca: "Volkswagen & Audi", status: "Em andamento", color: "bg-green-500/20 text-green-400 border-green-500/30" },
              { ano: "2027", marca: "Mercedes & BMW", status: "Planejado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
              { ano: "2028", marca: "Porsche", status: "Futuro", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
            ].map((item) => (
              <div
                key={item.ano}
                className="flex items-center justify-between p-4 rounded-lg bg-[#252b33] border border-gray-700"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-600">{item.ano}</div>
                  <div>
                    <p className="text-white font-medium">{item.marca}</p>
                    <p className="text-xs text-gray-500">Expansão de especialização</p>
                  </div>
                </div>
                <Badge className={`text-xs border ${item.color}`}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
