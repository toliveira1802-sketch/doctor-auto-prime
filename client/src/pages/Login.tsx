/**
 * Tela de Login — Doctor Auto Prime
 * Modo A: 4 quadrados de perfil (acesso rápido, sem senha)
 * Modo B: Formulário username + senha (Doctor_Sophia, Doctor_Pedro, Doctor_Joao)
 */
import { useState } from "react";
import { Users, BarChart3, ShieldCheck, Wrench, Car, KeyRound, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PERFIS = [
  {
    id: "consultor",
    label: "Consultor",
    descricao: "Atendimento, OS e pátio",
    icon: Users,
    cor: "text-blue-400",
    bg: "bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30",
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
    bg: "bg-purple-500/10 hover:bg-purple-500/20 active:bg-purple-500/30",
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
    bg: "bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30",
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
    bg: "bg-orange-500/10 hover:bg-orange-500/20 active:bg-orange-500/30",
    borda: "border-orange-500/30 hover:border-orange-400",
    nivelAcessoId: 4,
    redirectPath: "/mecanico",
  },
];

type Mode = "perfil" | "username";

export default function Login() {
  const [mode, setMode] = useState<Mode>("perfil");
  const [loadingPerfil, setLoadingPerfil] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);

  // ── Modo A: clique no quadrado de perfil ──────────────────────────────────
  async function handlePerfilSelect(perfil: typeof PERFIS[0]) {
    setLoadingPerfil(perfil.id);
    setError(null);
    try {
      const res = await fetch("/api/auth/local-login-perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nivelAcessoId: perfil.nivelAcessoId, redirectPath: perfil.redirectPath }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao entrar. Tente novamente.");
        setLoadingPerfil(null);
        return;
      }
      window.location.replace(data.redirectPath);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoadingPerfil(null);
    }
  }

  // ── Modo B: login com username + senha ────────────────────────────────────
  async function handleUsernameLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoadingForm(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/local-login-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Usuário ou senha incorretos.");
        setLoadingForm(false);
        return;
      }
      if (data.primeiroAcesso) {
        // Redireciona para troca obrigatória de senha
        sessionStorage.setItem("trocar_senha_id", String(data.colaboradorId));
        sessionStorage.setItem("trocar_senha_redirect", data.redirectPath);
        window.location.replace("/trocar-senha");
        return;
      }
      window.location.replace(data.redirectPath);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoadingForm(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
          <Car className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Doctor Auto Prime</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "perfil" ? "Selecione seu perfil para entrar" : "Acesso com usuário e senha"}
          </p>
        </div>
      </div>

      {/* ── MODO A: Quadrados de perfil ── */}
      {mode === "perfil" && (
        <>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {PERFIS.map((perfil) => {
              const Icon = perfil.icon;
              const isLoading = loadingPerfil === perfil.id;
              return (
                <button
                  key={perfil.id}
                  onClick={() => handlePerfilSelect(perfil)}
                  disabled={!!loadingPerfil}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all duration-150 cursor-pointer",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    perfil.bg,
                    perfil.borda
                  )}
                >
                  <div className="p-3 rounded-xl bg-black/20">
                    {isLoading ? (
                      <Loader2 className={cn("w-7 h-7 animate-spin", perfil.cor)} />
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

          {/* Botão para modo username */}
          <button
            onClick={() => { setMode("username"); setError(null); }}
            className="mt-8 flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Entrar com usuário e senha
          </button>
        </>
      )}

      {/* ── MODO B: Formulário username + senha ── */}
      {mode === "username" && (
        <form onSubmit={handleUsernameLogin} className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-400 text-sm">Usuário</Label>
            <Input
              id="username"
              type="text"
              placeholder="Doctor_Sophia"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loadingForm}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha" className="text-gray-400 text-sm">Senha</Label>
            <div className="relative">
              <Input
                id="senha"
                type={showSenha ? "text" : "password"}
                placeholder="••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loadingForm}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loadingForm || !username || !senha}
            className="w-full"
          >
            {loadingForm ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>

          <button
            type="button"
            onClick={() => { setMode("perfil"); setError(null); setUsername(""); setSenha(""); }}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors mt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para seleção de perfil
          </button>
        </form>
      )}

      {/* Erro */}
      {error && (
        <p className="mt-5 text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 max-w-sm w-full">
          {error}
        </p>
      )}

      <p className="mt-10 text-xs text-gray-700">Doctor Auto Prime · Sistema Interno v2.0</p>
    </div>
  );
}
