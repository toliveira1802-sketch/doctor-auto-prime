/**
 * Tela de Login — Doctor Auto Prime
 * PAGE 2: Username + Password login with selected profile context.
 * Features: "Lembrar de mim", "Esqueci a senha", login attempt limiting.
 * Flow: receives ?perfil= from profile selection → validates → redirects.
 */
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import {
  Car,
  Eye,
  EyeOff,
  Loader2,
  User,
  Lock,
  ChevronLeft,
  Shield,
  BarChart3,
  Users,
  Wrench,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Profile metadata
const PROFILE_META: Record<
  string,
  { label: string; Icon: React.ElementType; color: string }
> = {
  dev: { label: "Dev", Icon: Shield, color: "text-red-500" },
  gestao: { label: "Gestão", Icon: BarChart3, color: "text-red-500" },
  consultor: { label: "Consultor", Icon: Users, color: "text-red-500" },
  mecanico: { label: "Mecânico", Icon: Wrench, color: "text-red-500" },
};

// Role → redirect path
const ROLE_REDIRECTS: Record<string, string> = {
  dev: "/dev/painel",
  gestao: "/gestao/os-ultimate",
  consultor: "/admin/dashboard",
  mecanico: "/mecanico",
  cliente: "/cliente",
};

export default function Login() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { setRoleInfo } = useRole();

  // Extract profile from URL
  const params = new URLSearchParams(search);
  const perfil = params.get("perfil") ?? "";
  const profileInfo = PROFILE_META[perfil];

  // Form state
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [showForgotDialog, setShowForgotDialog] = useState(false);

  // Redirect to profile selection if no profile
  useEffect(() => {
    if (!perfil || !profileInfo) {
      navigate("/selecionar-perfil");
    }
  }, [perfil, profileInfo, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !senha.trim() || loading || locked) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          senha,
          perfil,
          lembrar,
        }),
      });

      const data = await res.json();

      if (res.status === 423) {
        // Account locked
        setLocked(true);
        setMinutesLeft(data.minutesLeft ?? 15);
        setError(data.error);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Usuário ou senha incorretos.");
        setLoading(false);
        return;
      }

      // Success — save role info to context
      setRoleInfo({
        role: data.role as any,
        nome: data.nome,
        login: data.login ?? username.trim(),
        colaboradorId: data.colaboradorId,
        mecanicoRefId: data.mecanicoRefId ?? null,
        primeiroAcesso: data.primeiroAcesso,
      });

      // Check first access → redirect to change password
      if (data.primeiroAcesso) {
        toast.info("Primeiro acesso! Defina sua senha pessoal.");
        navigate("/trocar-senha");
        return;
      }

      toast.success(`Bem-vindo, ${data.nome}!`);
      navigate(data.redirectPath ?? ROLE_REDIRECTS[data.role] ?? "/admin/dashboard");
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  if (!profileInfo) return null;

  const ProfileIcon = profileInfo.Icon;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-red-600/30 flex items-center justify-center">
          <Car className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Doctor Auto Prime
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Sistema de Gestão Automotiva
          </p>
        </div>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
          {/* Profile badge */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-600/5 border border-red-600/20">
            <div className="p-2 rounded-lg bg-red-600/10">
              <ProfileIcon className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Perfil: {profileInfo.label}
              </p>
              <p className="text-xs text-zinc-500">
                Faça login para continuar
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-400 text-sm">
                Usuário
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="Digite seu usuário"
                  disabled={loading}
                  className="bg-zinc-900 border-zinc-700 text-white pl-9 placeholder:text-zinc-600 focus:border-red-600/50 focus:ring-red-600/20"
                  autoComplete="username"
                  autoFocus
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-zinc-400 text-sm">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    setError(null);
                  }}
                  placeholder="Digite sua senha"
                  disabled={loading}
                  className="bg-zinc-900 border-zinc-700 text-white pl-9 pr-10 placeholder:text-zinc-600 focus:border-red-600/50 focus:ring-red-600/20"
                  autoComplete="current-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showSenha ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lembrar"
                  checked={lembrar}
                  onCheckedChange={(checked) => setLembrar(checked === true)}
                  className="border-zinc-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <Label
                  htmlFor="lembrar"
                  className="text-xs text-zinc-400 cursor-pointer select-none"
                >
                  Lembrar de mim
                </Label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotDialog(true)}
                className="text-xs text-red-500/80 hover:text-red-400 transition-colors"
              >
                Esqueci a senha
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-600/10 border border-red-600/20">
                <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading || !username.trim() || !senha.trim() || locked}
              className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Entrando...
                </>
              ) : locked ? (
                `Bloqueado (${minutesLeft}min)`
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Back to profile selection */}
          <button
            onClick={() => navigate("/selecionar-perfil")}
            className="w-full flex items-center justify-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar para seleção de perfil
          </button>
        </div>
      </div>

      {/* Forgot password dialog */}
      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Esqueci a senha</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Entre em contato com o administrador para resetar sua senha.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <Info className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-zinc-300 text-sm leading-relaxed">
              Apenas o perfil <strong className="text-red-400">Dev</strong> pode
              resetar senhas. Sua senha será redefinida para o padrão e você
              precisará criar uma nova no próximo login.
            </p>
          </div>
          <Button
            onClick={() => setShowForgotDialog(false)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <p className="mt-10 text-xs text-zinc-700">
        Doctor Auto Prime &middot; Sistema Interno v2.0
      </p>
    </div>
  );
}
