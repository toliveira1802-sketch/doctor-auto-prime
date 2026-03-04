/**
 * AdminUsuarios — Gerenciamento de Contas de Usuários
 * CRUD completo: criar, editar, desativar e resetar senha de colaboradores.
 * Acesso restrito a administradores.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  UserPlus,
  MoreVertical,
  Pencil,
  Trash2,
  KeyRound,
  Search,
  ShieldCheck,
  User,
  RefreshCw,
} from "lucide-react";

type Colaborador = {
  id: number;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  nivelAcessoId: number | null;
  ativo: boolean | null;
  primeiroAcesso: boolean | null;
};

type NivelAcesso = {
  id: number;
  tipoUsuario: string;
  nivelAcesso: number | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function nivelLabel(nivelId: number | null, niveis: NivelAcesso[]): string {
  const n = niveis.find((n) => n.id === nivelId);
  return n?.tipoUsuario ?? "—";
}

function nivelBadgeVariant(nivelId: number | null): "default" | "secondary" | "outline" | "destructive" {
  if (nivelId === 1) return "default";     // Direção
  if (nivelId === 2) return "secondary";   // Gestão
  if (nivelId === 3) return "outline";     // Consultor
  return "outline";
}

const EMPTY_FORM = {
  nome: "",
  cargo: "",
  email: "",
  telefone: "",
  nivelAcessoId: 3,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminUsuarios() {
  const utils = trpc.useUtils();

  // Data
  const [showInactive, setShowInactive] = useState(false);
  const { data: users = [], isLoading } = trpc.colaboradores.list.useQuery(
    { includeInactive: showInactive },
    { refetchOnWindowFocus: false }
  );
  const { data: niveis = [] } = trpc.colaboradores.niveisAcesso.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Search
  const [search, setSearch] = useState("");
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.nome.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.cargo ?? "").toLowerCase().includes(q)
    );
  });

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<Colaborador | null>(null);
  const [deleteUser, setDeleteUser] = useState<Colaborador | null>(null);
  const [resetUser, setResetUser] = useState<Colaborador | null>(null);

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState<Partial<Colaborador & { senha?: string }>>({});

  // Mutations
  const createMutation = trpc.colaboradores.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso! Senha inicial: 123456");
      utils.colaboradores.list.invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.colaboradores.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      utils.colaboradores.list.invalidate();
      setEditUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.colaboradores.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário desativado.");
      utils.colaboradores.list.invalidate();
      setDeleteUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMutation = trpc.colaboradores.resetSenha.useMutation({
    onSuccess: () => {
      toast.success("Senha resetada para 123456. O usuário deverá trocar no próximo acesso.");
      utils.colaboradores.list.invalidate();
      setResetUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Reactivate (toggle ativo)
  const reactivateMutation = trpc.colaboradores.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário reativado com sucesso!");
      utils.colaboradores.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function openEdit(u: Colaborador) {
    setEditUser(u);
    setEditForm({
      nome: u.nome,
      cargo: u.cargo ?? "",
      email: u.email ?? "",
      telefone: u.telefone ?? "",
      nivelAcessoId: u.nivelAcessoId ?? 3,
    });
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crie, edite e gerencie as contas de acesso ao sistema.
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer">Mostrar inativos</Label>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {filtered.length} usuário{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[200px]">Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[60px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className={!u.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.nome}</span>
                      {u.primeiroAcesso && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-yellow-500/50 text-yellow-400">
                          1º acesso
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.cargo ?? "—"}</TableCell>
                  <TableCell className="text-sm">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={nivelBadgeVariant(u.nivelAcessoId)} className="text-xs gap-1">
                      {u.nivelAcessoId === 1 ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {nivelLabel(u.nivelAcessoId, niveis)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "default" : "destructive"} className="text-xs">
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetUser(u)}>
                          <KeyRound className="h-4 w-4 mr-2" /> Resetar Senha
                        </DropdownMenuItem>
                        {u.ativo ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteUser(u)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Desativar
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-green-500 focus:text-green-500"
                              onClick={() => reactivateMutation.mutate({ id: u.id, ativo: true })}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" /> Reativar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── CREATE MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              A senha inicial será <strong>123456</strong>. O usuário deverá alterá-la no primeiro acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input
                placeholder="Ex: Consultor de Vendas"
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="usuario@doctorauto.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nível de Acesso *</Label>
              <Select
                value={String(form.nivelAcessoId)}
                onValueChange={(v) => setForm((f) => ({ ...f, nivelAcessoId: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {niveis.map((n) => (
                    <SelectItem key={n.id} value={String(n.id)}>
                      {n.tipoUsuario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({ ...form, empresaId: 1 })}
              disabled={!form.nome || createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT MODAL ───────────────────────────────────────────────────── */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize os dados de <strong>{editUser?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={editForm.nome ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input
                value={editForm.cargo ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, cargo: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editForm.email ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={editForm.telefone ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nível de Acesso</Label>
              <Select
                value={String(editForm.nivelAcessoId ?? 3)}
                onValueChange={(v) => setEditForm((f) => ({ ...f, nivelAcessoId: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {niveis.map((n) => (
                    <SelectItem key={n.id} value={String(n.id)}>
                      {n.tipoUsuario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nova Senha <span className="text-muted-foreground text-xs">(deixe em branco para não alterar)</span></Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={editForm.senha ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, senha: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!editUser) return;
                const payload: Record<string, unknown> = { id: editUser.id };
                if (editForm.nome) payload.nome = editForm.nome;
                if (editForm.cargo !== undefined) payload.cargo = editForm.cargo;
                if (editForm.email !== undefined) payload.email = editForm.email;
                if (editForm.telefone !== undefined) payload.telefone = editForm.telefone;
                if (editForm.nivelAcessoId) payload.nivelAcessoId = editForm.nivelAcessoId;
                if (editForm.senha && editForm.senha.length >= 4) payload.senha = editForm.senha;
                updateMutation.mutate(payload as Parameters<typeof updateMutation.mutate>[0]);
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ───────────────────────────────────────────────── */}
      <Dialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desativar Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar <strong>{deleteUser?.nome}</strong>? O usuário perderá acesso ao sistema, mas seus dados serão preservados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteUser && deleteMutation.mutate({ id: deleteUser.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Desativando..." : "Desativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RESET PASSWORD CONFIRM ───────────────────────────────────────── */}
      <Dialog open={!!resetUser} onOpenChange={(o) => !o && setResetUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              A senha de <strong>{resetUser?.nome}</strong> será redefinida para <strong>123456</strong>. O usuário precisará trocar a senha no próximo acesso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>Cancelar</Button>
            <Button
              onClick={() => resetUser && resetMutation.mutate({ id: resetUser.id })}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? "Resetando..." : "Confirmar Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
