/**
 * Tela de Troca de Senha Obrigatória — Doctor Auto Prime
 * PAGE 3: Shown when user logs in with default password "123456".
 * New password + confirm, minimum 8 characters, then straight to dashboard.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import {
  Car,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Role → redirect path
const ROLE_REDIRECTS: Record<string, string> = {
  dev: "/dev/painel",
  gestao: "/gestao/os-ultimate",
  consultor: "/admin/dashboard",
  mecanico: "/mecanico",
  cliente: "/cliente",
};

export default function TrocarSenha() {
  const [, navigate] = useLocation();
  const { roleInfo, setRoleInfo } = useRole();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const senhasConferem = novaSenha === confirmarSenha && confirmarSenha.length > 0;
  const senhaValida = novaSenha.length >= 8;
  const podeSubmeter = novaSenha && confirmarSenha && senhasConferem && senhaValida;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeSubmeter || !roleInfo?.colaboradorId || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          colaboradorId: roleInfo.colaboradorId,
          novaSenha,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao trocar senha. Tente novamente.");
        setLoading(false);
        return;
      }

      // Update role info to remove first access flag
      if (roleInfo) {
        setRoleInfo({ ...roleInfo, primeiroAcesso: false });
      }

      toast.success("Senha alterada com sucesso! Bem-vindo ao sistema.");

      // Redirect to dashboard based on role
      const redirectPath =
        ROLE_REDIRECTS[roleInfo?.role ?? "consultor"] ?? "/admin/dashboard";
      navigate(redirectPath);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  // If no role info, redirect to login
  if (!roleInfo?.colaboradorId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">Sessão não encontrada.</p>
          <Button
            onClick={() => navigate("/selecionar-perfil")}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 mb-8">
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

      {/* Change password card */}
      <div className="w-full max-w-md">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-600/10">
                <Key className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Troca de Senha Obrigatória
                </h2>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Olá,{" "}
                  <strong className="text-red-400">
                    {roleInfo?.nome ?? "usuário"}
                  </strong>
                  ! Este é seu primeiro acesso.
                </p>
              </div>
            </div>

            {/* Warning banner */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-600/5 border border-red-600/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300/80 text-xs leading-relaxed">
                Por segurança, você precisa criar uma senha pessoal antes de
                continuar. A senha padrão{" "}
                <code className="bg-red-600/20 px-1 rounded text-red-300">
                  123456
                </code>{" "}
                não poderá ser usada novamente.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {/* New password */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-sm">Nova senha</Label>
              <div className="relative">
                <Input
                  type={showNovaSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => {
                    setNovaSenha(e.target.value);
                    setError(null);
                  }}
                  placeholder="Mínimo 8 caracteres"
                  className={cn(
                    "bg-zinc-900 border-zinc-700 text-white pl-9 pr-10 placeholder:text-zinc-600 focus:border-red-600/50",
                    novaSenha && !senhaValida && "border-red-500/50"
                  )}
                  autoFocus
                  autoComplete="new-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowNovaSenha(!showNovaSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showNovaSenha ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {novaSenha && !senhaValida && (
                <p className="text-red-400 text-xs">Mínimo 8 caracteres</p>
              )}
              {novaSenha && senhaValida && (
                <p className="text-emerald-400 text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Senha válida
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-sm">
                Confirmar nova senha
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmar ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => {
                    setConfirmarSenha(e.target.value);
                    setError(null);
                  }}
                  placeholder="Repita a nova senha"
                  className={cn(
                    "bg-zinc-900 border-zinc-700 text-white pl-9 pr-10 placeholder:text-zinc-600 focus:border-red-600/50",
                    confirmarSenha &&
                      !senhasConferem &&
                      "border-red-500/50",
                    confirmarSenha &&
                      senhasConferem &&
                      senhaValida &&
                      "border-emerald-500/50"
                  )}
                  autoComplete="new-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowConfirmar(!showConfirmar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showConfirmar ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmarSenha && !senhasConferem && (
                <p className="text-red-400 text-xs">As senhas não conferem</p>
              )}
              {confirmarSenha && senhasConferem && senhaValida && (
                <p className="text-emerald-400 text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Senhas conferem
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-600/10 border border-red-600/20">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={!podeSubmeter || loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Definir Nova Senha e Entrar"
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-zinc-700">
        Doctor Auto Prime &middot; Sistema Interno v2.0
      </p>
    </div>
  );
}
