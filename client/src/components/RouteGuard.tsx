import { useEffect } from "react";
import { useLocation } from "wouter";
import { useRole } from "@/contexts/RoleContext";
import { canAccess, ROLE_HOME, type DapRole } from "../../../shared/rolePermissions";

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ["/selecionar-perfil", "/login", "/trocar-senha", "/"];

/**
 * RouteGuard — intercepta navegação e redireciona se o role não tem permissão.
 *
 * Lógica:
 * 1. Se a rota é pública → deixa passar
 * 2. Se não há role ativo → redireciona para /selecionar-perfil
 * 3. Se o role não tem permissão para a rota → redireciona para a home do role
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { role } = useRole();

  useEffect(() => {
    // Rotas públicas: sem verificação
    if (PUBLIC_ROUTES.some(r => location === r || location.startsWith(r + "?"))) {
      return;
    }

    // Sem role ativo → vai para seleção de perfil
    if (!role) {
      setLocation("/selecionar-perfil");
      return;
    }

    // Verifica permissão
    if (!canAccess(role as DapRole, location)) {
      const home = ROLE_HOME[role as DapRole] ?? "/selecionar-perfil";
      setLocation(home);
    }
  }, [location, role, setLocation]);

  return <>{children}</>;
}
