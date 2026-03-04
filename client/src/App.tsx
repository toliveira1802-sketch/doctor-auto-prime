import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Legacy pages (still accessible)
import Home from "./pages/Home";
import Dev from "./pages/Dev";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPatio from "./pages/admin/AdminPatio";
import AdminOrdensServico from "./pages/admin/AdminOrdensServico";
import AdminOSDetalhes from "./pages/admin/AdminOSDetalhes";
import AdminNovaOS from "./pages/admin/AdminNovaOS";
import AdminAgendamentos from "./pages/admin/AdminAgendamentos";
import AdminClientes from "./pages/admin/AdminClientes";
import AdminClienteDetalhe from "./pages/admin/AdminClienteDetalhe";
import AdminFinanceiro from "./pages/admin/AdminFinanceiro";
import AdminProdutividade from "./pages/admin/AdminProdutividade";
import AdminConfiguracoes from "./pages/admin/AdminConfiguracoes";
import AdminMechanicAnalytics from "./pages/admin/AdminMechanicAnalytics";
import AdminMechanicFeedback from "./pages/admin/AdminMechanicFeedback";
import AdminIntegracoes from "./pages/admin/AdminIntegracoes";
import TrelloMigracao from "./pages/admin/TrelloMigracao";

// Gestão pages
import GestaoVisaoGeral from "./pages/gestao/GestaoVisaoGeral";
import GestaoOperacional from "./pages/gestao/GestaoOperacional";
import GestaoFinanceiro from "./pages/gestao/GestaoFinanceiro";
import GestaoProdutividade from "./pages/gestao/GestaoProdutividade";
import GestaoColaboradores from "./pages/gestao/GestaoColaboradores";
import GestaoMecanicos from "./pages/gestao/GestaoMecanicos";
import GestaoMetas from "./pages/gestao/GestaoMetas";
import GestaoRelatorios from "./pages/gestao/GestaoRelatorios";
import GestaoMelhorias from "./pages/gestao/GestaoMelhorias";
import GestaoCampanhas from "./pages/gestao/GestaoCampanhas";
import GestaoRH from "./pages/gestao/GestaoRH";
import GestaoOperacoes from "./pages/gestao/GestaoOperacoes";
import GestaoTecnologia from "./pages/gestao/GestaoTecnologia";
import SelecionarPerfil from "./pages/SelecionarPerfil";
import MecanicoView from "./pages/MecanicoView";

function WithLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      {/* Tela de seleção de perfil (antes do login) */}
      <Route path="/selecionar-perfil">
        <SelecionarPerfil />
      </Route>

      {/* Tela dedicada para mecânicos (sem sidebar) */}
      <Route path="/mecanico">
        <MecanicoView />
      </Route>

      {/* Root: após OAuth callback redireciona para o perfil salvo, senão vai ao dashboard */}
      <Route path="/">
        {() => {
          const perfilRedirect = sessionStorage.getItem("perfil_redirect");
          if (perfilRedirect) {
            sessionStorage.removeItem("perfil_redirect");
            sessionStorage.removeItem("perfil_selecionado");
            window.location.replace(perfilRedirect);
          } else {
            window.location.replace("/admin/dashboard");
          }
          return null;
        }}
      </Route>

      {/* Dev navigator */}
      <Route path="/dev">
        <WithLayout><Dev /></WithLayout>
      </Route>

      {/* ── ADMIN ROUTES ─────────────────────────────────────────────── */}
      <Route path="/admin/dashboard">
        <WithLayout><AdminDashboard /></WithLayout>
      </Route>
      <Route path="/admin/patio">
        <WithLayout><AdminPatio /></WithLayout>
      </Route>
      <Route path="/admin/os/nova">
        <WithLayout><AdminNovaOS /></WithLayout>
      </Route>
      <Route path="/admin/nova-os">
        <WithLayout><AdminNovaOS /></WithLayout>
      </Route>
      <Route path="/admin/os/:id">
        {() => <WithLayout><AdminOSDetalhes /></WithLayout>}
      </Route>
      <Route path="/admin/os">
        <WithLayout><AdminOrdensServico /></WithLayout>
      </Route>
      <Route path="/admin/agenda">
        <WithLayout><AdminAgendamentos /></WithLayout>
      </Route>
      <Route path="/admin/clientes/:id">
        {() => <WithLayout><AdminClienteDetalhe /></WithLayout>}
      </Route>
      <Route path="/admin/clientes">
        <WithLayout><AdminClientes /></WithLayout>
      </Route>
      <Route path="/admin/financeiro">
        <WithLayout><AdminFinanceiro /></WithLayout>
      </Route>
      <Route path="/admin/produtividade">
        <WithLayout><AdminProdutividade /></WithLayout>
      </Route>
      <Route path="/admin/configuracoes">
        <WithLayout><AdminConfiguracoes /></WithLayout>
      </Route>
      <Route path="/admin/mecanicos/analytics">
        <WithLayout><AdminMechanicAnalytics /></WithLayout>
      </Route>
      <Route path="/admin/mecanicos/feedback">
        <WithLayout><AdminMechanicFeedback /></WithLayout>
      </Route>
      <Route path="/admin/integracoes">
        <WithLayout><AdminIntegracoes /></WithLayout>
      </Route>
      <Route path="/admin/trello-migracao">
        <WithLayout><TrelloMigracao /></WithLayout>
      </Route>

      {/* ── GESTÃO ROUTES ────────────────────────────────────────────── */}
      <Route path="/gestao/visao-geral">
        <WithLayout><GestaoVisaoGeral /></WithLayout>
      </Route>
      <Route path="/gestao/operacional">
        <WithLayout><GestaoOperacional /></WithLayout>
      </Route>
      <Route path="/gestao/financeiro">
        <WithLayout><GestaoFinanceiro /></WithLayout>
      </Route>
      <Route path="/gestao/produtividade">
        <WithLayout><GestaoProdutividade /></WithLayout>
      </Route>
      <Route path="/gestao/colaboradores">
        <WithLayout><GestaoColaboradores /></WithLayout>
      </Route>
      <Route path="/gestao/mecanicos">
        <WithLayout><GestaoMecanicos /></WithLayout>
      </Route>
      <Route path="/gestao/metas">
        <WithLayout><GestaoMetas /></WithLayout>
      </Route>
      <Route path="/gestao/relatorios">
        <WithLayout><GestaoRelatorios /></WithLayout>
      </Route>
      <Route path="/gestao/melhorias">
        <WithLayout><GestaoMelhorias /></WithLayout>
      </Route>
      <Route path="/gestao/campanhas">
        <WithLayout><GestaoCampanhas /></WithLayout>
      </Route>
      <Route path="/gestao/rh">
        <WithLayout><GestaoRH /></WithLayout>
      </Route>
      <Route path="/gestao/operacoes">
        <WithLayout><GestaoOperacoes /></WithLayout>
      </Route>
      <Route path="/gestao/tecnologia">
        <WithLayout><GestaoTecnologia /></WithLayout>
      </Route>

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
