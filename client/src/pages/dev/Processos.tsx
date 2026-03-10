import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  GitBranch, Plus, Edit3, Download, Eye, Code2, Save,
  Trash2, ChevronRight, RefreshCw, Copy, Check
} from "lucide-react";
import { toast } from "sonner";
import mermaid from "mermaid";

// Inicializar mermaid com tema dark
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
    fontFamily: "monospace",
  },
  flowchart: { curve: "basis", padding: 20 },
});

interface Diagrama {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  codigo: string;
  updatedAt: string;
}

const DIAGRAMAS_PADRAO: Diagrama[] = [
  {
    id: "fluxo-os",
    titulo: "Fluxo de Ordem de Serviço",
    descricao: "Do agendamento à entrega do veículo",
    categoria: "Operacional",
    updatedAt: "2026-03-10",
    codigo: `flowchart TD
    A([🚗 Cliente Entra em Contato]) --> B{Canal}
    B -->|WhatsApp| C[Consultor Recebe Lead]
    B -->|Indicação| C
    B -->|Instagram| C
    C --> D[Qualificação do Lead]
    D --> E{Score de Temperatura}
    E -->|🔥 Quente ≥70| F[Agendamento Prioritário]
    E -->|🌡 Morno 40-69| G[Follow-up em 24h]
    E -->|❄ Frio <40| H[Reativação Automática]
    F --> I[Recepção do Veículo]
    G --> I
    I --> J[Abertura da OS]
    J --> K[Diagnóstico Técnico]
    K --> L{Aprovação do Cliente}
    L -->|Aprovado| M[Execução dos Serviços]
    L -->|Recusado| N[Encerramento da OS]
    M --> O[Controle de Qualidade]
    O --> P[Entrega ao Cliente]
    P --> Q[Faturamento]
    Q --> R[Atualização do CRM]
    R --> S([✅ Cliente Fidelizado])

    style A fill:#c8a96e20,stroke:#c8a96e,color:#c8a96e
    style S fill:#22c55e20,stroke:#22c55e,color:#22c55e
    style F fill:#ef444420,stroke:#ef4444,color:#ef4444
    style G fill:#f59e0b20,stroke:#f59e0b,color:#f59e0b
    style H fill:#3b82f620,stroke:#3b82f6,color:#3b82f6`,
  },
  {
    id: "fluxo-login",
    titulo: "Fluxo de Autenticação",
    descricao: "Login, primeiro acesso e controle de roles",
    categoria: "Sistema",
    updatedAt: "2026-03-10",
    codigo: `flowchart TD
    A([👤 Usuário Acessa /selecionar-perfil]) --> B{Seleciona Role}
    B -->|Dev| C[Tela Login Dev]
    B -->|Gestão| D[Tela Login Gestão]
    B -->|Consultor| E[Tela Login Consultor]
    B -->|Mecânico| F[Tela Login Mecânico]
    C & D & E & F --> G[Insere Username + Senha]
    G --> H{Autenticação}
    H -->|Credenciais Inválidas| I{3ª Tentativa?}
    I -->|Não| G
    I -->|Sim| J[Reset para 123456\nprimeiroAcesso=true]
    J --> G
    H -->|Válido| K{Primeiro Acesso?}
    K -->|Sim e não é Dev| L[/trocar-senha]
    L --> M[Nova Senha Definida]
    M --> N{Redirecionar por Role}
    K -->|Não ou é Dev| N
    N -->|Dev| O[/dev/painel]
    N -->|Gestão| P[/gestao/os-ultimate]
    N -->|Consultor| Q[/admin/patio]
    N -->|Mecânico| R[/mecanico]

    style A fill:#c8a96e20,stroke:#c8a96e,color:#c8a96e
    style J fill:#ef444420,stroke:#ef4444,color:#ef4444
    style L fill:#f59e0b20,stroke:#f59e0b,color:#f59e0b`,
  },
  {
    id: "fluxo-ia",
    titulo: "Orquestração de Agentes IA",
    descricao: "Sophia Hub — fluxo de decisão dos agentes",
    categoria: "IA",
    updatedAt: "2026-03-10",
    codigo: `flowchart LR
    A([📥 Demanda Recebida]) --> B[👑 Sophia\nOrquestradora]
    B --> C{Tipo de Demanda}
    C -->|Análise de Lead| D[🧠 Simone\nInteligência]
    C -->|Atendimento| E[💬 Ana\nAtendimento]
    C -->|Operacional| F[🔧 Sistema\nInterno]
    D --> G{Score do Lead}
    G -->|Quente| H[Notifica Consultor\nPrioritário]
    G -->|Morno/Frio| I[Agenda Follow-up\nAutomático]
    E --> J[Resposta ao Cliente\nWhatsApp/Email]
    F --> K[Atualiza CRM\nKommo]
    H & I & J & K --> L[📊 Sophia\nConsolida Resultado]
    L --> M([✅ Ciclo Completo])

    style B fill:#c8a96e20,stroke:#c8a96e,color:#c8a96e
    style D fill:#6eb5c820,stroke:#6eb5c8,color:#6eb5c8
    style E fill:#c86e9a20,stroke:#c86e9a,color:#c86e9a
    style M fill:#22c55e20,stroke:#22c55e,color:#22c55e`,
  },
  {
    id: "roadmap-marcas",
    titulo: "Roadmap de Expansão por Marcas",
    descricao: "Estratégia 2026-2028 de domínio por marca",
    categoria: "Estratégia",
    updatedAt: "2026-03-10",
    codigo: `timeline
    title Doctor Auto Prime — Roadmap de Marcas
    section 2026 — Consolidação
        VW : Autoridade total em Volkswagen
        Audi : Referência em Audi
    section 2027 — Expansão Premium
        Mercedes : Entrada no segmento Mercedes
        BMW : Certificação BMW
    section 2028 — Elite
        Porsche : Cravar bandeira na Porsche`,
  },
];

function MermaidDiagram({ codigo, id }: { codigo: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const render = async () => {
      try {
        setError(null);
        const { svg } = await mermaid.render(`mermaid-${id}-${Date.now()}`, codigo);
        if (ref.current) ref.current.innerHTML = svg;
      } catch (e: any) {
        setError(e?.message ?? "Erro ao renderizar diagrama");
      }
    };
    render();
  }, [codigo, id]);

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-mono">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="w-full overflow-auto flex items-center justify-center min-h-[200px] [&>svg]:max-w-full [&>svg]:h-auto"
    />
  );
}

export default function Processos() {
  const [diagramas, setDiagramas] = useState<Diagrama[]>(DIAGRAMAS_PADRAO);
  const [selecionado, setSelecionado] = useState<Diagrama>(DIAGRAMAS_PADRAO[0]);
  const [modo, setModo] = useState<"visualizar" | "editar">("visualizar");
  const [codigoEditando, setCodigoEditando] = useState(selecionado.codigo);
  const [copiado, setCopiado] = useState(false);

  const handleSelecionar = (d: Diagrama) => {
    setSelecionado(d);
    setCodigoEditando(d.codigo);
    setModo("visualizar");
  };

  const handleSalvar = () => {
    const atualizado = { ...selecionado, codigo: codigoEditando, updatedAt: new Date().toISOString().split("T")[0] };
    setDiagramas((prev) => prev.map((d) => (d.id === selecionado.id ? atualizado : d)));
    setSelecionado(atualizado);
    setModo("visualizar");
    toast.success("Diagrama salvo com sucesso");
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(codigoEditando);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleExportar = () => {
    const svg = document.querySelector(`[data-diagram="${selecionado.id}"] svg`);
    if (!svg) { toast.error("Renderize o diagrama antes de exportar"); return; }
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selecionado.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Diagrama exportado como SVG");
  };

  const CATEGORIAS = Array.from(new Set(diagramas.map((d) => d.categoria)));
  const CAT_COLORS: Record<string, string> = {
    Operacional: "#22c55e",
    Sistema: "#3b82f6",
    IA: "#c8a96e",
    Estratégia: "#a855f7",
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Sidebar de diagramas */}
      <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Diagramas</h2>
          <Button size="icon" variant="ghost" className="h-7 w-7">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {CATEGORIAS.map((cat) => (
          <div key={cat} className="space-y-1">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest px-1" style={{ color: CAT_COLORS[cat] ?? "#888" }}>
              {cat}
            </p>
            {diagramas.filter((d) => d.categoria === cat).map((d) => (
              <button
                key={d.id}
                onClick={() => handleSelecionar(d)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selecionado.id === d.id ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-medium">{d.titulo}</span>
                </div>
                <p className="text-[10px] mt-0.5 ml-5 opacity-60 truncate">{d.updatedAt}</p>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Área principal */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Header do diagrama */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{selecionado.titulo}</h1>
              <Badge variant="outline" className="text-[10px]" style={{ color: CAT_COLORS[selecionado.categoria] }}>
                {selecionado.categoria}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{selecionado.descricao}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={modo === "visualizar" ? "default" : "outline"}
              onClick={() => setModo("visualizar")}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </Button>
            <Button
              size="sm"
              variant={modo === "editar" ? "default" : "outline"}
              onClick={() => { setModo("editar"); setCodigoEditando(selecionado.codigo); }}
            >
              <Code2 className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportar}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              SVG
            </Button>
          </div>
        </div>

        {/* Conteúdo */}
        <Card className="flex-1 overflow-hidden">
          {modo === "visualizar" ? (
            <CardContent className="p-6 h-full overflow-auto" data-diagram={selecionado.id}>
              <MermaidDiagram codigo={selecionado.codigo} id={selecionado.id} />
            </CardContent>
          ) : (
            <CardContent className="p-0 h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <span className="text-xs font-mono text-muted-foreground">Mermaid Syntax</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCopiar}>
                    {copiado ? <Check className="h-3 w-3 mr-1 text-green-500" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiado ? "Copiado!" : "Copiar"}
                  </Button>
                  <Button size="sm" onClick={handleSalvar} className="h-7 text-xs">
                    <Save className="h-3 w-3 mr-1" />
                    Salvar
                  </Button>
                </div>
              </div>
              <Textarea
                value={codigoEditando}
                onChange={(e) => setCodigoEditando(e.target.value)}
                className="flex-1 font-mono text-xs resize-none rounded-none border-0 focus-visible:ring-0 bg-[#06070a]"
                placeholder="flowchart TD..."
              />
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
