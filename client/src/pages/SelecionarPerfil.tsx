/**
 * Tela de Seleção de Perfil — Doctor Auto Prime
 * Exibida antes do login para o usuário escolher com qual perfil deseja entrar.
 * O perfil escolhido é salvo em sessionStorage e usado após o callback de OAuth.
 */
import { useState } from "react";
import { getLoginUrl } from "@/const";
import {
  Wrench,
  Users,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Perfil {
  id: string;
  label: string;
  descricao: string;
  icon: React.ElementType;
  cor: string;
  corBg: string;
  corBorda: string;
  redirectTo: string;
}

const perfis: Perfil[] = [
  {
    id: "consultor",
    label: "Consultor",
    descricao: "Atendimento ao cliente, abertura de OS, agendamentos e acompanhamento de pátio.",
    icon: Users,
    cor: "text-blue-400",
    corBg: "bg-blue-500/10",
    corBorda: "border-blue-500/40 hover:border-blue-400",
    redirectTo: "/admin/dashboard",
  },
  {
    id: "mecanico",
    label: "Mecânico",
    descricao: "Visualização das OS atribuídas, registro de serviços e atualização de status.",
    icon: Wrench,
    cor: "text-orange-400",
    corBg: "bg-orange-500/10",
    corBorda: "border-orange-500/40 hover:border-orange-400",
    redirectTo: "/admin/os",
  },
  {
    id: "gestor",
    label: "Gestor",
    descricao: "Dashboards de gestão, metas, campanhas, RH, operações e visão estratégica.",
    icon: BarChart3,
    cor: "text-purple-400",
    corBg: "bg-purple-500/10",
    corBorda: "border-purple-500/40 hover:border-purple-400",
    redirectTo: "/gestao/visao-geral",
  },
  {
    id: "admin",
    label: "Administrador",
    descricao: "Acesso completo ao sistema: configurações, integrações, financeiro e relatórios.",
    icon: ShieldCheck,
    cor: "text-red-400",
    corBg: "bg-red-500/10",
    corBorda: "border-red-500/40 hover:border-red-400",
    redirectTo: "/admin/dashboard",
  },
];

export default function SelecionarPerfil() {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  function handleEntrar() {
    if (!selecionado) return;
    const perfil = perfis.find((p) => p.id === selecionado);
    if (!perfil) return;
    setEntrando(true);
    // Salva o perfil e o destino para uso após o callback OAuth
    sessionStorage.setItem("perfil_selecionado", selecionado);
    sessionStorage.setItem("perfil_redirect", perfil.redirectTo);
    // Redireciona para o login OAuth
    window.location.href = getLoginUrl();
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo / Header */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Car className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Doctor Auto Prime</h1>
            <p className="text-sm text-gray-500">Sistema de Gestão Automotiva</p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <h2 className="text-lg font-semibold text-white">Selecione seu perfil de acesso</h2>
          <p className="text-sm text-gray-400 mt-1">
            Escolha como você vai usar o sistema hoje
          </p>
        </div>
      </div>

      {/* Cards de perfil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {perfis.map((perfil) => {
          const Icon = perfil.icon;
          const ativo = selecionado === perfil.id;
          return (
            <button
              key={perfil.id}
              onClick={() => setSelecionado(perfil.id)}
              className={cn(
                "relative flex items-start gap-4 p-5 rounded-xl border text-left transition-all duration-200 group",
                "bg-[#161b22] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                perfil.corBorda,
                ativo && "ring-2 ring-offset-2 ring-offset-[#0d1117]",
                ativo && perfil.cor.replace("text-", "ring-")
              )}
            >
              {/* Ícone */}
              <div className={cn("p-2.5 rounded-lg shrink-0 mt-0.5", perfil.corBg)}>
                <Icon className={cn("w-5 h-5", perfil.cor)} />
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-base", ativo ? perfil.cor : "text-white")}>
                  {perfil.label}
                </p>
                <p className="text-sm text-gray-400 mt-1 leading-snug">{perfil.descricao}</p>
              </div>

              {/* Indicador de seleção */}
              <div
                className={cn(
                  "shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 transition-all",
                  ativo
                    ? cn("border-transparent", perfil.corBg, perfil.cor)
                    : "border-gray-600"
                )}
              >
                {ativo && (
                  <div className={cn("w-full h-full rounded-full scale-50", perfil.corBg.replace("/10", "/80"))} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Botão de entrar */}
      <div className="mt-8 w-full max-w-2xl">
        <button
          onClick={handleEntrar}
          disabled={!selecionado || entrando}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-base transition-all duration-200",
            selecionado && !entrando
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-primary/20"
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          )}
        >
          {entrando ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Redirecionando...
            </>
          ) : (
            <>
              Entrar como {selecionado ? perfis.find((p) => p.id === selecionado)?.label : "..."}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
        <p className="text-center text-xs text-gray-600 mt-3">
          Você será redirecionado para autenticação segura via Manus OAuth
        </p>
      </div>
    </div>
  );
}
