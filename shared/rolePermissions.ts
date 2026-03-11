/**
 * Mapa de permissões de rotas por role.
 * Usado tanto no frontend (RouteGuard) quanto no backend (middleware tRPC).
 *
 * Roles:
 *   dev      — acesso total
 *   gestao   — GESTÃO + POMBAL (sem Dev)
 *   consultor — POMBAL apenas
 *   mecanico  — POMBAL apenas (view simplificado)
 *   cliente   — portal cliente (sem acesso interno)
 */

export type DapRole = "dev" | "gestao" | "consultor" | "mecanico" | "cliente";

/**
 * Prefixos de rota e os roles que têm acesso.
 * A verificação é feita por startsWith, então /gestao cobre /gestao/os-ultimate etc.
 */
export const ROUTE_PERMISSIONS: Array<{ prefix: string; allowed: DapRole[] }> = [
  // Rotas Dev — apenas dev
  { prefix: "/dev", allowed: ["dev"] },

  // Rotas Gestão — dev e gestao
  { prefix: "/gestao", allowed: ["dev", "gestao"] },

  // Rotas Admin (POMBAL) — dev, gestao, consultor, mecanico
  // Exceções dentro de /admin com acesso restrito:
  { prefix: "/admin/configuracoes", allowed: ["dev"] },
  { prefix: "/admin/integracoes",   allowed: ["dev"] },
  { prefix: "/admin/trello-migracao", allowed: ["dev"] },
  { prefix: "/admin/usuarios",      allowed: ["dev"] },
  { prefix: "/admin/financeiro",    allowed: ["dev", "gestao"] },
  { prefix: "/admin/produtividade", allowed: ["dev", "gestao"] },
  { prefix: "/admin/mecanicos/analytics", allowed: ["dev", "gestao"] },
  { prefix: "/admin/ia-qg",         allowed: ["dev", "gestao"] },
  // Restante do /admin — todos os roles internos
  { prefix: "/admin",               allowed: ["dev", "gestao", "consultor", "mecanico"] },

  // Mecânico view dedicado
  { prefix: "/mecanico",            allowed: ["dev", "gestao", "consultor", "mecanico"] },
];

/**
 * Verifica se um role tem permissão para acessar uma rota.
 * Usa a regra mais específica (maior prefixo que faz match).
 */
export function canAccess(role: DapRole | null | undefined, path: string): boolean {
  if (!role) return false;
  if (role === "dev") return true; // dev acessa tudo

  // Encontra a regra mais específica (prefixo mais longo que faz match)
  const matching = ROUTE_PERMISSIONS
    .filter(r => path === r.prefix || path.startsWith(r.prefix + "/") || path.startsWith(r.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length);

  if (matching.length === 0) return true; // sem regra = acesso livre
  return matching[0].allowed.includes(role);
}

/**
 * Retorna a rota home padrão para cada role.
 */
export const ROLE_HOME: Record<DapRole, string> = {
  dev:       "/dev/painel",
  gestao:    "/gestao/os-ultimate",
  consultor: "/admin/dashboard",
  mecanico:  "/mecanico",
  cliente:   "/selecionar-perfil",
};
