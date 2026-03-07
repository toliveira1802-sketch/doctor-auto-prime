import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Car,
  ClipboardList,
  CalendarClock,
  Users,
  DollarSign,
  BarChart3,
  Plus,
  Wrench,
  Settings,
  TrendingUp,
  Target,
  FileText,
  Code2,
  ThumbsUp,
  Zap,
  Trello,
  Lightbulb,
  Megaphone,
  UserCog,
  Cog,
  Laptop,
  FolderOpen,
  ChevronRight,
  Monitor,
  Activity,
  Brain,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";

// Mapeamento de itens visíveis por perfil
// consultor = João Paulo, Pedro (operacional apenas)
// gestor = Sophia Duarte (operacional + gestão)
// admin = Thales Oliveira (tudo: operacional + gestão + dev)
const PERFIL_ACESSO: Record<string, string[]> = {
  // POMBAL — operacional (consultor, gestor, admin)
  "/admin/dashboard": ["consultor", "gestor", "admin"],
  "/admin/patio": ["consultor", "gestor", "admin"],
  "/admin/os": ["consultor", "gestor", "admin"],
  "/admin/agenda": ["consultor", "gestor", "admin"],
  "/admin/clientes": ["consultor", "gestor", "admin"],
  "/admin/financeiro": ["gestor", "admin"],
  "/admin/produtividade": ["gestor", "admin"],
  "/admin/mecanicos/analytics": ["gestor", "admin"],
  "/admin/mecanicos/feedback": ["consultor", "gestor", "admin"],
  "/admin/configuracoes": ["admin"],
  "/admin/integracoes": ["admin"],
  "/admin/trello-migracao": ["admin"],
  "/admin/usuarios": ["admin"],
  "/admin/agenda-mecanicos": ["consultor", "gestor", "admin"],
  "/admin/operacional": ["consultor", "gestor", "admin"],
  "/admin/ia-qg": ["gestor", "admin"],
  // GESTÃO — estratégico (gestor, admin)
  "/gestao/os-ultimate": ["gestor", "admin"],
  "/gestao/visao-geral": ["gestor", "admin"],
  "/gestao/operacional": ["gestor", "admin"],
  "/gestao/financeiro": ["gestor", "admin"],
  "/gestao/produtividade": ["gestor", "admin"],
  "/gestao/colaboradores": ["gestor", "admin"],
  "/gestao/mecanicos": ["gestor", "admin"],
  "/gestao/metas": ["gestor", "admin"],
  "/gestao/relatorios": ["gestor", "admin"],
  "/gestao/melhorias": ["consultor", "gestor", "admin"],
  "/gestao/campanhas": ["gestor", "admin"],
  "/gestao/rh": ["gestor", "admin"],
  "/gestao/operacoes": ["gestor", "admin"],
  "/gestao/tecnologia": ["gestor", "admin"],
  // Dev — apenas admin (Thales)
  "/dev": ["admin"],
};

// Estrutura de menu com suporte a submenus
type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  children?: MenuItem[];
};

type MenuGroup = {
  group: string;
  items: MenuItem[];
};

const menuItems: MenuGroup[] = [
  {
    group: "POMBAL",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
      { icon: Activity, label: "Visão Geral", path: "/gestao/visao-geral" },
      { icon: Car, label: "Pátio", path: "/admin/patio" },
      { icon: CalendarClock, label: "Agenda", path: "/admin/agenda" },
      {
        icon: FolderOpen,
        label: "Cadastros",
        path: "/_cadastros",
        children: [
          { icon: Users, label: "Clientes", path: "/admin/clientes" },
          { icon: ClipboardList, label: "Ordens de Serviço", path: "/admin/os" },
        ],
      },
      {
        icon: FileText,
        label: "Relatórios",
        path: "/_relatorios",
        children: [
          { icon: DollarSign, label: "Financeiro", path: "/admin/financeiro" },
          { icon: BarChart3, label: "Produtividade", path: "/admin/produtividade" },
          { icon: CalendarClock, label: "Agenda Mec.", path: "/admin/agenda-mecanicos" },
          { icon: BarChart3, label: "Mecânicos Analytics", path: "/admin/mecanicos/analytics" },
          { icon: ThumbsUp, label: "Avaliação Diária", path: "/admin/mecanicos/feedback" },
        ],
      },
      {
        icon: Brain,
        label: "QG das IAs",
        path: "/admin/ia-qg",
      },
      {
        icon: Lightbulb,
        label: "Melhorias",
        path: "/gestao/melhorias",
      },
      {
        icon: Monitor,
        label: "Sistema",
        path: "/_sistema",
        children: [
          { icon: Settings, label: "Configurações", path: "/admin/configuracoes" },
          { icon: UserCog, label: "Usuários", path: "/admin/usuarios" },
          { icon: Zap, label: "Integrações", path: "/admin/integracoes" },
          { icon: Trello, label: "Migração Trello", path: "/admin/trello-migracao" },
        ],
      },
    ],
  },
  {
    group: "GESTÃO",
    items: [
      { icon: FileText, label: "OS Ultimate", path: "/gestao/os-ultimate" },
      { icon: TrendingUp, label: "Visão Geral", path: "/gestao/visao-geral" },
      { icon: Wrench, label: "Operacional", path: "/gestao/operacional" },
      { icon: DollarSign, label: "Financeiro", path: "/gestao/financeiro" },
      { icon: BarChart3, label: "Produtividade", path: "/gestao/produtividade" },
      { icon: Users, label: "Colaboradores", path: "/gestao/colaboradores" },
      { icon: Wrench, label: "Mecânicos", path: "/gestao/mecanicos" },
      { icon: Target, label: "Metas", path: "/gestao/metas" },
      { icon: FileText, label: "Relatórios", path: "/gestao/relatorios" },
      { icon: Lightbulb, label: "Melhorias", path: "/gestao/melhorias" },
      { icon: Megaphone, label: "Campanhas", path: "/gestao/campanhas" },
      { icon: UserCog, label: "RH", path: "/gestao/rh" },
      { icon: Cog, label: "Operações", path: "/gestao/operacoes" },
      { icon: Laptop, label: "Tecnologia", path: "/gestao/tecnologia" },
    ],
  },
  {
    group: "Dev",
    items: [
      { icon: Code2, label: "Navegador de Páginas", path: "/dev" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Acesso livre — sem obrigatoriedade de login
  // O sistema é acessado diretamente sem autenticação

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // Filtra menu por perfil selecionado (salvo em sessionStorage)
  // Padrão: "admin" para acesso livre sem login
  const perfilAtual = sessionStorage.getItem("perfil_selecionado") ?? "admin";
  // Nome exibido no rodapé: usa o user logado ou o perfil selecionado
  const displayName = user?.name ?? (perfilAtual === "admin" ? "Administrador" : perfilAtual.charAt(0).toUpperCase() + perfilAtual.slice(1));
  const displayEmail = user?.email ?? "doctor.auto@prime";
  // Grupos visíveis por perfil:
  // consultor: apenas POMBAL
  // gestor: POMBAL + GESTÃO
  // admin: POMBAL + GESTÃO + Dev
  const GROUPS_BY_PERFIL: Record<string, string[]> = {
    consultor: ["POMBAL"],
    gestor: ["POMBAL", "GESTÃO"],
    admin: ["POMBAL", "GESTÃO", "Dev"],
    mecanico: ["POMBAL"],
  };
  const allowedGroups = GROUPS_BY_PERFIL[perfilAtual] ?? ["POMBAL"];
  const filteredMenuItems = menuItems
    .filter(group => allowedGroups.includes(group.group))
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        const acesso = PERFIL_ACESSO[item.path];
        if (!acesso) return true; // sem restrição = todos veem
        return acesso.includes(perfilAtual);
      }),
    }))
    .filter(group => group.items.length > 0);

  // Track open submenus
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(() => {
    // Auto-open submenu that contains the active path
    const initial: Record<string, boolean> = {};
    menuItems.forEach(group => {
      group.items.forEach(item => {
        if (item.children) {
          const hasActive = item.children.some(c => location === c.path || (c.path !== "/" && location.startsWith(c.path)));
          if (hasActive) initial[item.path] = true;
        }
      });
    });
    return initial;
  });

  const toggleSubmenu = (path: string) => {
    setOpenSubmenus(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const allItems = filteredMenuItems.flatMap(g => g.items.flatMap(i => i.children ? [i, ...i.children] : [i]));
  const activeMenuItem = allItems.find(item => item.path === location || (item.path !== "/" && !item.path.startsWith("/_") && location.startsWith(item.path)));
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Wrench className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-bold tracking-tight truncate text-foreground">
                    Doctor Auto
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            {filteredMenuItems.map((group, gi) => (
              <div key={group.group}>
                {gi > 0 && <SidebarSeparator className="mx-2 my-1" />}
                {!isCollapsed && (
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {group.group}
                  </p>
                )}
                <SidebarMenu className="px-2 pb-1">
                  {group.items.map(item => {
                    if (item.children) {
                      // Submenu item
                      const isOpen = openSubmenus[item.path] ?? false;
                      const hasActiveChild = item.children.some(c => location === c.path || (c.path !== "/" && location.startsWith(c.path)));
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={hasActiveChild}
                            onClick={() => toggleSubmenu(item.path)}
                            tooltip={item.label}
                            className="h-9 transition-all font-normal"
                          >
                            <item.icon className={`h-4 w-4 shrink-0 ${hasActiveChild ? "text-primary" : ""}`} />
                            <span className="flex-1">{item.label}</span>
                            {!isCollapsed && (
                              <ChevronRight
                                className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                              />
                            )}
                          </SidebarMenuButton>
                          {isOpen && !isCollapsed && (
                            <div className="ml-4 mt-0.5 border-l border-border/50 pl-2 space-y-0.5">
                              {item.children.map(child => {
                                const isChildActive = location === child.path || (child.path !== "/" && location.startsWith(child.path));
                                return (
                                  <button
                                    key={child.path}
                                    onClick={() => setLocation(child.path)}
                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors ${
                                      isChildActive
                                        ? "bg-accent text-accent-foreground font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    }`}
                                  >
                                    <child.icon className={`h-3.5 w-3.5 shrink-0 ${isChildActive ? "text-primary" : ""}`} />
                                    <span>{child.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </SidebarMenuItem>
                      );
                    }
                    const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 transition-all font-normal`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
            {/* Quick action */}
            {!isCollapsed && (
              <div className="px-3 pt-2 pb-1">
                <Button
                  size="sm"
                  className="w-full gap-2 h-8"
                  onClick={() => setLocation("/admin/nova-os")}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova OS
                </Button>
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {displayName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {displayEmail}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
