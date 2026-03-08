/**
 * Tela de Troca de Senha Obrigatória — Doctor Auto Prime
 * Aparece quando primeiroAcesso = true após login com senha padrão
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { Car, Key, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TrocarSenha() {
  const [, navigate] = useLocation();
  const { roleInfo, setRoleInfo } = useRole();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const trocarSenha = trpc.usuarios.trocarSenhaPropria.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso! Bem-vindo ao sistema.");
      // Atualiza o roleInfo para remover o flag de primeiro acesso
      if (roleInfo) {
        setRoleInfo({ ...roleInfo, primeiroAcesso: false });
      }
      // Redireciona para a área correta baseada no role
      const roleRedirects: Record<string, string> = {
        dev: "/dev/painel",
        gestao: "/gestao/os-ultimate",
        consultor: "/admin/dashboard",
        mecanico: "/admin/patio",
        cliente: "/cliente",
      };
      navigate(roleRedirects[roleInfo?.role ?? "consultor"] ?? "/admin/dashboard");
    },
    onError: (err) => {
      toast.error(err.message ?? "Erro ao trocar senha");
    },
  });

  const senhasConferem = novaSenha === confirmarSenha;
  const senhaValida = novaSenha.length >= 4;
  const podeSubmeter = senhaAtual && novaSenha && confirmarSenha && senhasConferem && senhaValida;

  function handleSubmit() {
    if (!podeSubmeter || !roleInfo?.colaboradorId) return;
    trocarSenha.mutate({
      colaboradorId: roleInfo.colaboradorId,
      senhaAtual,
      novaSenha,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && podeSubmeter) handleSubmit();
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
          <Car className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Doctor Auto Prime</h1>
          <p className="text-sm text-gray-500">Sistema de Gestão Automotiva</p>
        </div>
      </div>

      <Card className="w-full max-w-md bg-[#161b22] border-amber-500/30">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Troca de Senha Obrigatória</CardTitle>
              <CardDescription className="text-zinc-400 text-xs mt-0.5">
                Olá, <strong className="text-amber-400">{roleInfo?.nome ?? "usuário"}</strong>! Este é seu primeiro acesso.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs leading-relaxed">
              Por segurança, você precisa criar uma senha pessoal antes de continuar.
              A senha padrão <code className="bg-amber-500/20 px-1 rounded">123456</code> não poderá ser usada novamente.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Senha atual */}
          <div>
            <Label className="text-zinc-400 text-sm">Senha atual (padrão)</Label>
            <div className="relative mt-1.5">
              <Input
                type={showSenhaAtual ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite a senha atual"
                className="bg-zinc-800 border-zinc-700 text-white pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nova senha */}
          <div>
            <Label className="text-zinc-400 text-sm">Nova senha</Label>
            <div className="relative mt-1.5">
              <Input
                type={showNovaSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mínimo 4 caracteres"
                className={`bg-zinc-800 border-zinc-700 text-white pr-10 ${novaSenha && !senhaValida ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowNovaSenha(!showNovaSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {novaSenha && !senhaValida && (
              <p className="text-red-400 text-xs mt-1">Mínimo 4 caracteres</p>
            )}
          </div>

          {/* Confirmar senha */}
          <div>
            <Label className="text-zinc-400 text-sm">Confirmar nova senha</Label>
            <div className="relative mt-1.5">
              <Input
                type={showConfirmar ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Repita a nova senha"
                className={`bg-zinc-800 border-zinc-700 text-white pr-10 ${confirmarSenha && !senhasConferem ? "border-red-500" : confirmarSenha && senhasConferem ? "border-emerald-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmar(!showConfirmar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmarSenha && !senhasConferem && (
              <p className="text-red-400 text-xs mt-1">As senhas não conferem</p>
            )}
            {confirmarSenha && senhasConferem && senhaValida && (
              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Senhas conferem
              </p>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!podeSubmeter || trocarSenha.isPending}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white mt-2"
          >
            {trocarSenha.isPending ? "Salvando..." : "Definir Nova Senha e Entrar"}
          </Button>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-zinc-700">Doctor Auto Prime · Sistema Interno v2.0</p>
    </div>
  );
}
