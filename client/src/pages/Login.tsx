/**
 * Página de Login Local — Doctor Auto Prime
 * Login por email + senha para colaboradores (sem Manus OAuth).
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Car, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), senha }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErro(data.error ?? "Erro ao fazer login");
        setLoading(false);
        return;
      }

      // Salva perfil no sessionStorage (mesmo mecanismo do SelecionarPerfil)
      sessionStorage.setItem("perfil_selecionado", data.perfil);

      // Redireciona para a rota correta do perfil
      window.location.replace(data.redirectPath);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Auto Prime</h1>
          <p className="text-sm text-muted-foreground">Sistema de Gestão de Oficina</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@doctorauto.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erro}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10"
              disabled={loading || !email || !senha}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Doctor Auto Prime · Sistema Interno v2.0
        </p>
      </div>
    </div>
  );
}
