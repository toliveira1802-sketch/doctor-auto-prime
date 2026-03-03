import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Search, User, Car, Phone, Mail, Star, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminClientes() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = trpc.clientes.list.useQuery({
    search: search || undefined,
    limit,
  });

  const clientes = (data as any) ?? [];
  const total = clientes.length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">Base de clientes da oficina</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF/CNPJ, telefone, e-mail..." className="pl-10" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : clientes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum cliente encontrado</div>
          ) : (
            <div className="divide-y divide-border">
              {clientes.map((c: any) => {
                const initials = (c.nomeCompleto ?? "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                const createdAt = c.createdAt ? new Date(c.createdAt) : null;
                return (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/clientes/${c.id}`)}>
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{c.nomeCompleto}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.telefone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>}
                        {c.email && <span className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{c.email}</span>}
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-1">
                      {c.cpf && <span className="text-xs text-muted-foreground font-mono">{c.cpf}</span>}
                      {createdAt && <span className="text-xs text-muted-foreground">desde {createdAt.toLocaleDateString("pt-BR")}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.totalOs > 0 && <Badge variant="outline" className="text-xs gap-1"><Car className="h-3 w-3" />{c.totalOs} OS</Badge>}
                      {c.tipo === "pj" && <Badge variant="secondary" className="text-xs">PJ</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
