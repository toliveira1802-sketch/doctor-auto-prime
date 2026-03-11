/**
 * Processos do Pátio — Fluxos operacionais da oficina em Mermaid
 */
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
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
    id: "entrada",
    titulo: "Entrada do Veículo",
    descricao: "Fluxo desde a chegada do cliente até a abertura da OS",
    categoria: "Operacional",
    cor: "border-green-500/40",
    diagrama: `flowchart TD
    A([Cliente chega]) --> B{Tem agendamento?}
    B -->|Sim| C[Consultor verifica agenda]
    B -->|Não| D[Consultor faz triagem]
    C --> E[Confirma dados do veículo]
    D --> E
    E --> F[Abre OS no sistema]
    F --> G[Registra KM e placa]
    G --> H[Atribui mecânico]
    H --> I([Veículo no pátio])
    style A fill:#22c55e20,stroke:#22c55e
    style I fill:#3b82f620,stroke:#3b82f6`,
  },
  {
    id: "execucao",
    titulo: "Execução do Serviço",
    descricao: "Fluxo de trabalho do mecânico durante a execução",
    categoria: "Operacional",
    cor: "border-blue-500/40",
    diagrama: `flowchart TD
    A([OS atribuída]) --> B[Mecânico inicia diagnóstico]
    B --> C{Precisa de peças?}
    C -->|Sim| D[Solicita peças]
    C -->|Não| G[Executa serviço]
    D --> E{Peças disponíveis?}
    E -->|Sim| F[Retira do estoque]
    E -->|Não| H[Status: Aguard. Peças]
    H --> I([Aguarda chegada])
    I --> F
    F --> G
    G --> J[Atualiza status no sistema]
    J --> K{Serviço concluído?}
    K -->|Não| G
    K -->|Sim| L[Status: Pronto para Entrega]
    L --> M([Notifica consultor])
    style A fill:#3b82f620,stroke:#3b82f6
    style M fill:#22c55e20,stroke:#22c55e
    style H fill:#f59e0b20,stroke:#f59e0b`,
  },
  {
    id: "entrega",
    titulo: "Entrega e Faturamento",
    descricao: "Processo de entrega do veículo e fechamento financeiro",
    categoria: "Financeiro",
    cor: "border-amber-500/40",
    diagrama: `flowchart TD
    A([Pronto para Entrega]) --> B[Consultor contata cliente]
    B --> C{Cliente aprova?}
    C -->|Não| D[Negociação]
    D --> C
    C -->|Sim| E[Gera fatura no sistema]
    E --> F{Forma de pagamento}
    F -->|PIX| G[Confirma pagamento]
    F -->|Cartão| G
    F -->|Boleto| H[Aguarda compensação]
    H --> G
    G --> I[Status: Entregue]
    I --> J[Registra no faturamento]
    J --> K[Atualiza histórico do cliente]
    K --> L([Veículo sai do pátio])
    style A fill:#f59e0b20,stroke:#f59e0b
    style L fill:#22c55e20,stroke:#22c55e`,
  },
  {
    id: "agendamento",
    titulo: "Fluxo de Agendamento",
    descricao: "Como um agendamento vira uma OS no pátio",
    categoria: "Operacional",
    cor: "border-violet-500/40",
    diagrama: `flowchart LR
    A([Lead no Kommo]) --> B[IA qualifica lead]
    B --> C{Temperatura}
    C -->|Quente| D[Consultor agenda]
    C -->|Morno| E[Follow-up automático]
    C -->|Frio| F[Nutrir lead]
    D --> G[Agendamento criado]
    G --> H{Dia do agendamento}
    H --> I[Consultor confirma]
    I --> J[Abre OS]
    J --> K([Entra no pátio])
    style A fill:#8b5cf620,stroke:#8b5cf6
    style K fill:#22c55e20,stroke:#22c55e
    style F fill:#3b82f620,stroke:#3b82f6`,
  },
  {
    id: "pendencias",
    titulo: "Gestão de Pendências",
    descricao: "Como identificar e resolver OS com problemas",
    categoria: "Controle",
    cor: "border-red-500/40",
    diagrama: `flowchart TD
    A([OS no pátio]) --> B{Verificação diária}
    B --> C{Dias em aberto}
    C -->|>= 3 dias| D[🔴 Alerta de Atraso]
    C -->|< 3 dias| E[OK]
    B --> F{Tem mecânico?}
    F -->|Não| G[🟠 Sem Mecânico]
    B --> H{Status peças?}
    H -->|Aguardando| I[🟡 Aguard. Peças]
    B --> J{Tem orçamento?}
    J -->|Não| K[🟣 Sem Orçamento]
    D --> L[Aparece em /pendencias]
    G --> L
    I --> L
    K --> L
    L --> M[Consultor toma ação]
    M --> N([OS resolvida])
    style D fill:#ef444420,stroke:#ef4444
    style G fill:#f9731620,stroke:#f97316
    style I fill:#f59e0b20,stroke:#f59e0b
    style K fill:#8b5cf620,stroke:#8b5cf6`,
  },
];

function DiagramaCard({ processo }: { processo: typeof PROCESSOS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = `mermaid-patio-${processo.id}`;

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

export default function AdminProcessosPatio() {
  const [expandAll, setExpandAll] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");

  const categorias = ["Todos", ...Array.from(new Set(PROCESSOS.map((p) => p.categoria)))];
  const filtrados = filtroCategoria === "Todos" ? PROCESSOS : PROCESSOS.filter((p) => p.categoria === filtroCategoria);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-amber-400" />
            Processos do Pátio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fluxos operacionais da oficina — diagramas de processo
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
