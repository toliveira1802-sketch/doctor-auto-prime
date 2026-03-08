/**
 * Tela de Login — Doctor Auto Prime
 * Login por username + senha, autenticado via banco de dados.
 * Se primeiroAcesso=true, redireciona para /trocar-senha.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import {
  Car,
  Lock,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mapeamento de role → rota de destino
const ROLE_REDIRECTS: Record<string, string> = {
  dev: "/dev/painel",
  gestao: "/gestao/os-ultimate",
  consultor: "/admin/dashboard",
  mecanico: "/admin/patio",
  cliente: "/cliente",
};

export default function SelecionarPerfil() {
  const [, navigate] = useLocation();
  const { setRoleInfo } = useRole();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);

  const roleLogin = trpc.auth.roleLogin.useMutation({
    onSuccess: (data) => {
      setRoleInfo({
        role: data.role as any,
        nome: data.nome,
        login: data.login,
        colaboradorId: data.colaboradorId,
        primeiroAcesso: data.primeiroAcesso,
      });

      if (data.primeiroAcesso) {
        toast.info("Primeiro acesso detectado. Defina sua senha pessoal.");
        navigate("/trocar-senha");
      } else {
        toast.success(`Bem-vindo, ${data.nome}!`);
        navigate(ROLE_REDIRECTS[data.role] ?? "/admin/dashboard");
      }
    },
    onError: (err) => {
      toast.error(err.message ?? "Login ou senha incorretos");
    },
  });

  function handleLogin() {
    if (!login.trim() || !senha.trim()) return;
    roleLogin.mutate({ login: login.trim(), senha });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleLogin();
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
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
          <h2 className="text-lg font-semibold text-white">Acesso ao Sistema</h2>
          <p className="text-sm text-gray-400 mt-1">Digite seu usuário e senha para entrar</p>
        </div>
      </div>

      {/* Card de login */}
      <div className="w-full max-w-sm">
        <div className="p-6 rounded-2xl bg-[#161b22] border border-zinc-700/50">
          <div className="space-y-4">
            {/* Username */}
            <div>
              <Label className="text-zinc-400 text-sm">Usuário</Label>
              <div className="relative mt-1.5">
                <Input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: consultor_pedro"
                  className="bg-zinc-800 border-zinc-700 text-white pl-9 font-mono text-sm"
                  autoFocus
                  autoComplete="username"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
            </div>

            {/* Senha */}
            <div>
              <Label className="text-zinc-400 text-sm">Senha</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua senha"
                  className="bg-zinc-800 border-zinc-700 text-white pl-9 pr-10"
                  autoComplete="current-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={!login.trim() || !senha.trim() || roleLogin.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-white mt-2"
            >
              {roleLogin.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </div>

          {/* Dica de usuários */}
          <div className="mt-5 pt-4 border-t border-zinc-800">
            <p className="text-zinc-600 text-xs text-center">
              Formato do usuário: <code className="text-zinc-500">role_nome</code>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-zinc-700">
              <span>• Dev_thales</span>
              <span>• gestao_sophia</span>
              <span>• consultor_pedro</span>
              <span>• consultor_joao</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs text-zinc-800">Doctor Auto Prime · Sistema Interno v2.0</p>
    </div>
  );
}
