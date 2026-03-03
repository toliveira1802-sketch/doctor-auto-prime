import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Search, Plus, User, Car, Phone, Mail, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function CRM() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    cpfCnpj: "",
    endereco: "",
    observacoes: "",
  });

  const utils = trpc.useUtils();
  const { data: clientes, isLoading } = trpc.clientes.list.useQuery({
    search: search || undefined,
    limit: 100,
  });

  const createCliente = trpc.clientes.create.useMutation({
    onSuccess: () => {
      utils.clientes.list.invalidate();
      toast.success("Cliente cadastrado!");
      setDialogOpen(false);
      setForm({ nome: "", telefone: "", email: "", cpfCnpj: "", endereco: "", observacoes: "" });
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const update = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">CRM / Clientes</h1>
            <p className="text-sm text-muted-foreground">
              {clientes?.length ?? 0} clientes cadastrados
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Cadastrar Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label>Nome *</Label>
                  <Input className="mt-1 border-border" placeholder="Nome completo" value={form.nome} onChange={(e) => update("nome", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input className="mt-1 border-border" placeholder="(11) 99999-0000" value={form.telefone} onChange={(e) => update("telefone", e.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input className="mt-1 border-border" type="email" placeholder="email@..." value={form.email} onChange={(e) => update("email", e.target.value)} />
                  </div>
                  <div>
                    <Label>CPF/CNPJ</Label>
                    <Input className="mt-1 border-border" placeholder="000.000.000-00" value={form.cpfCnpj} onChange={(e) => update("cpfCnpj", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input className="mt-1 border-border" placeholder="Rua, número, bairro..." value={form.endereco} onChange={(e) => update("endereco", e.target.value)} />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input className="mt-1 border-border" placeholder="Notas sobre o cliente..." value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createCliente.mutate(form)}
                  disabled={!form.nome || createCliente.isPending}
                >
                  {createCliente.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Cadastrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            className="pl-9 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Client List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !clientes || clientes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {clientes.map((c) => (
              <Link key={c.id} href={`/crm/${c.id}`}>
                <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.nome}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {c.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{c.telefone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
