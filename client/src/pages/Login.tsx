/**
 * Tela de Login — Doctor Auto Prime
 * 4 quadrados de perfil, sem expor nomes de funcionários.
 * Ao clicar, autentica como o primeiro colaborador ativo daquele nível.
 */
import { useState } from "react";
import { Users, BarChart3, ShieldCheck, Wrench, Car } from "lucide-react";
import { cn } from "@/lib/utils";

const PERFIS = [
  {
    id: "consultor",
    label: "Consultor",
    descricao: "Atendimento, OS e pátio",
    icon: Users,
    cor: "text-blue-400",
    bg: "bg-blue-500/10 hover:bg-blue-500/20",
    borda: "border-blue-500/30 hover:border-blue-400",
    nivelAcessoId: 3,
    redirectPath: "/admin/dashboard",
  },
  {
    id: "gestao",
    label: "Gestão",
    descricao: "Dashboards e estratégia",
    icon: BarChart3,
    cor: "text-purple-400",
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
    borda: "border-purple-500/30 hover:border-purple-400",
    nivelAcessoId: 2,
    redirectPath: "/gestao/visao-geral",
  },
  {
    id: "administrador",
    label: "Administrador",
    descricao: "Acesso completo",
    icon: ShieldCheck,
    cor: "text-red-400",
    bg: "bg-red-500/10 hover:bg-red-500/20",
    borda: "border-red-500/30 hover:border-red-400",
    nivelAcessoId: 1,
    redirectPath: "/admin/dashboard",
  },
  {
    id: "mecanico",
    label: "Mecânico",
    descricao: "OS atribuídas",
    icon: Wrench,
    cor: "text-orange-400",
    bg: "bg-orange-500/10 hover:bg-orange-500/20",
    borda: "border-orange-500/30 hover:border-orange-400",
    nivelAcessoId: 4,
    redirectPath: "/mecanico",
  },
];

export default function Login() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(perfil: typeof PERFIS[0]) {
    setLoading(perfil.id);
    setError(null);
    try {
      const res = await fetch("/api/auth/local-login-perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nivelAcessoId: perfil.nivelAcessoId,
          redirectPath: perfil.redirectPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao entrar. Tente novamente.");
        setLoading(null);
        return;
      }
      window.location.replace(data.redirectPath);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-12">
        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
          <Car className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Doctor Auto Prime</h1>
          <p className="text-sm text-gray-500 mt-1">Selecione seu perfil para entrar</p>
        </div>
      </div>

      {/* Grid 2×2 de perfis */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {PERFIS.map((perfil) => {
          const Icon = perfil.icon;
          const isLoading = loading === perfil.id;
          return (
            <button
              key={perfil.id}
              onClick={() => handleSelect(perfil)}
              disabled={!!loading}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all duration-200 cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                perfil.bg,
                perfil.borda
              )}
            >
              <div className={cn("p-3 rounded-xl bg-black/20")}>
                {isLoading ? (
                  <div
                    className={cn(
                      "w-7 h-7 border-2 rounded-full animate-spin",
                      perfil.cor,
                      "border-current/30 border-t-current"
                    )}
                  />
                ) : (
                  <Icon className={cn("w-7 h-7", perfil.cor)} />
                )}
              </div>
              <div className="text-center">
                <p className={cn("font-semibold text-base", perfil.cor)}>{perfil.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{perfil.descricao}</p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <p className="mt-10 text-xs text-gray-700">Doctor Auto Prime · Sistema Interno v2.0</p>
    </div>
  );
}
