/**
 * Página de Login Local — Doctor Auto Prime
 * Seleção de perfil por nome, sem necessidade de senha (modo teste).
 */
import { useState } from "react";
import { Car, Loader2, AlertCircle, User, Shield, Briefcase, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PERFIL_ICONS: Record<string, React.ComponentType<any>> = {
  admin: Shield,
  gestor: Briefcase,
  consultor: User,
  mecanico: Wrench,
};

const PERFIL_LABELS: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestão",
  consultor: "Consultor",
  mecanico: "Mecânico",
};

const NIVEL_TO_PERFIL: Record<number, string> = {
  1: "admin",
  2: "gestor",
  3: "consultor",
  4: "mecanico",
};

// Lista de colaboradores ativos — buscada do servidor
type Colaborador = {
  id: number;
  nome: string;
  email: string | null;
  nivelAcessoId: number;
};

export default function Login() {
  const [loading, setLoading] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Colaboradores ativos (hardcoded para evitar fetch extra, sincronizado com o banco)
  const colaboradores: Colaborador[] = [
    { id: 1,     nome: "Thales",    email: "thales@doctorauto.com",    nivelAcessoId: 1 },
    { id: 2,     nome: "Sofia",     email: "sofia@doctorauto.com",     nivelAcessoId: 1 },
    { id: 30002, nome: "Simone",    email: null,                       nivelAcessoId: 1 },
    { id: 3,     nome: "Francisco", email: "francisco@doctorauto.com", nivelAcessoId: 2 },
    { id: 4,     nome: "Márcia",    email: "marcia@doctorauto.com",    nivelAcessoId: 2 },
    { id: 5,     nome: "Pedro",     email: "pedro@doctorauto.com",     nivelAcessoId: 3 },
    { id: 6,     nome: "João",      email: "joao@doctorauto.com",      nivelAcessoId: 3 },
    { id: 7,     nome: "Rony",      email: "rony@doctorauto.com",      nivelAcessoId: 3 },
    { id: 8,     nome: "Antônio",   email: "antonio@doctorauto.com",   nivelAcessoId: 3 },
  ];

  async function handleSelect(colab: Colaborador) {
    setErro(null);
    setLoading(colab.id);

    try {
      const res = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ colaboradorId: colab.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErro(data.error ?? "Erro ao fazer login");
        setLoading(null);
        return;
      }

      sessionStorage.setItem("perfil_selecionado", data.perfil);
      window.location.replace(data.redirectPath);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setLoading(null);
    }
  }

  // Group by perfil
  const grouped = colaboradores.reduce<Record<string, Colaborador[]>>((acc, c) => {
    const perfil = NIVEL_TO_PERFIL[c.nivelAcessoId] ?? "consultor";
    if (!acc[perfil]) acc[perfil] = [];
    acc[perfil]!.push(c);
    return acc;
  }, {});

  const ORDER = ["admin", "gestor", "consultor", "mecanico"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Auto Prime</h1>
          <p className="text-sm text-muted-foreground">Selecione seu perfil para entrar</p>
        </div>

        {/* Perfis */}
        <div className="space-y-4">
          {ORDER.filter((p) => grouped[p]?.length).map((perfil) => {
            const Icon = PERFIL_ICONS[perfil] ?? User;
            const members = grouped[perfil]!;
            return (
              <div key={perfil} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {PERFIL_LABELS[perfil]}
                  </span>
                </div>
                <div className="divide-y divide-border/50">
                  {members.map((colab) => (
                    <button
                      key={colab.id}
                      onClick={() => handleSelect(colab)}
                      disabled={loading !== null}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {colab.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{colab.nome}</p>
                        {colab.email && (
                          <p className="text-xs text-muted-foreground truncate">{colab.email}</p>
                        )}
                      </div>

                      {/* Loading or arrow */}
                      {loading === colab.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                      ) : (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          Entrar
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {erro && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erro}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Doctor Auto Prime · Sistema Interno v2.0
        </p>
      </div>
    </div>
  );
}
