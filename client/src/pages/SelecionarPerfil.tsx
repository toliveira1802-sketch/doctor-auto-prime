/**
 * Tela de Seleção de Perfil — Doctor Auto Prime
 * PAGE 1: Exibe 4 perfis (Dev, Gestão, Consultor, Mecânico)
 * Ao selecionar, redireciona para /login?perfil=xxx
 */
import { useLocation } from "wouter";
import {
  Shield,
  BarChart3,
  Users,
  Wrench,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileCard {
  id: string;
  label: string;
  descricao: string;
  Icon: React.ElementType;
}

const PROFILES: ProfileCard[] = [
  {
    id: "dev",
    label: "Dev",
    descricao: "Acesso total ao sistema",
    Icon: Shield,
  },
  {
    id: "gestao",
    label: "Gestão",
    descricao: "Dashboards e estratégia",
    Icon: BarChart3,
  },
  {
    id: "consultor",
    label: "Consultor",
    descricao: "Atendimento e operação",
    Icon: Users,
  },
  {
    id: "mecanico",
    label: "Mecânico",
    descricao: "OS atribuídas e checklist",
    Icon: Wrench,
  },
];

export default function SelecionarPerfil() {
  const [, navigate] = useLocation();

  function handleSelect(profileId: string) {
    navigate(`/login?perfil=${profileId}`);
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-12">
      {/* Logo placeholder */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-red-600/30 flex items-center justify-center">
          <Car className="w-10 h-10 text-red-500" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Doctor Auto Prime
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Sistema de Gestão Automotiva
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-lg font-semibold text-white">
          Selecione seu perfil de acesso
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Escolha como você vai acessar o sistema
        </p>
      </div>

      {/* Profile cards grid */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {PROFILES.map((profile) => {
          const Icon = profile.Icon;
          return (
            <button
              key={profile.id}
              onClick={() => handleSelect(profile.id)}
              className={cn(
                "group relative flex flex-col items-center gap-3 p-6 rounded-2xl",
                "bg-zinc-950 border border-zinc-800",
                "hover:border-red-600/60 hover:bg-zinc-900/80",
                "active:scale-[0.98]",
                "transition-all duration-200 cursor-pointer"
              )}
            >
              <div className="p-3 rounded-xl bg-red-600/10 group-hover:bg-red-600/20 transition-colors">
                <Icon className="w-7 h-7 text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-white">
                  {profile.label}
                </p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {profile.descricao}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-zinc-700">
        Doctor Auto Prime &middot; Sistema Interno v2.0
      </p>
    </div>
  );
}
