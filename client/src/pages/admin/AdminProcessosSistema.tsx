/**
 * Processos do Sistema — Arquitetura, integrações e fluxos técnicos
 */
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#c8a96e",
    primaryTextColor: "#e8e2d5",
    primaryBorderColor: "#c8a96e40",
    lineColor: "#5a5f72",
    secondaryColor: "#1e2130",
    tertiaryColor: "#0d0f14",
    background: "#06070a",
    mainBkg: "#0d0f14",
    nodeBorder: "#c8a96e40",
    clusterBkg: "#1e2130",
    titleColor: "#c8a96e",
    edgeLabelBackground: "#1e2130",
    fontFamily: "Inter, sans-serif",
  },
});

const PROCESSOS = [
  {
    id: "arquitetura",
    titulo: "Arquitetura do Sistema",
    descricao: "Visão geral das camadas: Frontend, Backend, Banco e Integrações",
    categoria: "Arquitetura",
    cor: "border-blue-500/40",
    diagrama: `flowchart TB
    subgraph Frontend["🖥 Frontend (React + Vite)"]
      UI[Páginas React]
      TRPC_C[tRPC Client]
    end
    subgraph Backend["⚙️ Backend (Express + tRPC)"]
      ROUTER[Routers tRPC]
      AUTH[Auth Middleware]
      LLM_H[LLM Helper]
      DB_H[DB Helper]
    end
    subgraph DB["🗄 Banco de Dados (MySQL)"]
      SCHEMA[Drizzle Schema]
    end
    subgraph Ext["🌐 Integrações Externas"]
      KOMMO[Kommo CRM]
      TRELLO[Trello]
      GEMINI[Gemini AI]
      WA[WhatsApp]
    end
    UI --> TRPC_C
    TRPC_C -->|HTTPS /api/trpc| ROUTER
    ROUTER --> AUTH
    ROUTER --> DB_H
    ROUTER --> LLM_H
    DB_H --> SCHEMA
    LLM_H --> GEMINI
    ROUTER --> KOMMO
    ROUTER --> TRELLO
    ROUTER --> WA`,
  },
  {
    id: "auth",
    titulo: "Fluxo de Autenticação",
    descricao: "Login local por email/senha e controle de roles",
    categoria: "Segurança",
    cor: "border-green-500/40",
    diagrama: `sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    participant DB as Banco
    U->>F: Acessa /login
    F->>B: POST auth.login (email, senha)
    B->>DB: Busca usuário por email
    DB-->>B: Retorna usuário + role
    B->>B: Verifica bcrypt hash
    B->>B: Gera JWT (role, mecanicoRefId)
    B-->>F: Set-Cookie session
    F->>F: Salva role no localStorage
    F->>F: Redireciona por role
    Note over F: consultor → /admin/dashboard
    Note over F: gestao → /gestao/os-ultimate
    Note over F: mecanico → /mecanico
    Note over F: dev → /dev/painel`,
  },
  {
    id: "ia-fluxo",
    titulo: "Fluxo dos Agentes IA",
    descricao: "Como Sophia, Simone e Raena se comunicam e delegam",
    categoria: "IA",
    cor: "border-violet-500/40",
    diagrama: `flowchart TD
    U([Mensagem do usuário]) --> SOPHIA[🤖 Sophia — Orquestradora]
    SOPHIA --> D{Tipo de tarefa}
    D -->|Operacional interno| SIMONE[🤖 Simone — Sistema]
    D -->|Atendimento cliente| RAENA[🤖 Raena — Kommo]
    SIMONE --> DB[(Banco de dados)]
    SIMONE --> OS[Consulta OS / Pátio]
    SIMONE --> REL[Gera relatórios]
    RAENA --> KOMMO[Kommo CRM]
    RAENA --> PIPE[Verifica pipeline]
    RAENA --> LEAD[Qualifica leads]
    DB --> SIMONE
    OS --> SIMONE
    REL --> SOPHIA
    KOMMO --> RAENA
    PIPE --> RAENA
    LEAD --> RAENA
    SIMONE --> SOPHIA
    RAENA --> SOPHIA
    SOPHIA --> R([Resposta consolidada])
    style SOPHIA fill:#8b5cf620,stroke:#8b5cf6
    style SIMONE fill:#3b82f620,stroke:#3b82f6
    style RAENA fill:#22c55e20,stroke:#22c55e`,
  },
  {
    id: "kommo-sync",
    titulo: "Sincronização com Kommo",
    descricao: "Como leads do Kommo chegam ao sistema e são pontuados",
    categoria: "Integração",
    cor: "border-amber-500/40",
    diagrama: `flowchart LR
    A([Novo lead no Kommo]) --> B[Webhook recebido]
    B --> C[Salva em kommo_leads]
    C --> D{Trigger de análise}
    D -->|Manual| E[Consultor aciona QG IA]
    D -->|Automático| F[Agente Ana analisa]
    E --> G[invokeLLM com contexto]
    F --> G
    G --> H[Score calculado 0-100]
    H --> I[Salva em lead_scores]
    I --> J{Tier do lead}
    J -->|S ou A| K[Notifica consultor]
    J -->|B ou C| L[Entra em nurture]
    J -->|D| M[Lead frio — arquiva]
    K --> N[Consultor distribui]
    N --> O([Lead atribuído])`,
  },
  {
    id: "trello-sync",
    titulo: "Sincronização com Trello",
    descricao: "Como OS do sistema se refletem nos cards do Trello",
    categoria: "Integração",
    cor: "border-cyan-500/40",
    diagrama: `flowchart TD
    A([OS criada no sistema]) --> B{Trello sync ativo?}
    B -->|Não| C[Apenas no banco]
    B -->|Sim| D[Cria card no Trello]
    D --> E[Preenche campos customizados]
    E --> F[mecânico + valor]
    F --> G[Card na lista correta]
    G --> H{Status muda?}
    H -->|Sim| I[Move card de lista]
    I --> J[Atualiza trello_sync_log]
    H -->|Não| K[Aguarda próxima mudança]
    J --> L{OS entregue?}
    L -->|Sim| M[Arquiva card]
    L -->|Não| H`,
  },
];

function DiagramaCard({ processo }: { processo: typeof PROCESSOS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = `mermaid-sys-${processo.id}`;

  useEffect(() => {
    if (!expanded || !ref.current) return;
    const el = ref.current;
    el.innerHTML = `<div id="${id}">${processo.diagrama}</div>`;
    mermaid.run({ nodes: [el.querySelector(`#${id}`)!] }).catch(() => {
      el.innerHTML = `<pre class="text-xs text-muted-foreground p-4 overflow-auto">${processo.diagrama}</pre>`;
    });
  }, [expanded, processo.diagrama, id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(processo.diagrama);
    setCopied(true);
    toast.success("Diagrama copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={`border ${processo.cor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{processo.categoria}</Badge>
            </div>
            <CardTitle className="text-base">{processo.titulo}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{processo.descricao}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div ref={ref} className="flex justify-center overflow-auto rounded-lg bg-muted/10 p-4 min-h-[200px]" />
        </CardContent>
      )}
    </Card>
  );
}

export default function AdminProcessosSistema() {
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const categorias = ["Todos", ...Array.from(new Set(PROCESSOS.map((p) => p.categoria)))];
  const filtrados = filtroCategoria === "Todos" ? PROCESSOS : PROCESSOS.filter((p) => p.categoria === filtroCategoria);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6 text-blue-400" />
            Processos do Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arquitetura, integrações e fluxos técnicos do Doctor Auto Prime
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {categorias.map((cat) => (
            <Button
              key={cat}
              variant={filtroCategoria === cat ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFiltroCategoria(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filtrados.map((processo) => (
          <DiagramaCard key={processo.id} processo={processo} />
        ))}
      </div>
    </div>
  );
}
