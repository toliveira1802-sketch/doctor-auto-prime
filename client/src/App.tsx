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
import DevPanel from "./pages/DevPanel";

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
import Operacional from "./pages/admin/Operacional";
import AdminAgendaMecanicos from "./pages/admin/AdminAgendaMecanicos";

// Gestão pages
import GestaoVisaoGeral from "./pages/gestao/GestaoVisaoGeral";
import GestaoOSUltimate from "./pages/gestao/GestaoOSUltimate";
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
import Login from "./pages/Login";
import TrocarSenha from "./pages/TrocarSenha";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import IaQG from "./pages/admin/IaQG";
import { RouteGuard } from "./components/RouteGuard";
import MusicPlayer from "./pages/MusicPlayer";
import IAPortal from "./pages/dev/IAPortal";
import Processos from "./pages/dev/Processos";
import PerfilIA from "./pages/dev/qgia/PerfilIA";
import TemperaturaLead from "./pages/dev/qgia/TemperaturaLead";
import DistribuicaoLeads from "./pages/dev/qgia/DistribuicaoLeads";
import HistoricoPontuacao from "./pages/dev/qgia/HistoricoPontuacao";
import ClientePortal from "./pages/dev/ClientePortal";
import Sistema from "./pages/dev/Sistema";

function WithLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <RouteGuard>
    <Switch>
      {/* Player de música DAP Radio */}
      <Route path="/callback">
        <MusicPlayer />
      </Route>

      {/* Login local por email+senha */}
      <Route path="/login">
        <Login />
      </Route>

      {/* Troca de senha obrigatória no 1º acesso */}
      <Route path="/trocar-senha">
        <TrocarSenha />
      </Route>

      {/* Tela de seleção de perfil (antes do login) */}
      <Route path="/selecionar-perfil">
        <SelecionarPerfil />
      </Route>

      {/* Tela dedicada para mecânicos (sem sidebar) */}
      <Route path="/mecanico">
        <MecanicoView />
      </Route>

      {/* Root: redireciona para seleção de perfil ou para o destino do role ativo */}
      <Route path="/">
        {() => {
          const roleSession = localStorage.getItem("dap_role_session");
          if (roleSession) {
            try {
              const info = JSON.parse(roleSession);
              const redirectMap: Record<string, string> = {
                dev: "/dev/painel",
                gestao: "/gestao/os-ultimate",
                consultor: "/admin/dashboard",
                mecanico: "/mecanico",
                cliente: "/cliente",
              };
              window.location.replace(redirectMap[info.role] ?? "/selecionar-perfil");
            } catch {
              window.location.replace("/selecionar-perfil");
            }
          } else {
            window.location.replace("/selecionar-perfil");
          }
          return null;
        }}
      </Route>

      {/* Dev navigator */}
      <Route path="/dev">
        <WithLayout><Dev /></WithLayout>
      </Route>
      <Route path="/dev/painel">
        <WithLayout><DevPanel /></WithLayout>
      </Route>
      <Route path="/dev/ia-portal">
        <WithLayout><IAPortal /></WithLayout>
      </Route>
      <Route path="/dev/processos">
        <WithLayout><Processos /></WithLayout>
      </Route>
      <Route path="/dev/qgia/perfil-ia">
        <WithLayout><PerfilIA /></WithLayout>
      </Route>
      <Route path="/dev/qgia/temperatura-lead">
        <WithLayout><TemperaturaLead /></WithLayout>
      </Route>
      <Route path="/dev/qgia/distribuicao-leads">
        <WithLayout><DistribuicaoLeads /></WithLayout>
      </Route>
      <Route path="/dev/qgia/historico-pontuacao">
        <WithLayout><HistoricoPontuacao /></WithLayout>
      </Route>
      <Route path="/dev/cliente">
        <WithLayout><ClientePortal /></WithLayout>
      </Route>
      <Route path="/dev/sistema">
        <WithLayout><Sistema /></WithLayout>
      </Route>

      {/* ── ADMIN ROUTES ─────────────────────────────────────────────── */}
      <Route path="/admin/dashboard">
        <WithLayout><AdminDashboard /></WithLayout>
      </Route>
      <Route path="/admin/operacional">
        <WithLayout><Operacional /></WithLayout>
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
      <Route path="/admin/usuarios">
        <WithLayout><AdminUsuarios /></WithLayout>
      </Route>
      <Route path="/admin/agenda-mecanicos">
        <WithLayout><AdminAgendaMecanicos /></WithLayout>
      </Route>
      <Route path="/admin/ia-qg">
        <WithLayout><IaQG /></WithLayout>
      </Route>

      {/* ── GESTÃO ROUTES ────────────────────────────────────────────── */}
      <Route path="/gestao/os-ultimate">
        <WithLayout><GestaoOSUltimate /></WithLayout>
      </Route>

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
    </RouteGuard>
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
