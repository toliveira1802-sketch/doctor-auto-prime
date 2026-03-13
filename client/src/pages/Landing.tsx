/**
 * Landing — Doctor Auto Prime
 * Página de entrada do sistema.
 * - "Acessar Sistema" → /selecionar-perfil (fluxo Gestão/Consultores/Mecânico)
 * - "Acesso do Desenvolvedor" → modal com login username+senha
 * - "Esqueceu a senha" → envia magic link para toliveira1802@gmail.com via /api/auth/dev-reset
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Car, Code2, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type View = "landing" | "dev-login" | "dev-reset" | "reset-sent";

export default function Landing() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>("landing");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Login do desenvolvedor
  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Preencha usuário e senha");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, senha: password, perfil: "dev" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Credenciais inválidas");
        return;
      }
      toast.success("Bem-vindo, Dev!");
      navigate(data.redirect ?? "/dev/system-oficina");
    } catch {
      toast.error("Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  // Reset de senha — envia token pro email do dev
  async function handleDevReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/dev-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setView("reset-sent");
      } else {
        toast.error("Erro ao enviar o email de reset");
      }
    } catch {
      toast.error("Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">

      {/* ── LANDING ── */}
      {view === "landing" && (
        <div className="flex flex-col items-center text-center gap-6 max-w-lg w-full">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Car className="w-8 h-8 text-red-500" />
          </div>

          {/* Título */}
          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-white tracking-tight">Doctor Auto Prime</h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-red-600" />
              <p className="text-zinc-400 text-sm">Sistema de Gestão Automotiva</p>
              <div className="h-px w-12 bg-red-600" />
            </div>
          </div>

          {/* Descrição */}
          <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">
            Plataforma completa para gestão de oficinas automotivas. Controle operacional,
            financeiro e produtividade em um só lugar.
          </p>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Button
              onClick={() => navigate("/selecionar-perfil")}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold h-11 gap-2"
            >
              Acessar Sistema
              <span className="text-red-300">→</span>
            </Button>
            <Button
              onClick={() => setView("dev-login")}
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white h-11 gap-2"
            >
              <Code2 className="w-4 h-4 text-zinc-500" />
              Acesso do Desenvolvedor
            </Button>
          </div>
        </div>
      )}

      {/* ── LOGIN DEV ── */}
      {view === "dev-login" && (
        <div className="w-full max-w-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setView("landing")}
                  className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1 transition-colors"
                >
                  ← Voltar
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-950 border border-red-900 flex items-center justify-center">
                  <Code2 className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">Acesso Dev</h2>
                  <p className="text-zinc-500 text-xs">Doctor Auto Prime</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleDevLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="seu usuário"
                    autoComplete="username"
                    className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-red-600 h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-9 pr-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-red-600 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>

            {/* Forgot */}
            <div className="text-center">
              <button
                onClick={() => setView("dev-reset")}
                className="text-zinc-500 hover:text-red-400 text-sm transition-colors underline underline-offset-4"
              >
                Esqueceu a senha?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET CONFIRM ── */}
      {view === "dev-reset" && (
        <div className="w-full max-w-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <div>
              <button
                onClick={() => setView("dev-login")}
                className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1 transition-colors mb-4"
              >
                ← Voltar
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">Resetar senha</h2>
                  <p className="text-zinc-500 text-xs">Enviar link de acesso</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-1">
              <p className="text-zinc-400 text-sm">Um link de reset será enviado para:</p>
              <p className="text-white font-mono text-sm">toliveira1802@gmail.com</p>
            </div>

            <p className="text-zinc-500 text-xs leading-relaxed">
              O link é válido por 1 hora e permite redefinir a senha do perfil desenvolvedor.
            </p>

            <form onSubmit={handleDevReset} className="space-y-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar link de reset"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── RESET SENT ── */}
      {view === "reset-sent" && (
        <div className="w-full max-w-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-950 border border-green-900 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-white font-semibold text-xl">Email enviado!</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Verifique <span className="text-white">toliveira1802@gmail.com</span> e clique no link
                para redefinir sua senha.
              </p>
            </div>
            <Button
              onClick={() => setView("dev-login")}
              variant="outline"
              className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-900 h-11"
            >
              Voltar ao login
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
