import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ─── DAP ROLE PROCEDURES ─────────────────────────────────────────────────────
// Estas procedures usam o header x-dap-role enviado pelo frontend para
// proteger endpoints sensíveis contra acesso direto por URL ou chamadas de API
// por roles não autorizados. Complementam (não substituem) o RouteGuard do frontend.

/**
 * Extrai o role DAP do header x-dap-role.
 * Helper interno reutilizado pelos middlewares abaixo.
 */
function getDapRole(ctx: TrpcContext): string | null {
  return (ctx.req.headers['x-dap-role'] as string | undefined) ?? null;
}

/**
 * devProcedure — apenas role 'dev' tem acesso.
 * Usado para: Painel DEV, configurações, integrações, gerenciamento de usuários.
 */
export const devProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const dapRole = getDapRole(ctx);
    if (dapRole !== 'dev') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Acesso restrito ao perfil Dev.',
      });
    }
    return next({ ctx: { ...ctx, dapRole } });
  }),
);

/**
 * gestaoProcedure — roles 'dev' e 'gestao' têm acesso.
 * Usado para: OS Ultimate, visão geral, financeiro estratégico, metas, relatórios.
 */
export const gestaoProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const dapRole = getDapRole(ctx);
    if (!dapRole || !['dev', 'gestao'].includes(dapRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Acesso restrito ao perfil Gestão ou Dev.',
      });
    }
    return next({ ctx: { ...ctx, dapRole } });
  }),
);

/**
 * internalProcedure — qualquer role interno autenticado (dev, gestao, consultor, mecanico).
 * Bloqueia apenas requisições sem role (não autenticadas no sistema DAP).
 */
export const internalProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const dapRole = getDapRole(ctx);
    const internalRoles = ['dev', 'gestao', 'consultor', 'mecanico'];
    if (!dapRole || !internalRoles.includes(dapRole)) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Faça login para acessar o sistema.',
      });
    }
    return next({ ctx: { ...ctx, dapRole } });
  }),
);
