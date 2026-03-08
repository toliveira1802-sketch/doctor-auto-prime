/**
 * Tela de Seleção de Perfil — Doctor Auto Prime
 * Passo 1: seleciona o tipo de acesso (quadrados)
 * Passo 2: digita username + senha para o role selecionado
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import {
  Shield,
  Users,
  Wrench,
  BarChart3,
  Lock,
  Eye,
  EyeOff,
  Car,
  ChevronLeft,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Mapeamento de role → rota de destino
const ROLE_REDIRECTS: Record<string, string> = {
  dev: "/dev/painel",
  gestao: "/gestao/os-ultimate",
  consultor: "/admin/dashboard",
  mecanico: "/admin/patio",
  cliente: "/cliente",
};

// Exemplos de username por role (dica visual)
const ROLE_USERNAME_HINTS: Record<string, string[]> = {
  Dev_thales_role: ["Dev_thales"],
  gestao: ["gestao_sophia", "gestao_francisco", "gestao_marcia", "gestao_simone"],
  consultor: ["consultor_pedro", "consultor_joao", "consultor_rony", "consultor_antonio"],
  mecanico: ["mecanico_marcos", "mecanico_rodrigo"],
  cliente: [],
};

interface RoleCard {
  id: string;
  label: string;
  descricao: string;
  Icon: React.ElementType;
  cor: string;
  corBg: string;
  corBorda: string;
  usernameHintKey: string;
}

const ROLES: RoleCard[] = [
  {
    id: "dev",
    label: "Dev",
    descricao: "Acesso total: sistema, configurações e regras de negócio",
    Icon: Shield,
    cor: "text-purple-400",
    corBg: "bg-purple-500/10",
    corBorda: "border-purple-500/40 hover:border-purple-400",
    usernameHintKey: "Dev_thales_role",
  },
  {
    id: "gestao",
    label: "Gestão",
    descricao: "Dashboards gerenciais, OS Ultimate, relatórios e metas",
    Icon: BarChart3,
    cor: "text-blue-400",
    corBg: "bg-blue-500/10",
    corBorda: "border-blue-500/40 hover:border-blue-400",
    usernameHintKey: "gestao",
  },
  {
    id: "consultor",
    label: "Consultor",
    descricao: "Pátio, agenda, nova OS, clientes e atendimento",
    Icon: Users,
    cor: "text-green-400",
    corBg: "bg-green-500/10",
    corBorda: "border-green-500/40 hover:border-green-400",
    usernameHintKey: "consultor",
  },
  {
    id: "mecanico",
    label: "Mecânico",
    descricao: "OS atribuídas, pátio simplificado e checklist",
    Icon: Wrench,
    cor: "text-orange-400",
    corBg: "bg-orange-500/10",
    corBorda: "border-orange-500/40 hover:border-orange-400",
    usernameHintKey: "mecanico",
  },
];

export default function SelecionarPerfil() {
  const [, navigate] = useLocation();
  const { setRoleInfo } = useRole();
  const [selectedRole, setSelectedRole] = useState<RoleCard | null>(null);
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
        toast.info("Primeiro acesso! Defina sua senha pessoal.");
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

  function handleSelectRole(role: RoleCard) {
    setSelectedRole(role);
    setLogin("");
    setSenha("");
    setShowSenha(false);
  }

  const hints = selectedRole ? (ROLE_USERNAME_HINTS[selectedRole.usernameHintKey] ?? []) : [];

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
          {!selectedRole ? (
            <>
              <h2 className="text-lg font-semibold text-white">Selecione seu tipo de acesso</h2>
              <p className="text-sm text-gray-400 mt-1">Escolha como você vai usar o sistema hoje</p>
            </>
          ) : (
            <h2 className="text-lg font-semibold text-white">
              Entrar como <span className={selectedRole.cor}>{selectedRole.label}</span>
            </h2>
          )}
        </div>
      </div>

      {!selectedRole ? (
        /* ── PASSO 1: Grade de seleção de tipo de acesso ── */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-3xl">
          {ROLES.map((r) => {
            const Icon = r.Icon;
            return (
              <button
                key={r.id}
                onClick={() => handleSelectRole(r)}
                className={cn(
                  "group flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#161b22] border transition-all duration-200 cursor-pointer text-center",
                  r.corBorda
                )}
              >
                <div className={cn("p-3 rounded-xl", r.corBg)}>
                  <Icon className={cn("w-7 h-7", r.cor)} />
                </div>
                <div>
                  <p className={cn("text-base font-semibold", r.cor)}>{r.label}</p>
                  <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{r.descricao}</p>
                </div>
                <div className="flex items-center gap-1 text-zinc-600 text-xs mt-1">
                  <Lock className="w-3 h-3" />
                  <span>Requer login</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* ── PASSO 2: Formulário de login para o role selecionado ── */
        <div className="w-full max-w-sm">
          <div className={cn("p-6 rounded-2xl bg-[#161b22] border", selectedRole.corBorda)}>
            {/* Header do role */}
            <div className="flex items-center gap-3 mb-6">
              <div className={cn("p-2.5 rounded-xl", selectedRole.corBg)}>
                <selectedRole.Icon className={cn("w-6 h-6", selectedRole.cor)} />
              </div>
              <div>
                <p className={cn("text-lg font-bold", selectedRole.cor)}>{selectedRole.label}</p>
                <p className="text-zinc-500 text-xs">{selectedRole.descricao}</p>
              </div>
            </div>

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
                    placeholder={hints[0] ? `Ex: ${hints[0]}` : "Digite seu usuário"}
                    className="bg-zinc-800 border-zinc-700 text-white pl-9 font-mono text-sm"
                    autoFocus
                    autoComplete="username"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                </div>
                {hints.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {hints.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setLogin(h)}
                        className="text-xs text-zinc-600 hover:text-zinc-400 font-mono bg-zinc-800/60 px-2 py-0.5 rounded transition-colors"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
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
                    className="bg-zinc-800 border-zinc-700 text-white pr-10"
                    autoComplete="current-password"
                  />
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
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                {roleLogin.isPending ? "Entrando..." : `Entrar como ${selectedRole.label}`}
              </Button>

              <button
                onClick={() => { setSelectedRole(null); setLogin(""); setSenha(""); }}
                className="w-full flex items-center justify-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar para seleção de perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
