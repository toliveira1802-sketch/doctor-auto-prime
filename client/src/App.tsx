import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Patio from "./pages/Patio";
import OsList from "./pages/OsList";
import OsDetail from "./pages/OsDetail";
import NovaOS from "./pages/NovaOS";
import Agenda from "./pages/Agenda";
import CRM from "./pages/CRM";
import ClienteDetail from "./pages/ClienteDetail";
import Financeiro from "./pages/Financeiro";
import Produtividade from "./pages/Produtividade";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/patio" component={Patio} />
      <Route path="/os" component={OsList} />
      <Route path="/os/nova" component={NovaOS} />
      <Route path="/os/:id" component={OsDetail} />
      <Route path="/agenda" component={Agenda} />
      <Route path="/crm" component={CRM} />
      <Route path="/crm/:id" component={ClienteDetail} />
      <Route path="/financeiro" component={Financeiro} />
      <Route path="/produtividade" component={Produtividade} />
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
