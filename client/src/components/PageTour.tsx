import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Map, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TOUR_PAGES: { path: string; label: string; group: string }[] = [
  // Admin — Operacional
  { path: "/admin/dashboard", label: "Dashboard Admin", group: "Admin" },
  { path: "/admin/operacional", label: "Operacional", group: "Admin" },
  { path: "/admin/patio", label: "Pátio Kanban + Mapa", group: "Admin" },
  { path: "/admin/nova-os", label: "Nova OS (Wizard)", group: "Admin" },
  { path: "/admin/os", label: "Ordens de Serviço", group: "Admin" },
  { path: "/admin/os/1", label: "Detalhe OS (id=1)", group: "Admin" },
  { path: "/admin/agenda", label: "Agenda", group: "Admin" },
  { path: "/admin/agenda-mecanicos", label: "Agenda Mecânicos", group: "Admin" },
  { path: "/admin/clientes", label: "Clientes (CRM)", group: "Admin" },
  { path: "/admin/clientes/1", label: "Detalhe Cliente (id=1)", group: "Admin" },
  // Admin — Gestão
  { path: "/admin/financeiro", label: "Financeiro", group: "Admin Config" },
  { path: "/admin/produtividade", label: "Produtividade", group: "Admin Config" },
  { path: "/admin/configuracoes", label: "Configurações", group: "Admin Config" },
  { path: "/admin/usuarios", label: "Usuários", group: "Admin Config" },
  { path: "/admin/mecanicos/analytics", label: "Analytics Mecânicos", group: "Admin Config" },
  { path: "/admin/mecanicos/feedback", label: "Feedback Mecânicos", group: "Admin Config" },
  { path: "/admin/integracoes", label: "Integrações", group: "Admin Config" },
  { path: "/admin/trello-migracao", label: "Trello Migração", group: "Admin Config" },
  { path: "/admin/ia-qg", label: "QG das IAs", group: "Admin Config" },
  // Gestão
  { path: "/gestao/os-ultimate", label: "OS Ultimate", group: "Gestão" },
  { path: "/gestao/visao-geral", label: "Visão Geral", group: "Gestão" },
  { path: "/gestao/operacional", label: "Operacional", group: "Gestão" },
  { path: "/gestao/financeiro", label: "Financeiro", group: "Gestão" },
  { path: "/gestao/produtividade", label: "Produtividade", group: "Gestão" },
  { path: "/gestao/colaboradores", label: "Colaboradores", group: "Gestão" },
  { path: "/gestao/mecanicos", label: "Mecânicos", group: "Gestão" },
  { path: "/gestao/metas", label: "Metas", group: "Gestão" },
  { path: "/gestao/relatorios", label: "Relatórios", group: "Gestão" },
  { path: "/gestao/melhorias", label: "Melhorias", group: "Gestão" },
  { path: "/gestao/campanhas", label: "Campanhas", group: "Gestão" },
  { path: "/gestao/rh", label: "RH", group: "Gestão" },
  { path: "/gestao/operacoes", label: "Operações", group: "Gestão" },
  { path: "/gestao/tecnologia", label: "Tecnologia", group: "Gestão" },
  // Outros
  { path: "/selecionar-perfil", label: "Selecionar Perfil", group: "Auth" },
  { path: "/mecanico", label: "Visão Mecânico", group: "Auth" },
  { path: "/dev/painel", label: "Painel DEV", group: "Dev" },
  { path: "/dev", label: "Dev Navigator", group: "Dev" },
];

const GROUP_COLORS: Record<string, string> = {
  Admin: "text-blue-400",
  "Admin Config": "text-emerald-400",
  Gestão: "text-purple-400",
  Auth: "text-orange-400",
  Dev: "text-zinc-400",
};

export default function PageTour() {
  const [location, setLocation] = useLocation();
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Persist tour state + listen for activation event
  useEffect(() => {
    const stored = localStorage.getItem("dap_tour_active");
    if (stored === "1") setActive(true);

    const onActivate = () => {
      setActive(true);
      setMinimized(false);
    };
    window.addEventListener("dap_tour_start", onActivate);
    return () => window.removeEventListener("dap_tour_start", onActivate);
  }, []);

  const toggleTour = () => {
    const next = !active;
    setActive(next);
    setMinimized(false);
    localStorage.setItem("dap_tour_active", next ? "1" : "0");
  };

  const currentIndex = TOUR_PAGES.findIndex((p) => p.path === location);
  const currentPage = currentIndex >= 0 ? TOUR_PAGES[currentIndex] : null;

  const go = (idx: number) => {
    if (idx >= 0 && idx < TOUR_PAGES.length) {
      setLocation(TOUR_PAGES[idx].path);
    }
  };

  return (
    <>
      {/* FAB toggle button (always visible) */}
      {!active && (
        <button
          onClick={toggleTour}
          className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          title="Iniciar tour de páginas"
        >
          <Map className="h-4 w-4" />
        </button>
      )}

      {/* Tour bar */}
      {active && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          {minimized ? (
            <button
              onClick={() => setMinimized(false)}
              className="flex items-center gap-2 bg-background/95 border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground shadow-xl hover:text-foreground transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Tour ativo — expandir
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur border border-border rounded-2xl px-3 py-2 shadow-2xl">
              {/* Prev */}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-xl"
                disabled={currentIndex <= 0}
                onClick={() => go(currentIndex - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Info */}
              <div className="flex flex-col items-center min-w-[180px] px-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-widest ${
                      currentPage ? GROUP_COLORS[currentPage.group] ?? "text-zinc-400" : "text-zinc-500"
                    }`}
                  >
                    {currentPage?.group ?? "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {currentIndex >= 0 ? `${currentIndex + 1}/${TOUR_PAGES.length}` : `?/${TOUR_PAGES.length}`}
                  </span>
                </div>
                <span className="text-xs font-medium leading-tight text-center">
                  {currentPage?.label ?? location}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{location}</span>
              </div>

              {/* Next */}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-xl"
                disabled={currentIndex >= TOUR_PAGES.length - 1}
                onClick={() => go(currentIndex + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl bg-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width:
                      currentIndex >= 0
                        ? `${((currentIndex + 1) / TOUR_PAGES.length) * 100}%`
                        : "0%",
                  }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-0.5 ml-1 border-l border-border pl-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg"
                  onClick={() => setMinimized(true)}
                  title="Minimizar"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={toggleTour}
                  title="Fechar tour"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
