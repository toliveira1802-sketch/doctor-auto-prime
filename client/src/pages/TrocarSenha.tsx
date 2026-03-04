/**
 * Tela de Troca de Senha Obrigatória — 1º Acesso
 * Exibida quando primeiroAcesso=true após login com username+senha.
 */
import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Car, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TrocarSenha() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const colaboradorId = sessionStorage.getItem("trocar_senha_id");
  const redirectPath = sessionStorage.getItem("trocar_senha_redirect") ?? "/admin/dashboard";

  async function handleTrocar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (novaSenha.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!colaboradorId) {
      setError("Sessão inválida. Faça login novamente.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ colaboradorId: Number(colaboradorId), novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao trocar senha.");
        setLoading(false);
        return;
      }
      // Limpa dados temporários
      sessionStorage.removeItem("trocar_senha_id");
      sessionStorage.removeItem("trocar_senha_redirect");
      setSucesso(true);
      setTimeout(() => {
        window.location.replace(redirectPath);
      }, 2000);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle className="w-16 h-16 text-green-400" />
          <h2 className="text-2xl font-bold text-white">Senha atualizada!</h2>
          <p className="text-gray-400 text-sm">Redirecionando para o sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
          <Car className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Doctor Auto Prime</h1>
          <p className="text-sm text-gray-500 mt-1">Primeiro acesso — defina sua senha</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Troca de senha obrigatória</p>
            <p className="text-gray-500 text-xs">Escolha uma senha segura para continuar</p>
          </div>
        </div>

        <form onSubmit={handleTrocar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova" className="text-gray-400 text-sm">Nova senha</Label>
            <div className="relative">
              <Input
                id="nova"
                type={showNova ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                disabled={loading}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNova(!showNova)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar" className="text-gray-400 text-sm">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirmar"
                type={showConfirmar ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                disabled={loading}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmar(!showConfirmar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !novaSenha || !confirmar}
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Definir senha e entrar
          </Button>
        </form>
      </div>

      <p className="mt-8 text-xs text-gray-700">Doctor Auto Prime · Sistema Interno v2.0</p>
    </div>
  );
}
