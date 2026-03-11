import { COOKIE_NAME } from "@shared/const";
import { and, desc, eq, gte, like, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword, hashPassword, isBcryptHash, getHashedDefaultPassword } from "./passwordUtils";
import {
  agendamentos,
  clientes,
  colaboradores,
  nivelDeAcesso,
  crm,
  empresas,
  faturamento,
  listaStatus,
  mecanicos,
  melhorias,
  ordensServico,
  osHistorico,
  osItens,
  pendencias,
  recursos,
  servicosCatalogo,
  mecanicoFeedback,
  osAnexos,
  systemConfig,
  trelloSyncLog,
  trelloCardOverrides,
  veiculos,
  oficinaVagas,
  leadScores,
  leadScoreHistory,
  systemLogs,
  changelog,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router, devProcedure, gestaoProcedure, internalProcedure } from "./_core/trpc";
import { storagePut } from "./storage";
import { invalidateLLMConfigCache, getLLMConfig, LLM_DEFAULTS, getAgentConfig } from "./_core/llmConfig";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getMonthRange(mes?: number, ano?: number) {
  const now = new Date();
  const m = mes ?? now.getMonth() + 1;
  const y = ano ?? now.getFullYear();
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0, 23, 59, 59);
  return { first, last };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── APP ROUTER ──────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // Login local por role — autentica pelo banco de dados (com bcrypt)
    roleLogin: publicProcedure
      .input(z.object({ login: z.string(), senha: z.string(), perfil: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

        // Busca colaborador pelo username (case-insensitive)
        const allColabs = await db
          .select()
          .from(colaboradores)
          .limit(50);
        const colab = allColabs.find(
          (c) => c.username?.toLowerCase() === input.login.toLowerCase()
        );

        if (!colab || !colab.ativo) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não encontrado ou inativo" });
        }

        // Verify password (bcrypt or plain-text legacy)
        const storedPassword = colab.senha ?? "123456";
        const passwordValid = await verifyPassword(input.senha, storedPassword);

        if (!passwordValid) {
          const newAttempts = (colab.failedAttempts ?? 0) + 1;
          if (newAttempts >= 3) {
            // Regra: após 3 erros consecutivos, reset automático para 123456 + marca primeiroAcesso
            const hashedDefault = await getHashedDefaultPassword();
            await db.update(colaboradores)
              .set({ senha: hashedDefault, primeiroAcesso: true, failedAttempts: 0, lockedUntil: null })
              .where(eq(colaboradores.id, colab.id));
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Senha resetada para 123456 após 3 tentativas erradas. Use a senha padrão e troque no primeiro acesso."
            });
          }
          await db.update(colaboradores)
            .set({ failedAttempts: newAttempts })
            .where(eq(colaboradores.id, colab.id));
          const remaining = 3 - newAttempts;
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `Senha incorreta. ${remaining} tentativa(s) restante(s) antes do reset automático para 123456.`
          });
        }

        // Login bem-sucedido: resetar contador de tentativas e migrar plain-text para bcrypt
        const updateOnSuccess: Record<string, unknown> = { failedAttempts: 0, lockedUntil: null };
        if (!isBcryptHash(storedPassword)) {
          updateOnSuccess.senha = await hashPassword(storedPassword);
        }
        await db.update(colaboradores).set(updateOnSuccess).where(eq(colaboradores.id, colab.id));

        const nivelToRoleByDbId: Record<number, string> = {
          1: "dev", 2: "gestao", 3: "consultor", 4: "mecanico", 5: "cliente", 6: "mecanico",
        };
        const role = nivelToRoleByDbId[colab.nivelAcessoId ?? 5] ?? "consultor";

        return {
          role,
          nome: colab.nome,
          login: colab.username ?? input.login,
          colaboradorId: colab.id,
          mecanicoRefId: colab.mecanicoRefId ?? null,
          primeiroAcesso: colab.primeiroAcesso ?? false,
        };
      }),
  }),

  // ─── USUÁRIOS (gerenciamento pelo Dev) ────────────────────────────────────
  usuarios: router({
    list: devProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: colaboradores.id,
          nome: colaboradores.nome,
          cargo: colaboradores.cargo,
          username: colaboradores.username,
          senha: colaboradores.senha,
          primeiroAcesso: colaboradores.primeiroAcesso,
          nivelAcessoId: colaboradores.nivelAcessoId,
          ativo: colaboradores.ativo,
        })
        .from(colaboradores)
        .orderBy(colaboradores.nivelAcessoId, colaboradores.nome);
      return rows;
    }),

    resetSenha: devProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const hashedDefault = await getHashedDefaultPassword();
        await db.update(colaboradores)
          .set({ senha: hashedDefault, primeiroAcesso: true, failedAttempts: 0, lockedUntil: null })
          .where(eq(colaboradores.id, input.id));
        return { success: true };
      }),

    alterarSenha: devProcedure
      .input(z.object({ id: z.number(), novaSenha: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const hashed = await hashPassword(input.novaSenha);
        await db.update(colaboradores)
          .set({ senha: hashed, primeiroAcesso: false })
          .where(eq(colaboradores.id, input.id));
        return { success: true };
      }),

    trocarSenhaPropria: publicProcedure
      .input(z.object({ colaboradorId: z.number(), senhaAtual: z.string(), novaSenha: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [colab] = await db
          .select({ id: colaboradores.id, senha: colaboradores.senha })
          .from(colaboradores)
          .where(eq(colaboradores.id, input.colaboradorId))
          .limit(1);
        if (!colab) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        const storedPassword = colab.senha ?? "123456";
        const valid = await verifyPassword(input.senhaAtual, storedPassword);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });
        }
        const hashed = await hashPassword(input.novaSenha);
        await db.update(colaboradores)
          .set({ senha: hashed, primeiroAcesso: false })
          .where(eq(colaboradores.id, input.colaboradorId));
        return { success: true };
      }),

    criarUsuario: devProcedure
      .input(z.object({
        nome: z.string().min(2),
        cargo: z.string().optional(),
        setor: z.string().optional(),
        username: z.string().min(3),
        telefone: z.string().optional(),
        nivelAcessoId: z.number().default(3),
        empresaId: z.number().default(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [existing] = await db
          .select({ id: colaboradores.id })
          .from(colaboradores)
          .where(eq(colaboradores.username, input.username))
          .limit(1);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Username já está em uso" });
        const hashedDefault = await getHashedDefaultPassword();
        const result = await db.insert(colaboradores).values({
          nome: input.nome,
          cargo: input.cargo,
          setor: input.setor,
          username: input.username,
          telefone: input.telefone,
          senha: hashedDefault,
          primeiroAcesso: true,
          nivelAcessoId: input.nivelAcessoId,
          empresaId: input.empresaId,
          ativo: true,
          failedAttempts: 0,
        });
        return { id: Number((result as any).insertId), success: true };
      }),

    toggleAtivo: devProcedure
      .input(z.object({ id: z.number(), ativo: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(colaboradores)
          .set({ ativo: input.ativo })
          .where(eq(colaboradores.id, input.id));
        return { success: true };
      }),

    // Vincula um colaborador mecânico ao registro em 03_mecanicos
    vincularMecanico: devProcedure
      .input(z.object({ colaboradorId: z.number(), mecanicoRefId: z.number().nullable() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(colaboradores)
          .set({ mecanicoRefId: input.mecanicoRefId })
          .where(eq(colaboradores.id, input.colaboradorId));
        return { success: true };
      }),

    // Lista colaboradores com mecanicoRefId incluído
    listComMecanico: devProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: colaboradores.id,
          nome: colaboradores.nome,
          cargo: colaboradores.cargo,
          username: colaboradores.username,
          senha: colaboradores.senha,
          primeiroAcesso: colaboradores.primeiroAcesso,
          nivelAcessoId: colaboradores.nivelAcessoId,
          ativo: colaboradores.ativo,
          mecanicoRefId: colaboradores.mecanicoRefId,
        })
        .from(colaboradores)
        .orderBy(colaboradores.nivelAcessoId, colaboradores.nome);
      return rows;
    }),
  }),

  // ─── DASHBOARD KPIs ────────────────────────────────────────────────────────
  dashboard: router({
    kpis: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { veiculosNoPatio: 0, agendamentosHoje: 0, faturamentoMes: 0, entregasMes: 0, metaMes: 200000, percentualMeta: 0, statusCounts: [] };

      const today = todayStr();
      const { first, last } = getMonthRange();

      const [patioCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ordensServico)
        .where(sql`${ordensServico.status} NOT IN ('Entregue', 'Cancelada')`);

      const [agCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agendamentos)
        .where(sql`${agendamentos.dataAgendamento} = ${today}`);

      const [fatMes] = await db
        .select({ total: sql<number>`COALESCE(SUM(valor), 0)` })
        .from(faturamento)
        .where(and(gte(faturamento.createdAt, first), lte(faturamento.createdAt, last)));

      const [entregasMes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ordensServico)
        .where(and(eq(ordensServico.status, "Entregue"), gte(ordensServico.updatedAt, first), lte(ordensServico.updatedAt, last)));

      const [metaConfig] = await db
        .select({ valor: systemConfig.valor })
        .from(systemConfig)
        .where(eq(systemConfig.chave, "meta_mensal_prime"));

      const metaMes = Number(metaConfig?.valor ?? 200000);
      const fatTotal = Number(fatMes?.total ?? 0);

      const statusCounts = await db
        .select({ status: ordensServico.status, count: sql<number>`count(*)` })
        .from(ordensServico)
        .where(sql`${ordensServico.status} NOT IN ('Entregue', 'Cancelada')`)
        .groupBy(ordensServico.status);

      return {
        veiculosNoPatio: Number(patioCount?.count ?? 0),
        agendamentosHoje: Number(agCount?.count ?? 0),
        faturamentoMes: fatTotal,
        entregasMes: Number(entregasMes?.count ?? 0),
        metaMes,
        percentualMeta: metaMes > 0 ? Math.round((fatTotal / metaMes) * 100) : 0,
        statusCounts: statusCounts.map((s) => ({ status: s.status, count: Number(s.count) })),
      };
    }),

    financeiro: protectedProcedure
      .input(z.object({ mes: z.string().optional(), consultor: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { fatMensal: 0, metaMes: 200000, percentual: 0, ticketMedio: 0, totalOS: 0, mixServicos: [], topOS: [], crescimento: 0, historicoMensal: [] };

        // Parse mes string like "2026-03" or default to current month
        let mes = new Date().getMonth() + 1;
        let ano = new Date().getFullYear();
        if (input?.mes) {
          const parts = input.mes.split("-");
          if (parts.length === 2) {
            ano = parseInt(parts[0]!);
            mes = parseInt(parts[1]!);
          }
        }
        const { first, last } = getMonthRange(mes, ano);

        const [totalFatRow] = await db
          .select({ total: sql<number>`COALESCE(SUM(valor), 0)` })
          .from(faturamento)
          .where(and(gte(faturamento.createdAt, first), lte(faturamento.createdAt, last)));

        const [metaConfig] = await db
          .select({ valor: systemConfig.valor })
          .from(systemConfig)
          .where(eq(systemConfig.chave, "meta_mensal_prime"));

        const totalFat = Number(totalFatRow?.total ?? 0);
        const metaMes = Number(metaConfig?.valor ?? 200000);

        const osEntregues = await db
          .select({ os: ordensServico, cliente: clientes })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .where(and(eq(ordensServico.status, "Entregue"), gte(ordensServico.updatedAt, first), lte(ordensServico.updatedAt, last)))
          .orderBy(desc(ordensServico.valorTotalOs))
          .limit(10);

        const mixServicos = await db
          .select({ motivoVisita: ordensServico.motivoVisita, count: sql<number>`count(*)` })
          .from(ordensServico)
          .where(gte(ordensServico.createdAt, first))
          .groupBy(ordensServico.motivoVisita)
          .limit(8);

        const totalOSCount = osEntregues.length;
        const ticketMedio = totalOSCount > 0 ? totalFat / totalOSCount : 0;

        // Build 6-month historical data
        const historicoMensal: { mes: string; total: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(ano, mes - 1 - i, 1);
          const hMes = d.getMonth() + 1;
          const hAno = d.getFullYear();
          const { first: hFirst, last: hLast } = getMonthRange(hMes, hAno);
          const [hRow] = await db
            .select({ total: sql<number>`COALESCE(SUM(valor), 0)` })
            .from(faturamento)
            .where(and(gte(faturamento.createdAt, hFirst), lte(faturamento.createdAt, hLast)));
          historicoMensal.push({
            mes: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
            total: Number(hRow?.total ?? 0),
          });
        }

        // Extra fields for the new Financeiro dashboard
        const [aprovadoRow] = await db
          .select({ total: sql<number>`COALESCE(SUM(${ordensServico.valorTotalOs}), 0)` })
          .from(ordensServico)
          .where(sql`${ordensServico.status} NOT IN ('Entregue','Cancelada')`);
        const today2 = new Date(); today2.setHours(0,0,0,0);
        const tomorrow2 = new Date(today2); tomorrow2.setDate(tomorrow2.getDate()+1);
        const [saidaHojeRow] = await db
          .select({ total: sql<number>`COALESCE(SUM(${ordensServico.valorTotalOs}), 0)`, count: sql<number>`count(*)` })
          .from(ordensServico)
          .where(and(eq(ordensServico.status, "Entregue"), gte(ordensServico.dataSaida, today2), lte(ordensServico.dataSaida, tomorrow2)));
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const diasPassados = Math.max(1, new Date().getDate());
        const diasRestantes = Math.max(1, diasNoMes - diasPassados);
        const mediaDia = totalFat > 0 ? totalFat / diasPassados : 0;
        const mediaDiaParaAtingir = metaMes > totalFat ? (metaMes - totalFat) / diasRestantes : 0;
        const [presosRow] = await db
          .select({ count: sql<number>`count(*)`, total: sql<number>`COALESCE(SUM(${ordensServico.valorTotalOs}), 0)` })
          .from(ordensServico)
          .where(eq(ordensServico.status, "Aguard. Pecas"));
        const [atrasadosRow] = await db
          .select({ count: sql<number>`count(*)`, total: sql<number>`COALESCE(SUM(${ordensServico.valorTotalOs}), 0)` })
          .from(ordensServico)
          .where(and(sql`${ordensServico.status} NOT IN ('Entregue','Cancelada')`, lte(ordensServico.createdAt, new Date(Date.now() - 3*24*60*60*1000))));
        return {
          fatMensal: totalFat,
          metaMes,
          percentual: metaMes > 0 ? Math.round((totalFat / metaMes) * 100) : 0,
          ticketMedio,
          totalOS: totalOSCount,
          aprovadoPatio: Number(aprovadoRow?.total ?? 0),
          saidaHoje: Number(saidaHojeRow?.total ?? 0),
          saidaHojeCount: Number(saidaHojeRow?.count ?? 0),
          atrasadosCount: Number(atrasadosRow?.count ?? 0),
          atrasadosValor: Number(atrasadosRow?.total ?? 0),
          presosCount: Number(presosRow?.count ?? 0),
          presosValor: Number(presosRow?.total ?? 0),
          entreguesMes: totalOSCount,
          mediaDia,
          mediaDiaParaAtingir,
          diasRestantes,
          projecaoFechamento: mediaDia * diasNoMes,
          mixServicos: mixServicos.map((m) => ({ tipo: m.motivoVisita ?? "Outros", count: Number(m.count) })),
          topOS: osEntregues.map((r) => ({
            id: r.os.id,
            numeroOs: r.os.numeroOs,
            cliente: r.cliente?.nomeCompleto ?? "--",
            placa: r.os.placa ?? "--",
            valor: Number(r.os.valorTotalOs ?? 0),
            status: r.os.status,
          })),
          crescimento: 0,
          historicoMensal,
        };
      }),

    produtividade: protectedProcedure
      .input(z.object({ mes: z.number().optional(), ano: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { ranking: [], metaOsSemana: 15, totalOsMes: 0 };

        const mes = input?.mes ?? new Date().getMonth() + 1;
        const ano = input?.ano ?? new Date().getFullYear();
        const { first } = getMonthRange(mes, ano);

        const osGrouped = await db
          .select({
            mecanicoId: ordensServico.mecanicoId,
            totalOS: sql<number>`count(*)`,
            totalValor: sql<number>`COALESCE(SUM(${ordensServico.valorTotalOs}), 0)`,
          })
          .from(ordensServico)
          .where(and(ne(ordensServico.status, "Cancelada"), gte(ordensServico.createdAt, first)))
          .groupBy(ordensServico.mecanicoId);

        const mecanicosList = await db.select().from(mecanicos).where(eq(mecanicos.ativo, true));

        const [metaConfig] = await db
          .select({ valor: systemConfig.valor })
          .from(systemConfig)
          .where(eq(systemConfig.chave, "meta_os_semana"));

        const metaOsSemana = Number(metaConfig?.valor ?? 15);

        const ranking = mecanicosList.map((m) => {
          const stats = osGrouped.find((g) => g.mecanicoId === m.id);
          return {
            id: m.id,
            nome: m.nome,
            especialidade: m.especialidade ?? "Geral",
            grau: m.grauConhecimento ?? "Pleno",
            totalOS: Number(stats?.totalOS ?? 0),
            totalValor: Number(stats?.totalValor ?? 0),
            positivos: m.qtdePositivos ?? 0,
            negativos: m.qtdeNegativos ?? 0,
          };
        }).sort((a, b) => b.totalOS - a.totalOS);

        return { ranking, metaOsSemana, totalOsMes: ranking.reduce((s, r) => s + r.totalOS, 0) };
      }),
  }),

  // ─── EMPRESAS ──────────────────────────────────────────────────────────────
  empresas: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(empresas).where(eq(empresas.ativo, true));
    }),
  }),

  // ─── COLABORADORES ─────────────────────────────────────────────────────────
  colaboradores: router({
    // List all colaboradores (active only by default, or all if includeInactive=true)
    list: protectedProcedure
      .input(z.object({ includeInactive: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        if (input?.includeInactive) {
          return db.select().from(colaboradores).orderBy(colaboradores.nome);
        }
        return db.select().from(colaboradores).where(eq(colaboradores.ativo, true)).orderBy(colaboradores.nome);
      }),

    // List all nivelDeAcesso options
    niveisAcesso: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(nivelDeAcesso).orderBy(nivelDeAcesso.nivelAcesso);
    }),

    // Create a new colaborador
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(2),
        cargo: z.string().optional(),
        email: z.string().email().optional(),
        telefone: z.string().optional(),
        nivelAcessoId: z.number().default(3),
        empresaId: z.number().default(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        // Check for duplicate email
        if (input.email) {
          const existing = await db.select({ id: colaboradores.id }).from(colaboradores)
            .where(eq(colaboradores.email, input.email)).limit(1);
          if (existing.length > 0) throw new TRPCError({ code: 'CONFLICT', message: 'E-mail já cadastrado' });
        }
        await db.insert(colaboradores).values({
          ...input,
          senha: '123456',
          primeiroAcesso: true,
          ativo: true,
        });
        const [created] = await db.select().from(colaboradores)
          .where(eq(colaboradores.email, input.email ?? ''))
          .orderBy(desc(colaboradores.id)).limit(1);
        return created;
      }),

    // Update an existing colaborador
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        cargo: z.string().optional(),
        email: z.string().email().optional().nullable(),
        telefone: z.string().optional().nullable(),
        nivelAcessoId: z.number().optional(),
        ativo: z.boolean().optional(),
        senha: z.string().min(4).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { id, ...data } = input;
        // Check for duplicate email (excluding current user)
        if (data.email) {
          const existing = await db.select({ id: colaboradores.id }).from(colaboradores)
            .where(and(eq(colaboradores.email, data.email), ne(colaboradores.id, id))).limit(1);
          if (existing.length > 0) throw new TRPCError({ code: 'CONFLICT', message: 'E-mail já cadastrado por outro usuário' });
        }
        await db.update(colaboradores).set(data).where(eq(colaboradores.id, id));
        return { success: true };
      }),

    // Soft delete (set ativo=false)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        await db.update(colaboradores).set({ ativo: false }).where(eq(colaboradores.id, input.id));
        return { success: true };
      }),

    // Reset password to 123456
    resetSenha: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        await db.update(colaboradores).set({ senha: '123456', primeiroAcesso: true }).where(eq(colaboradores.id, input.id));
        return { success: true };
      }),
  }),

  // ─── MECANICOS ─────────────────────────────────────────────────────────────
  mecanicos: router({
    list: protectedProcedure
      .input(z.object({ empresaId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(mecanicos).where(eq(mecanicos.ativo, true));
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        grauConhecimento: z.string().optional(),
        especialidade: z.string().optional(),
        qtdePositivos: z.number().optional(),
        qtdeNegativos: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { id, ...data } = input;
        await db.update(mecanicos).set(data).where(eq(mecanicos.id, id));
        return { success: true };
      }),
  }),

  // ─── MECANICO FEEDBACK ──────────────────────────────────────────────────────
  mecanicoFeedback: router({
    list: protectedProcedure
      .input(z.object({ mecanicoId: z.number().optional(), data: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const q = db.select().from(mecanicoFeedback);
        return q.orderBy(desc(mecanicoFeedback.createdAt));
      }),
    listToday: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const today = new Date();
      return db.select().from(mecanicoFeedback).where(gte(mecanicoFeedback.createdAt, new Date(today.getFullYear(), today.getMonth(), today.getDate())));
    }),
    add: protectedProcedure
      .input(z.object({
        mecanicoId: z.number(),
        tipo: z.enum(["positivo", "negativo"]),
        comentario: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const today = new Date();
        await db.insert(mecanicoFeedback).values({
          mecanicoId: input.mecanicoId,
          tipo: input.tipo,
          comentario: input.comentario ?? null,
          dataFeedback: today,
        });
        // Update mecanico counters
        if (input.tipo === "positivo") {
          await db.update(mecanicos).set({ qtdePositivos: sql`${mecanicos.qtdePositivos} + 1` }).where(eq(mecanicos.id, input.mecanicoId));
        } else {
          await db.update(mecanicos).set({ qtdeNegativos: sql`${mecanicos.qtdeNegativos} + 1` }).where(eq(mecanicos.id, input.mecanicoId));
        }
        return { success: true };
      }),
  }),
  // ─── RECURSOS ──────────────────────────────────────────────────────────────
  recursos: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(recursos).where(eq(recursos.ativo, true));
    }),
  }),

  // ─── OFICINA VAGAS (Mapa da Oficina) ────────────────────────────────────────
  vagas: router({
    // List all vagas with their current OS (if occupied)
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const vagasList = await db.select().from(oficinaVagas).where(eq(oficinaVagas.ativo, true)).orderBy(oficinaVagas.rowStart, oficinaVagas.colStart);
      // For occupied vagas, fetch the OS details
      const osIds = vagasList.map(v => v.osId).filter(Boolean) as number[];
      let osMap: Record<number, { placa: string | null; status: string | null; numeroOs: string | null; mecanicoId: number | null }> = {};
      if (osIds.length > 0) {
        const osList = await db.select({
          id: ordensServico.id,
          placa: ordensServico.placa,
          status: ordensServico.status,
          numeroOs: ordensServico.numeroOs,
          mecanicoId: ordensServico.mecanicoId,
        }).from(ordensServico).where(sql`${ordensServico.id} IN (${sql.join(osIds.map(id => sql`${id}`), sql`, `)})`);
        osMap = Object.fromEntries(osList.map(o => [o.id, o]));
      }
      return vagasList.map(v => ({
        ...v,
        os: v.osId ? osMap[v.osId] ?? null : null,
      }));
    }),

    // Alocar uma OS a uma vaga
    alocar: protectedProcedure
      .input(z.object({ vagaId: z.number(), osId: z.number().nullable() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(oficinaVagas).set({ osId: input.osId }).where(eq(oficinaVagas.id, input.vagaId));
        return { success: true };
      }),

    // Liberar uma vaga (set osId = null)
    liberar: protectedProcedure
      .input(z.object({ vagaId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(oficinaVagas).set({ osId: null }).where(eq(oficinaVagas.id, input.vagaId));
        return { success: true };
      }),
  }),

  // ─── LISTA STATUS ──────────────────────────────────────────────────────────
  status: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(listaStatus).where(eq(listaStatus.ativo, true)).orderBy(listaStatus.ordem);
    }),
  }),

  // ─── CLIENTES ──────────────────────────────────────────────────────────────
  clientes: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        if (input?.search) {
          return db.select().from(clientes).where(
            sql`${clientes.nomeCompleto} LIKE ${`%${input.search}%`} OR ${clientes.telefone} LIKE ${`%${input.search}%`} OR ${clientes.cpf} LIKE ${`%${input.search}%`}`
          ).limit(input.limit);
        }
        return db.select().from(clientes).orderBy(desc(clientes.createdAt)).limit(input?.limit ?? 50);
      }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [cliente] = await db.select().from(clientes).where(eq(clientes.id, input.id));
        if (!cliente) return null;
        const veiculosList = await db.select().from(veiculos).where(eq(veiculos.clienteId, input.id));
        const osList = await db
          .select({ os: ordensServico })
          .from(ordensServico)
          .where(eq(ordensServico.clienteId, input.id))
          .orderBy(desc(ordensServico.createdAt))
          .limit(20);
        const [crmRecord] = await db.select().from(crm).where(eq(crm.clienteId, input.id));
        return { ...cliente, veiculos: veiculosList, os: osList.map((r) => r.os), crm: crmRecord ?? null };
      }),

    create: protectedProcedure
      .input(z.object({
        nomeCompleto: z.string().min(2),
        cpf: z.string().optional(),
        email: z.string().optional(),
        telefone: z.string().optional(),
        dataNascimento: z.string().optional(),
        endereco: z.string().optional(),
        cep: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        origemCadastro: z.string().optional(),
        empresaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const insertData = {
          ...input,
          empresaId: input.empresaId ?? 1,
          dataNascimento: input.dataNascimento ? new Date(input.dataNascimento) : undefined,
        };
        const result = await db.insert(clientes).values(insertData);
        const insertId = Number((result as any).insertId);
        const [created] = await db.select().from(clientes).where(eq(clientes.id, insertId));
        return created ?? { id: insertId, nomeCompleto: input.nomeCompleto, telefone: input.telefone ?? null, email: input.email ?? null, cpf: input.cpf ?? null, origemCadastro: input.origemCadastro ?? 'Sistema', empresaId: input.empresaId ?? 1 };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nomeCompleto: z.string().optional(),
        cpf: z.string().optional(),
        email: z.string().optional(),
        telefone: z.string().optional(),
        endereco: z.string().optional(),
        cep: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { id, ...data } = input;
        await db.update(clientes).set(data).where(eq(clientes.id, id));
        return { success: true };
      }),
  }),

  // ─── VEICULOS ──────────────────────────────────────────────────────────────
  veiculos: router({
    list: protectedProcedure
      .input(z.object({ clienteId: z.number().optional(), search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        if (input?.clienteId) {
          return db.select().from(veiculos).where(eq(veiculos.clienteId, input.clienteId));
        }
        if (input?.search) {
          return db.select().from(veiculos).where(
            sql`${veiculos.placa} LIKE ${`%${input.search}%`} OR ${veiculos.modelo} LIKE ${`%${input.search}%`}`
          ).limit(20);
        }
        return db.select().from(veiculos).orderBy(desc(veiculos.createdAt)).limit(50);
      }),

    create: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        placa: z.string().min(7),
        marca: z.string().optional(),
        modelo: z.string().optional(),
        versao: z.string().optional(),
        ano: z.number().optional(),
        combustivel: z.string().optional(),
        kmAtual: z.number().optional(),
        cor: z.string().optional(),
        ultimaRevisaoKm: z.number().optional(),
        ultimaRevisaoData: z.string().optional(),
        origemContato: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { ultimaRevisaoData, ...rest } = input;
        const result = await db.insert(veiculos).values({
          ...rest,
          ultimaRevisaoData: ultimaRevisaoData ? new Date(ultimaRevisaoData) as any : undefined,
        });
        const veiculoId = Number((result as any).insertId);
        const [createdVeiculo] = await db.select().from(veiculos).where(eq(veiculos.id, veiculoId));
        return createdVeiculo ?? { id: veiculoId, clienteId: input.clienteId, placa: input.placa, kmAtual: input.kmAtual ?? 0, marca: input.marca ?? null, modelo: input.modelo ?? null, ano: input.ano ?? null, combustivel: input.combustivel ?? null };
      }),
  }),

  // ─── ORDENS DE SERVIÇO ─────────────────────────────────────────────────────
  os: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        colaboradorId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0 };

        const conditions = [];
        if (input?.status) conditions.push(eq(ordensServico.status, input.status));
        if (input?.colaboradorId) conditions.push(eq(ordensServico.colaboradorId, input.colaboradorId));
        if (input?.search) {
          conditions.push(sql`(${ordensServico.numeroOs} LIKE ${`%${input.search}%`} OR ${ordensServico.placa} LIKE ${`%${input.search}%`})`);
        }

        const rows = await db
          .select({ os: ordensServico, cliente: clientes, veiculo: veiculos })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(ordensServico.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);

        const items = rows.map((r) => ({
          os: r.os,
          cliente: r.cliente ? { id: r.cliente.id, nomeCompleto: r.cliente.nomeCompleto, telefone: r.cliente.telefone } : null,
          veiculo: r.veiculo ? { id: r.veiculo.id, marca: r.veiculo.marca, modelo: r.veiculo.modelo, placa: r.veiculo.placa } : null,
          mecanico: null as { id: number; nome: string } | null,
        }));
        return { items, total: items.length };
      }),

    patio: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({ os: ordensServico, cliente: clientes, veiculo: veiculos, mecanico: mecanicos })
        .from(ordensServico)
        .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
        .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
        .leftJoin(mecanicos, eq(ordensServico.mecanicoId, mecanicos.id))
        .where(sql`${ordensServico.status} NOT IN ('Entregue', 'Cancelada')`)
        .orderBy(ordensServico.createdAt);

      return rows.map((r) => ({
        os: r.os,
        cliente: r.cliente ? { id: r.cliente.id, nomeCompleto: r.cliente.nomeCompleto, telefone: r.cliente.telefone } : null,
        veiculo: r.veiculo ? { id: r.veiculo.id, marca: r.veiculo.marca, modelo: r.veiculo.modelo, placa: r.veiculo.placa } : null,
        mecanico: r.mecanico ? { id: r.mecanico.id, nome: r.mecanico.nome } : null,
      }));
    }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

            const [row] = await db
          .select({ os: ordensServico, cliente: clientes, veiculo: veiculos, mecanico: mecanicos, colaborador: colaboradores })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
          .leftJoin(mecanicos, eq(ordensServico.mecanicoId, mecanicos.id))
          .leftJoin(colaboradores, eq(ordensServico.colaboradorId, colaboradores.id))
          .where(eq(ordensServico.id, input.id));
        if (!row) return null;
        const historico = await db
          .select()
          .from(osHistorico)
          .where(eq(osHistorico.ordemServicoId, input.id))
          .orderBy(desc(osHistorico.dataAlteracao));
        const itens = await db
          .select()
          .from(osItens)
          .where(eq(osItens.ordemServicoId, input.id));
        return {
          os: row.os,
          cliente: row.cliente,
          veiculo: row.veiculo,
          mecanico: row.mecanico ? { id: row.mecanico.id, nome: row.mecanico.nome, especialidade: row.mecanico.especialidade } : null,
          colaborador: row.colaborador ? { id: row.colaborador.id, nome: row.colaborador.nome, cargo: row.colaborador.cargo } : null,
          historico,
          itens,
        };
      }),

    create: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        veiculoId: z.number(),
        placa: z.string().optional(),
        km: z.number().optional(),
        status: z.string().default("Diagnóstico"),
        colaboradorId: z.number().optional(),
        mecanicoId: z.number().optional(),
        recursoId: z.number().optional(),
        motivoVisita: z.string().optional(),
        diagnostico: z.string().optional(),
        totalOrcamento: z.number().optional(),
        valorTotalOs: z.number().optional(),
        veioDePromocao: z.boolean().optional(),
        primeiraVez: z.boolean().optional(),
        observacoes: z.string().optional(),
        // CRM fields captured at OS creation
        comoConheceu: z.string().optional(),
        tipoServico1: z.string().optional(),
        tipoServico2: z.string().optional(),
        tipoServico3: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        // Guard against NaN ids that can arrive from frontend parseInt on empty strings
        if (!input.clienteId || isNaN(input.clienteId) || input.clienteId <= 0) throw new Error("clienteId inválido");
        if (!input.veiculoId || isNaN(input.veiculoId) || input.veiculoId <= 0) throw new Error("veiculoId inválido");
        // Generate OS number: DAP-YYYYMM-XXXXX
        const now = new Date();
        const prefix = `DAP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const [lastOs] = await db
          .select({ numeroOs: ordensServico.numeroOs })
          .from(ordensServico)
          .where(like(ordensServico.numeroOs, `${prefix}%`))
          .orderBy(desc(ordensServico.id))
          .limit(1);

        let seq = 1;
        if (lastOs?.numeroOs) {
          const parts = lastOs.numeroOs.split("-");
          seq = (parseInt(parts[parts.length - 1] ?? "0") || 0) + 1;
        }
        const numeroOs = `${prefix}-${String(seq).padStart(4, "0")}`;

        const { comoConheceu, tipoServico1, tipoServico2, tipoServico3, ...osData } = input;

        const result = await db.insert(ordensServico).values({
          ...osData,
          numeroOs,
          colaboradorId: osData.colaboradorId ?? null,
          mecanicoId: osData.mecanicoId ?? null,
          recursoId: osData.recursoId ?? null,
          totalOrcamento: osData.totalOrcamento?.toString() ?? "0",
          valorTotalOs: osData.valorTotalOs?.toString() ?? "0",
        });

        const osId = Number((result as any).insertId);

        // Log history
        await db.insert(osHistorico).values({
          ordemServicoId: osId,
          statusAnterior: null,
          statusNovo: input.status ?? "Diagnóstico",
          colaboradorId: input.colaboradorId ?? null,
          observacao: "OS criada",
        });

        // Upsert CRM record
        if (comoConheceu || tipoServico1) {
          const [existingCrm] = await db.select().from(crm).where(eq(crm.clienteId, input.clienteId));
          if (existingCrm) {
            await db.update(crm).set({
              comoConheceu: comoConheceu ?? existingCrm.comoConheceu,
              tipoServico1: tipoServico1 ?? existingCrm.tipoServico1,
              tipoServico2: tipoServico2 ?? existingCrm.tipoServico2,
              tipoServico3: tipoServico3 ?? existingCrm.tipoServico3,
              ultimaPassagem: new Date(),
              totalPassagens: (existingCrm.totalPassagens ?? 0) + 1,
            }).where(eq(crm.clienteId, input.clienteId));
          } else {
            await db.insert(crm).values({
              clienteId: input.clienteId,
              comoConheceu,
              tipoServico1,
              tipoServico2,
              tipoServico3,
              ultimaPassagem: new Date(),
              totalPassagens: 1,
            });
          }
        }

        return { id: osId, numeroOs };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string(),
        observacao: z.string().optional(),
        colaboradorId: z.number().optional(),
        mecanicoId: z.number().optional(),
        recursoId: z.number().optional(),
        valorTotalOs: z.number().optional(),
        diagnostico: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [current] = await db.select().from(ordensServico).where(eq(ordensServico.id, input.id));
        if (!current) throw new Error("OS não encontrada");

        const updateData: Record<string, unknown> = { status: input.status };
        if (input.mecanicoId !== undefined) updateData.mecanicoId = input.mecanicoId;
        if (input.recursoId !== undefined) updateData.recursoId = input.recursoId;
        if (input.valorTotalOs !== undefined) updateData.valorTotalOs = input.valorTotalOs.toString();
        if (input.diagnostico !== undefined) updateData.diagnostico = input.diagnostico;
        if (input.status === "Entregue") updateData.dataSaida = new Date();

        await db.update(ordensServico).set(updateData).where(eq(ordensServico.id, input.id));

        await db.insert(osHistorico).values({
          ordemServicoId: input.id,
          statusAnterior: current.status,
          statusNovo: input.status,
          colaboradorId: input.colaboradorId ?? null,
          observacao: input.observacao ?? null,
        });

         // If delivered, record faturamento and update client stats
        if (input.status === "Entregue") {
          if (input.valorTotalOs && input.valorTotalOs > 0) {
            await db.insert(faturamento).values({
              ordemServicoId: input.id,
              clienteId: current.clienteId,
              dataEntrega: new Date(),
              valor: input.valorTotalOs.toString(),
            });
          }
          // Update client totalOsRealizadas and totalGasto, then recalculate nivelFidelidade
          const [clienteData] = await db.select().from(clientes).where(eq(clientes.id, current.clienteId));
          if (clienteData) {
            const newTotal = (clienteData.totalOsRealizadas ?? 0) + 1;
            const newGasto = parseFloat(String(clienteData.totalGasto ?? 0)) + (input.valorTotalOs ?? 0);
            let nivel = "Bronze";
            if (newTotal >= 15 || newGasto >= 20000) nivel = "VIP";
            else if (newTotal >= 8 || newGasto >= 10000) nivel = "Ouro";
            else if (newTotal >= 3 || newGasto >= 3000) nivel = "Prata";
            await db.update(clientes).set({
              totalOsRealizadas: newTotal,
              totalGasto: newGasto.toFixed(2),
              nivelFidelidade: nivel,
            }).where(eq(clientes.id, current.clienteId));
          }
          // Update CRM
          const [crmRecord] = await db.select().from(crm).where(eq(crm.clienteId, current.clienteId));
          if (crmRecord) {
            await db.update(crm).set({
              totalGasto: sql`${crm.totalGasto} + ${input.valorTotalOs ?? 0}`,
              ultimaPassagem: new Date(),
            }).where(eq(crm.clienteId, current.clienteId));
          }
        }
        return { success: true };
      }),

    addItem: protectedProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        tipo: z.string().default("servico"),
        descricao: z.string(),
        quantidade: z.number().default(1),
        valorUnitario: z.number().default(0),
        mecanicoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const valorTotal = input.quantidade * input.valorUnitario;
        await db.insert(osItens).values({
          ...input,
          quantidade: input.quantidade.toString(),
          valorUnitario: input.valorUnitario.toString(),
          valorTotal: valorTotal.toString(),
        });
        // Update OS total
        await db.update(ordensServico).set({
          totalOrcamento: sql`${ordensServico.totalOrcamento} + ${valorTotal}`,
        }).where(eq(ordensServico.id, input.ordemServicoId));
        return { success: true };
      }),

    approveItem: protectedProcedure
      .input(z.object({ itemId: z.number(), aprovado: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.update(osItens).set({ aprovado: input.aprovado }).where(eq(osItens.id, input.itemId));
        return { success: true };
      }),
    deleteItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [item] = await db.select().from(osItens).where(eq(osItens.id, input.id));
        if (item) {
          await db.update(ordensServico).set({
            totalOrcamento: sql`GREATEST(0, ${ordensServico.totalOrcamento} - ${item.valorTotal ?? 0})`,
          }).where(eq(ordensServico.id, item.ordemServicoId));
        }
        await db.delete(osItens).where(eq(osItens.id, input.id));
        return { success: true };
      }),
    updateItemStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.string(), motivoRecusa: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const updateData: Record<string, unknown> = { status: input.status };
        if (input.motivoRecusa) updateData.motivoRecusa = input.motivoRecusa;
        if (input.status === 'aprovado') updateData.aprovado = true;
        if (input.status === 'recusado') updateData.aprovado = false;
        await db.update(osItens).set(updateData).where(eq(osItens.id, input.id));
        return { success: true };
      }),
    addItemFull: protectedProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        descricao: z.string(),
        tipo: z.string().default("peca"),
        quantidade: z.number().default(1),
        valorCusto: z.number().default(0),
        margemAplicada: z.number().default(40),
        valorUnitario: z.number().default(0),
        valorTotal: z.number().default(0),
        prioridade: z.enum(["verde", "amarelo", "vermelho"]).default("amarelo"),
        status: z.string().default("pendente"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(osItens).values({
          ordemServicoId: input.ordemServicoId,
          descricao: input.descricao,
          tipo: input.tipo,
          quantidade: input.quantidade.toString(),
          valorCusto: input.valorCusto.toString(),
          margemAplicada: input.margemAplicada.toString(),
          valorUnitario: input.valorUnitario.toString(),
          valorTotal: input.valorTotal.toString(),
          prioridade: input.prioridade,
          status: input.status,
        });
        await db.update(ordensServico).set({
          totalOrcamento: sql`${ordensServico.totalOrcamento} + ${input.valorTotal}`,
        }).where(eq(ordensServico.id, input.ordemServicoId));
        return { success: true };
      }),

    addObservacao: protectedProcedure
      .input(z.object({ id: z.number(), observacao: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(osHistorico).values({
          ordemServicoId: input.id,
          statusNovo: "Observação",
          observacao: input.observacao,
          dataAlteracao: new Date(),
        });
        return { success: true };
      }),

    // alias for byId
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [row] = await db
          .select({ os: ordensServico, cliente: clientes, veiculo: veiculos, mecanico: mecanicos })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
          .leftJoin(mecanicos, eq(ordensServico.mecanicoId, mecanicos.id))
          .where(eq(ordensServico.id, input.id));
        if (!row) return null;
        const historico = await db.select().from(osHistorico).where(eq(osHistorico.ordemServicoId, input.id)).orderBy(desc(osHistorico.dataAlteracao));
        const itens = await db.select().from(osItens).where(eq(osItens.ordemServicoId, input.id));
        return { os: row.os, cliente: row.cliente, veiculo: row.veiculo, mecanico: row.mecanico, colaborador: null as null, historico, itens };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        mecanicoId: z.number().optional(),
        colaboradorId: z.number().optional(),
        recursoId: z.number().optional(),
        diagnostico: z.string().optional(),
        totalOrcamento: z.number().optional(),
        valorTotalOs: z.number().optional(),
        observacoes: z.string().optional(),
        km: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.status !== undefined) updateData.status = fields.status;
        if (fields.mecanicoId !== undefined) updateData.mecanicoId = fields.mecanicoId;
        if (fields.colaboradorId !== undefined) updateData.colaboradorId = fields.colaboradorId;
        if (fields.recursoId !== undefined) updateData.recursoId = fields.recursoId;
        if (fields.diagnostico !== undefined) updateData.diagnostico = fields.diagnostico;
        if (fields.totalOrcamento !== undefined) updateData.totalOrcamento = fields.totalOrcamento.toString();
        if (fields.valorTotalOs !== undefined) updateData.valorTotalOs = fields.valorTotalOs.toString();
        if (fields.observacoes !== undefined) updateData.observacoes = fields.observacoes;
        if (fields.km !== undefined) updateData.km = fields.km;
        await db.update(ordensServico).set(updateData).where(eq(ordensServico.id, id));
        return { success: true };
      }),
  }),

  // ─── AGENDAMENTOS ──────────────────────────────────────────────────────────
  agendamentos: router({
    list: protectedProcedure
      .input(z.object({ data: z.string().optional(), colaboradorId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions = [];
        if (input?.data) {
          conditions.push(sql`${agendamentos.dataAgendamento} = ${input.data}`);
        }
        if (input?.colaboradorId) {
          conditions.push(eq(agendamentos.colaboradorId, input.colaboradorId));
        }

        const rows = await db
          .select({ ag: agendamentos, cliente: clientes, veiculo: veiculos })
          .from(agendamentos)
          .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
          .leftJoin(veiculos, eq(agendamentos.veiculoId, veiculos.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(agendamentos.dataAgendamento, agendamentos.horaAgendamento);

        return rows.map((r) => ({
          ...r.ag,
          clienteNome: r.cliente?.nomeCompleto ?? "—",
          clienteTelefone: r.cliente?.telefone ?? "—",
          veiculoPlaca: r.veiculo?.placa ?? "—",
          veiculoModelo: r.veiculo ? `${r.veiculo.marca ?? ""} ${r.veiculo.modelo ?? ""}`.trim() : "—",
        }));
      }),

    create: protectedProcedure
      .input(z.object({
        clienteId: z.number().optional(),
        veiculoId: z.number().optional(),
        dataAgendamento: z.string(),
        horaAgendamento: z.string(),
        motivoVisita: z.string().optional(),
        colaboradorId: z.number().optional(),
        observacoes: z.string().optional(),
        origem: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(agendamentos).values({
          ...input,
          dataAgendamento: new Date(input.dataAgendamento),
          clienteId: input.clienteId ?? null,
          veiculoId: input.veiculoId ?? null,
          colaboradorId: input.colaboradorId ?? null,
        });
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.update(agendamentos).set({ status: input.status }).where(eq(agendamentos.id, input.id));
        return { success: true };
      }),

    // Lista agendamentos de um mecânico específico por data
    listByMecanico: protectedProcedure
      .input(z.object({
        mecanicoId: z.number(),
        data: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const targetDate = input.data ?? new Date().toISOString().split("T")[0];
        const rows = await db
          .select({ ag: agendamentos, cliente: clientes, veiculo: veiculos })
          .from(agendamentos)
          .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
          .leftJoin(veiculos, eq(agendamentos.veiculoId, veiculos.id))
          .where(and(
            eq(agendamentos.mecanicoId, input.mecanicoId),
            sql`${agendamentos.dataAgendamento} = ${targetDate}`,
          ))
          .orderBy(agendamentos.horaAgendamento);
        return rows.map((r) => ({
          ...r.ag,
          clienteNome: r.cliente?.nomeCompleto ?? "—",
          clienteTelefone: r.cliente?.telefone ?? "—",
          veiculoPlaca: r.veiculo?.placa ?? "—",
          veiculoModelo: r.veiculo ? `${r.veiculo.marca ?? ""} ${r.veiculo.modelo ?? ""}`.trim() : "—",
        }));
      }),

    atribuirMecanico: protectedProcedure
      .input(z.object({ id: z.number(), mecanicoId: z.number().nullable() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.update(agendamentos)
          .set({ mecanicoId: input.mecanicoId })
          .where(eq(agendamentos.id, input.id));
        return { success: true };
      }),

    updateStatusMecanico: protectedProcedure
      .input(z.object({
        id: z.number(),
        statusMecanico: z.enum(["pendente", "confirmado", "concluido"]),
        observacoesMecanico: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.update(agendamentos)
          .set({
            statusMecanico: input.statusMecanico,
            ...(input.observacoesMecanico !== undefined && { observacoesMecanico: input.observacoesMecanico }),
          })
          .where(eq(agendamentos.id, input.id));
        return { success: true };
      }),
  }),

  // ─── CRM ───────────────────────────────────────────────────────────────────
  crm: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const rows = await db
          .select({ cliente: clientes, crm: crm })
          .from(clientes)
          .leftJoin(crm, eq(clientes.id, crm.clienteId))
          .where(input?.search ? sql`${clientes.nomeCompleto} LIKE ${`%${input.search}%`}` : undefined)
          .orderBy(desc(clientes.createdAt))
          .limit(input?.limit ?? 50);

        return rows.map((r) => ({
          ...r.cliente,
          crm: r.crm,
        }));
      }),

    byClienteId: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [record] = await db.select().from(crm).where(eq(crm.clienteId, input.clienteId));
        return record ?? null;
      }),

    upsert: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        marcaCarro: z.string().optional(),
        modeloCarro: z.string().optional(),
        tipoServico1: z.string().optional(),
        tipoServico2: z.string().optional(),
        tipoServico3: z.string().optional(),
        comoConheceu: z.string().optional(),
        nivelFidelidade: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [existing] = await db.select().from(crm).where(eq(crm.clienteId, input.clienteId));
        if (existing) {
          await db.update(crm).set(input).where(eq(crm.clienteId, input.clienteId));
        } else {
          await db.insert(crm).values(input);
        }
        return { success: true };
      }),
  }),

  // ─── PENDENCIAS ────────────────────────────────────────────────────────────
  pendencias: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional(), colaboradorId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const conditions = [];
        if (input?.status) conditions.push(eq(pendencias.status, input.status));
        if (input?.colaboradorId) conditions.push(eq(pendencias.colaboradorId, input.colaboradorId));
        return db.select().from(pendencias)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(pendencias.createdAt));
      }),

    create: protectedProcedure
      .input(z.object({
        titulo: z.string(),
        descricao: z.string().optional(),
        prioridade: z.string().default("media"),
        colaboradorId: z.number().optional(),
        osId: z.number().optional(),
        empresaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(pendencias).values({
          ...input,
          colaboradorId: input.colaboradorId ?? null,
          osId: input.osId ?? null,
          empresaId: input.empresaId ?? 1,
        });
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.update(pendencias).set({ status: input.status }).where(eq(pendencias.id, input.id));
        return { success: true };
      }),
  }),

  // ─── SERVICOS CATALOGO ─────────────────────────────────────────────────────
  servicos: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(servicosCatalogo).where(eq(servicosCatalogo.ativo, true)).orderBy(servicosCatalogo.nome);
    }),

    create: protectedProcedure
      .input(z.object({
        nome: z.string(),
        descricao: z.string().optional(),
        tipo: z.string().default("servico"),
        categoria: z.string().optional(),
        valorBase: z.number().default(0),
        tempoEstimado: z.number().default(60),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(servicosCatalogo).values({
          ...input,
          valorBase: input.valorBase.toString(),
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        descricao: z.string().optional(),
        valorBase: z.number().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { id, valorBase, ...rest } = input;
        await db.update(servicosCatalogo).set({
          ...rest,
          ...(valorBase !== undefined ? { valorBase: valorBase.toString() } : {}),
        }).where(eq(servicosCatalogo.id, id));
        return { success: true };
      }),
  }),

  // ─── SYSTEM CONFIG (METAS) ─────────────────────────────────────────────────
  config: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(systemConfig);
    }),

    get: protectedProcedure
      .input(z.object({ chave: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [row] = await db.select().from(systemConfig).where(eq(systemConfig.chave, input.chave));
        return row ?? null;
      }),

    set: protectedProcedure
      .input(z.object({
        chave: z.string(),
        valor: z.string(),
        tipo: z.string().optional(),
        grupo: z.string().optional(),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(systemConfig)
          .values({ chave: input.chave, valor: input.valor, tipo: input.tipo, grupo: input.grupo, descricao: input.descricao })
          .onDuplicateKeyUpdate({ set: { valor: input.valor } });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ chave: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.delete(systemConfig).where(eq(systemConfig.chave, input.chave));
        return { success: true };
      }),
    setMany: protectedProcedure
      .input(z.array(z.object({ chave: z.string(), valor: z.string() })))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        for (const item of input) {
          await db.insert(systemConfig)
            .values({ chave: item.chave, valor: item.valor })
            .onDuplicateKeyUpdate({ set: { valor: item.valor } });
        }
        // Invalida o cache do LLM para que a próxima chamada use os novos valores
        invalidateLLMConfigCache();
        return { success: true, updated: input.length };
      }),

    // Retorna as configs do Perfil IA com os valores atuais (banco ou defaults)
    getPerfilIA: devProcedure.query(async () => {
      const cfg = await getLLMConfig();
      return {
        modelo: cfg.model,
        temperatura: cfg.temperature,
        maxTokens: cfg.maxTokens,
        systemPrompt: cfg.systemPrompt,
        modoDebug: cfg.modoDebug,
        defaults: LLM_DEFAULTS,
      };
    }),
  }),

  // ─── OS ANEXOS (MÍDIA) ───────────────────────────────────────────────────────
  osAnexos: router({
    list: protectedProcedure
      .input(z.object({ ordemServicoId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(osAnexos)
          .where(eq(osAnexos.ordemServicoId, input.ordemServicoId))
          .orderBy(desc(osAnexos.createdAt));
      }),

    upload: protectedProcedure
      .input(z.object({
        ordemServicoId: z.number(),
        nomeArquivo: z.string(),
        tipo: z.enum(["imagem", "video"]),
        mimeType: z.string(),
        tamanhoBytes: z.number().optional(),
        descricao: z.string().optional(),
        base64: z.string(), // base64-encoded file content
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        // Decode base64 to Buffer
        const buffer = Buffer.from(input.base64, "base64");
        // Generate unique file key
        const ext = input.nomeArquivo.split(".").pop() ?? "bin";
        const randomSuffix = Math.random().toString(36).slice(2, 10);
        const fileKey = `os-${input.ordemServicoId}/${Date.now()}-${randomSuffix}.${ext}`;
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        // Save metadata to DB
        const result = await db.insert(osAnexos).values({
          ordemServicoId: input.ordemServicoId,
          url,
          fileKey,
          tipo: input.tipo,
          nomeArquivo: input.nomeArquivo,
          tamanhoBytes: input.tamanhoBytes,
          descricao: input.descricao,
        });
        return { id: Number((result as any).insertId), url, fileKey };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.delete(osAnexos).where(eq(osAnexos.id, input.id));
        return { success: true };
      }),
  }),

  // ─── KOMMO INTEGRATION ────────────────────────────────────────────────────
  kommo: router({
    // Check OAuth connection status
    status: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { connected: false, domain: null, isExpired: false };
      const { kommoTokens } = await import("../drizzle/schema");
      const tokens = await db.select().from(kommoTokens).limit(1);
      if (!tokens.length) return { connected: false, domain: null, isExpired: false };
      const token = tokens[0];
      const isExpired = token.expiresAt ? token.expiresAt < Date.now() : false;
      return {
        connected: true,
        domain: token.baseDomain,
        expiresAt: token.expiresAt,
        isExpired,
      };
    }),

    // Get OAuth authorization URL
    getAuthUrl: protectedProcedure
      .input(z.object({ redirectUri: z.string() }))
      .query(async ({ input }) => {
        const clientId = process.env.KOMMO_CLIENT_ID;
        const domain = process.env.KOMMO_DOMAIN || "doctorautobosch.kommo.com";
        if (!clientId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "KOMMO_CLIENT_ID not configured" });
        const fullUrl = `https://${domain}/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(input.redirectUri)}&response_type=code`;
        return { authUrl: fullUrl };
      }),

    // Run reactivation campaign
    runReactivation: protectedProcedure.mutation(async () => {
      const { runReactivationCampaign } = await import("./kommoAgent");
      const result = await runReactivationCampaign();
      return result;
    }),

    // Qualify a lead message
    qualifyLead: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        message: z.string(),
        history: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).default([]),
      }))
      .mutation(async ({ input }) => {
        const { qualifyLead } = await import("./kommoAgent");
        const result = await qualifyLead(input.leadId, input.history, input.message);
        return result;
      }),

    // ─── Leads: listar do Kommo ───────────────────────────────────────────
    leads: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
        page: z.number().default(1),
      }).optional())
      .query(async ({ input }) => {
        const { kommoGet } = await import("./kommo");
        const limit = input?.limit ?? 50;
        const page = input?.page ?? 1;
        const params = new URLSearchParams({
          limit: String(limit),
          page: String(page),
          order: "created_at",
          with: "contacts",
        });
        try {
          const data = await kommoGet(`/leads?${params.toString()}`);
          const leads = data?._embedded?.leads ?? [];
          return {
            leads: leads.map((l: any) => ({
              id: l.id,
              name: l.name,
              price: l.price,
              status_id: l.status_id,
              pipeline_id: l.pipeline_id,
              created_at: l.created_at,
              updated_at: l.updated_at,
              responsible_user_id: l.responsible_user_id,
              contacts: l._embedded?.contacts ?? [],
              tags: l._embedded?.tags ?? [],
            })),
            total: data?.total_items ?? leads.length,
          };
        } catch (err: any) {
          if (err.message?.includes("not connected")) return { leads: [], total: 0, notConnected: true };
          throw err;
        }
      }),

    // ─── Leads: analisar em lote com IA ──────────────────────────────────
    analisarLote: protectedProcedure
      .input(z.object({ leadIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        const { kommoGet } = await import("./kommo");
        const { updateKommoLeadTemperature } = await import("./kommoAgent");
        const { invokeLLM } = await import("./_core/llm");
        const results: Array<{
          leadId: number; name: string; temperature: string;
          serviceType: string; resumo: string; nextAction: string;
        }> = [];
        for (const leadId of input.leadIds) {
          try {
            const lead = await kommoGet(`/leads/${leadId}?with=contacts,notes`);
            const notes = (lead?._embedded?.notes ?? []) as any[];
            const contacts = (lead?._embedded?.contacts ?? []) as any[];
            const history = notes
              .filter((n: any) => n.note_type === "common" || n.note_type === "amocrm_widget_message")
              .slice(-10)
              .map((n: any) => n.params?.text ?? n.params?.message ?? "")
              .filter(Boolean);
            const ctx = `Lead: ${lead.name || "Sem nome"}\nValor: R$${lead.price || 0}\nContatos: ${contacts.map((c: any) => c.name).join(", ")}\nNotas: ${history.join(" | ") || "Nenhuma"}`;
            const resp = await invokeLLM({
              messages: [
                { role: "system", content: `Você é a Ana, especialista em leads automotivos da Doctor Auto Prime (VW/Audi, remap e performance).\nAnalise o lead e retorne JSON com:\n- temperature: quente|morno|frio\n- serviceType: rapido|medio|projeto|indefinido\n- resumo: 1 frase do que o cliente quer\n- nextAction: schedule|handoff_consultant|nurture` },
                { role: "user", content: ctx },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "lead_analysis", strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      temperature: { type: "string", enum: ["quente", "morno", "frio"] },
                      serviceType: { type: "string", enum: ["rapido", "medio", "projeto", "indefinido"] },
                      resumo: { type: "string" },
                      nextAction: { type: "string", enum: ["schedule", "handoff_consultant", "nurture"] },
                    },
                    required: ["temperature", "serviceType", "resumo", "nextAction"],
                    additionalProperties: false,
                  },
                },
              },
            });
            const analysis = JSON.parse(resp.choices[0].message.content as string);
            await updateKommoLeadTemperature(leadId, analysis.temperature, analysis.resumo);
            results.push({ leadId, name: lead.name || "Sem nome", ...analysis });
          } catch (err: any) {
            results.push({ leadId, name: "Erro", temperature: "frio", serviceType: "indefinido", resumo: err.message, nextAction: "nurture" });
          }
        }
        return { results, total: results.length };
      }),

    // ─── Leads: distribuir para consultor ────────────────────────────────
    distribuir: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        leadName: z.string(),
        consultorId: z.number(),
        temperatura: z.string(),
        resumo: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const consultor = await db.select().from(colaboradores).where(eq(colaboradores.id, input.consultorId)).limit(1);
        if (!consultor.length) throw new TRPCError({ code: "NOT_FOUND", message: "Consultor não encontrado" });
        const { notifyOwner } = await import("./_core/notification");
        const tempEmoji: Record<string, string> = { quente: "🔥", morno: "🌡️", frio: "❄️" };
        await notifyOwner({
          title: `${tempEmoji[input.temperatura] ?? ""} Lead distribuído para ${consultor[0].nome}`,
          content: `Lead: ${input.leadName}\nTemperatura: ${input.temperatura}\nResumo: ${input.resumo}\nConsultor: ${consultor[0].nome}`,
        });
        return { success: true, consultor: consultor[0].nome };
      }),
  }),

  // ─── TRELLO MIGRATION ──────────────────────────────────────────────────────
  trello: router({
    fetchEntregues: protectedProcedure
      .input(z.object({ incluirFevereiro: z.boolean().default(true) }).optional())
      .query(async ({ input }) => {
        const { fetchEntregueCards, calcStats } = await import("./trelloService");
        const cards = await fetchEntregueCards(input?.incluirFevereiro ?? true);
        const stats = calcStats(cards);
        return { cards, stats, total: cards.length };
      }),

    gerarPlanilha: protectedProcedure
      .input(z.object({ incluirFevereiro: z.boolean().default(true) }).optional())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        try {
          const { fetchEntregueCards, generateExcelBuffer, calcStats } = await import("./trelloService");
          const cards = await fetchEntregueCards(input?.incluirFevereiro ?? true);
          const stats = calcStats(cards);
          const buffer = generateExcelBuffer(cards);
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const fileKey = `trello-exports/entregues-${timestamp}.xlsx`;
          const { url } = await storagePut(fileKey, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          await db.insert(trelloSyncLog).values({
            totalCards: cards.length,
            totalEntregue: cards.filter((c) => c.listaOrigem === "Entregue").length,
            totalFevereiro: cards.filter((c) => c.listaOrigem === "Entregue Fevereiro").length,
            faturamentoTotal: stats.totalFaturamento.toFixed(2),
            ticketMedio: stats.ticketMedio.toFixed(2),
            margemMedia: stats.margemMedia.toFixed(2),
            status: "sucesso",
            excelUrl: url,
            excelKey: fileKey,
          });
          return { url, fileKey, stats, totalCards: cards.length };
        } catch (err: any) {
          await db.insert(trelloSyncLog).values({ status: "erro", erro: err.message });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
        }
      }),

    historico: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(trelloSyncLog).orderBy(desc(trelloSyncLog.executadoEm)).limit(20);
    }),

    importFromTrello: protectedProcedure
      .input(z.object({
        incluirFevereiro: z.boolean().default(true),
        dryRun: z.boolean().default(false),
      }).optional())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const { fetchEntregueCards } = await import("./trelloService");
        const cards = await fetchEntregueCards(input?.incluirFevereiro ?? true);

        const results = {
          total: cards.length,
          clientesCriados: 0,
          clientesExistentes: 0,
          veiculosCriados: 0,
          veiculosExistentes: 0,
          osCriadas: 0,
          osExistentes: 0,
          erros: [] as string[],
        };

        if (input?.dryRun) {
          const placas = Array.from(new Set(cards.map(c => c.placa).filter(Boolean)));
          const existingVeiculos = await db.select({ placa: veiculos.placa }).from(veiculos);
          const existingPlacas = new Set(existingVeiculos.map(v => v.placa));
          results.veiculosExistentes = placas.filter(p => existingPlacas.has(p)).length;
          results.veiculosCriados = placas.filter(p => !existingPlacas.has(p)).length;
          results.osCriadas = cards.length;
          return results;
        }

        for (const card of cards) {
          try {
            const nomeCliente = (card.nomeCliente || card.nomeCard || "Cliente Trello").trim();
            let clienteId: number;

            const [existingCliente] = await db
              .select({ id: clientes.id })
              .from(clientes)
              .where(sql`LOWER(TRIM(${clientes.nomeCompleto})) = LOWER(TRIM(${nomeCliente}))`);

            if (existingCliente) {
              clienteId = existingCliente.id;
              results.clientesExistentes++;
            } else {
              const ins = await db.insert(clientes).values({
                nomeCompleto: nomeCliente,
                telefone: card.telefone || null,
                email: card.email || null,
                origemCadastro: "Trello",
                nivelFidelidade: "Bronze",
              });
              clienteId = Number((ins as any).insertId);
              results.clientesCriados++;
            }

            const placaNorm = (card.placa || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
            let veiculoId: number;

            if (placaNorm) {
              const [existingVeiculo] = await db
                .select({ id: veiculos.id })
                .from(veiculos)
                .where(eq(veiculos.placa, placaNorm));

              if (existingVeiculo) {
                veiculoId = existingVeiculo.id;
                results.veiculosExistentes++;
              } else {
                const vIns = await db.insert(veiculos).values({
                  clienteId,
                  placa: placaNorm,
                  marca: card.marca || null,
                  modelo: card.modelo || null,
                  ultimoKm: card.km || 0,
                  kmAtual: card.km || 0,
                  origemContato: "Trello",
                });
                veiculoId = Number((vIns as any).insertId);
                results.veiculosCriados++;
              }
            } else {
              const vIns = await db.insert(veiculos).values({
                clienteId,
                placa: `TRELLO-${card.id.slice(-6)}`,
                marca: card.marca || null,
                modelo: card.modelo || null,
                origemContato: "Trello",
              });
              veiculoId = Number((vIns as any).insertId);
              results.veiculosCriados++;
            }

            const [existingOs] = await db
              .select({ id: ordensServico.id })
              .from(ordensServico)
              .where(sql`${ordensServico.observacoes} LIKE ${`%trello:${card.id}%`}`);

            if (existingOs) {
              results.osExistentes++;
              continue;
            }

            let dataEntrada: Date | null = null;
            let dataSaida: Date | null = null;
            if (card.dataEntrada) {
              const p = new Date(card.dataEntrada);
              if (!isNaN(p.getTime())) dataEntrada = p;
            }
            if (card.dataEntregaReal) {
              const p = new Date(card.dataEntregaReal);
              if (!isNaN(p.getTime())) dataSaida = p;
            }

            await db.insert(ordensServico).values({
              clienteId,
              veiculoId,
              placa: placaNorm || null,
              km: card.km || 0,
              status: "Entregue",
              valorTotalOs: card.valorAprovado > 0 ? card.valorAprovado.toFixed(2) : "0",
              totalOrcamento: card.valorAprovado > 0 ? card.valorAprovado.toFixed(2) : "0",
              diagnostico: card.categoria || null,
              observacoes: `Importado do Trello. Lista: ${card.listaOrigem}. trello:${card.id}`,
              dataEntrada: dataEntrada ?? new Date(),
              dataSaida: dataSaida,
              createdAt: dataEntrada ?? new Date(),
            });
            results.osCriadas++;
          } catch (err: any) {
            results.erros.push(`Card ${card.id} (${card.nomeCard}): ${err?.message ?? "unknown"}`);
          }
        }

        await db.insert(trelloSyncLog).values({
          status: results.erros.length === 0 ? "sucesso" : "parcial",
          totalCards: results.total,
          totalEntregue: results.osCriadas,
          erro: results.erros.length > 0 ? results.erros.slice(0, 3).join("; ") : null,
        }).catch(() => {});

        return results;
      }),

    // Busca overrides salvos para mesclar com dados do Trello
    getOverrides: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(trelloCardOverrides);
    }),
    // Salva edição manual de um campo de um card
    updateCard: protectedProcedure
      .input(z.object({
        cardId: z.string(),
        nomeCliente: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        placa: z.string().optional(),
        marca: z.string().optional(),
        modelo: z.string().optional(),
        categoria: z.string().optional(),
        mecanico: z.string().optional(),
        responsavel: z.string().optional(),
        valorAprovado: z.string().optional(),
        valorCusto: z.string().optional(),
        km: z.string().optional(),
        dataEntrada: z.string().optional(),
        previsaoEntrega: z.string().optional(),
        diagnostico: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { cardId, ...fields } = input;
        const data: Record<string, string> = {};
        for (const [k, v] of Object.entries(fields)) {
          if (v !== undefined) data[k] = String(v);
        }
        const existing = await db.select().from(trelloCardOverrides).where(eq(trelloCardOverrides.cardId, cardId)).limit(1);
        if (existing.length > 0) {
          await db.update(trelloCardOverrides).set(data).where(eq(trelloCardOverrides.cardId, cardId));
        } else {
          await db.insert(trelloCardOverrides).values({ cardId, ...data });
        }
        return { success: true };
      }),
    boardStatus: protectedProcedure.query(async () => {
      const apiKey = process.env.TRELLO_API_KEY || "";
      const token = process.env.TRELLO_TOKEN || "";
      const boardId = process.env.TRELLO_BOARD_ID || "NkhINjF2";
      if (!apiKey || !token) return { connected: false, lists: [] };
      try {
        const res = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
        if (!res.ok) return { connected: false, lists: [] };
        const lists = await res.json();
        const listsWithCount = await Promise.all(
          lists.map(async (list: any) => {
            const cardsRes = await fetch(`https://api.trello.com/1/lists/${list.id}/cards?key=${apiKey}&token=${token}&fields=id`);
            const cards = cardsRes.ok ? await cardsRes.json() : [];
            return { id: list.id, name: list.name, totalCards: cards.length };
          })
        );
        return { connected: true, lists: listsWithCount };
      } catch {
        return { connected: false, lists: [] };
      }
    }),
  }),

  // ─── LEAD SCORING ──────────────────────────────────────────────────────────
  leadScoring: router({
    // Listar todos os scores salvos com ranking
    list: protectedProcedure
      .input(z.object({
        tier: z.string().optional(),
        consultorId: z.number().optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { scores: [], stats: null };
        let query = db.select().from(leadScores).$dynamic();
        if (input?.tier) query = query.where(eq(leadScores.tier, input.tier)) as any;
        if (input?.consultorId) query = query.where(eq(leadScores.consultorId, input.consultorId)) as any;
        const scores = await (query as any).orderBy(desc(leadScores.score)).limit(input?.limit ?? 50);
        // Compute stats
        const total = scores.length;
        const byTier = { S: 0, A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
        const byTemp = { quente: 0, morno: 0, frio: 0 } as Record<string, number>;
        let totalScore = 0;
        let totalValor = 0;
        for (const s of scores) {
          byTier[s.tier] = (byTier[s.tier] ?? 0) + 1;
          if (s.temperature) byTemp[s.temperature] = (byTemp[s.temperature] ?? 0) + 1;
          totalScore += s.score;
          totalValor += s.leadPrice ?? 0;
        }
        return {
          scores,
          stats: {
            total,
            avgScore: total > 0 ? Math.round(totalScore / total) : 0,
            totalValorEstimado: totalValor,
            byTier,
            byTemp,
          },
        };
      }),

    // Pontuar leads em lote via IA
    scoreLeads: protectedProcedure
      .input(z.object({
        leads: z.array(z.object({
          id: z.number(),
          name: z.string(),
          price: z.number().optional(),
          temperature: z.string().optional(),
          pipeline: z.string().optional(),
          serviceType: z.string().optional(),
          placa: z.string().optional(),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          lastMessage: z.string().optional(),
          createdAt: z.number().optional(),
          consultorId: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { invokeLLM } = await import("./_core/llm");
        const now = Date.now();
        const results: any[] = [];

        for (const lead of input.leads) {
          try {
            // Build scoring prompt
            const prompt = `Você é um especialista em qualificação de leads para uma oficina automotiva premium (Doctor Auto Prime) especializada em VW e Audi.

Analise este lead e retorne um JSON com a pontuação:

Lead:
- Nome: ${lead.name}
- Valor estimado: R$ ${lead.price ?? 0}
- Temperatura atual: ${lead.temperature ?? "desconhecida"}
- Pipeline: ${lead.pipeline ?? "desconhecido"}
- Tipo de serviço: ${lead.serviceType ?? "desconhecido"}
- Veículo: ${lead.marca ?? ""} ${lead.modelo ?? ""} ${lead.placa ?? ""}
- Última mensagem: ${lead.lastMessage ?? "sem mensagem"}
- Criado há: ${lead.createdAt ? Math.round((now - lead.createdAt * 1000) / 86400000) : "?"} dias

Regras de pontuação (total 0-100):
1. Valor (0-20): R$0=0, R$500=5, R$1000=10, R$2000=15, R$3000+=20
2. Temperatura (0-25): quente=25, morno=15, frio=5, desconhecido=8
3. Engajamento (0-20): mensagem recente e detalhada=20, básica=10, sem mensagem=0
4. Veículo (0-15): VW/Audi=15, Mercedes/BMW=12, outro premium=8, popular=4, desconhecido=0
5. Serviço (0-10): remap/performance=10, diagnóstico=8, manutenção=6, indefinido=3
6. Recência (0-10): criado hoje=10, 1-3 dias=8, 4-7 dias=5, 8-14 dias=3, 15+ dias=1
7. Completude (0-10): todos os dados=10, maioria=7, poucos dados=3

Retorne APENAS JSON válido:
{
  "score": <0-100>,
  "tier": "<S|A|B|C|D>",
  "temperature": "<quente|morno|frio>",
  "serviceType": "<rapido|medio|projeto|indefinido>",
  "resumo": "<1 frase explicando o score>",
  "nextAction": "<schedule|handoff_consultant|nurture>",
  "breakdown": {
    "valor": <0-20>,
    "temperatura": <0-25>,
    "engajamento": <0-20>,
    "veiculo": <0-15>,
    "servico": <0-10>,
    "recencia": <0-10>,
    "completude": <0-10>
  }
}`;

            const llmRes = await invokeLLM({
              messages: [
                { role: "system", content: "Você é um sistema de lead scoring. Retorne APENAS JSON válido, sem markdown, sem explicações." },
                { role: "user", content: prompt },
              ],
              response_format: { type: "json_object" } as any,
            });

            const content = (llmRes.choices[0]?.message?.content ?? "{}") as string;
            const parsed = JSON.parse(content);

            const tier = parsed.tier ?? "D";
            const score = Math.max(0, Math.min(100, parsed.score ?? 0));

            // Upsert: delete old score for this lead, insert new
            await db.delete(leadScores).where(eq(leadScores.leadId, lead.id));
            await db.insert(leadScores).values({
              leadId: lead.id,
              leadName: lead.name,
              score,
              tier,
              temperature: parsed.temperature ?? lead.temperature ?? "morno",
              serviceType: parsed.serviceType ?? "indefinido",
              resumo: parsed.resumo ?? "",
              nextAction: parsed.nextAction ?? "nurture",
              breakdownValor: parsed.breakdown?.valor ?? 0,
              breakdownTemperatura: parsed.breakdown?.temperatura ?? 0,
              breakdownEngajamento: parsed.breakdown?.engajamento ?? 0,
              breakdownVeiculo: parsed.breakdown?.veiculo ?? 0,
              breakdownServico: parsed.breakdown?.servico ?? 0,
              breakdownRecencia: parsed.breakdown?.recencia ?? 0,
              breakdownCompletude: parsed.breakdown?.completude ?? 0,
              consultorId: lead.consultorId ?? null,
              leadPrice: lead.price ?? 0,
              leadCreatedAt: lead.createdAt ?? null,
            });

            // Save snapshot in history table (never delete, always append)
            await db.insert(leadScoreHistory).values({
              leadId: lead.id,
              leadName: lead.name,
              score,
              tier,
              temperature: parsed.temperature ?? lead.temperature ?? "morno",
              serviceType: parsed.serviceType ?? "indefinido",
              breakdownValor: parsed.breakdown?.valor ?? 0,
              breakdownTemperatura: parsed.breakdown?.temperatura ?? 0,
              breakdownEngajamento: parsed.breakdown?.engajamento ?? 0,
              breakdownVeiculo: parsed.breakdown?.veiculo ?? 0,
              breakdownServico: parsed.breakdown?.servico ?? 0,
              breakdownRecencia: parsed.breakdown?.recencia ?? 0,
              breakdownCompletude: parsed.breakdown?.completude ?? 0,
            });

            results.push({ leadId: lead.id, score, tier, success: true });

            // Notify owner for S-tier leads
            if (tier === "S") {
              const { notifyOwner } = await import("./_core/notification");
              await notifyOwner({
                title: `🔥 Lead S-Tier: ${lead.name}`,
                content: `Score: ${score}/100 | ${parsed.resumo ?? ""} | Ação: ${parsed.nextAction ?? ""}`
              }).catch(() => {});
            }
          } catch (err: any) {
            results.push({ leadId: lead.id, score: 0, tier: "D", success: false, error: err.message });
          }
        }

        return { results, total: results.length, success: results.filter((r) => r.success).length };
      }),

    // Histórico de scores de um lead (evolução temporal)
    history: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(leadScoreHistory)
          .where(eq(leadScoreHistory.leadId, input.leadId))
          .orderBy(leadScoreHistory.scoredAt);
      }),

    // Deletar score de um lead
    deleteScore: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(leadScores).where(eq(leadScores.leadId, input.leadId));
        return { success: true };
      }),
  }),

  // ─── SYSTEM LOGS ──────────────────────────────────────────────────────────
  logs: router({
    list: protectedProcedure
      .input(z.object({
        nivel: z.enum(["info", "warn", "error", "success", "all"]).optional().default("all"),
        fonte: z.string().optional(),
        limit: z.number().min(1).max(500).optional().default(100),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const conditions = [];
        if (input?.nivel && input.nivel !== "all") {
          conditions.push(eq(systemLogs.nivel, input.nivel as "info" | "warn" | "error" | "success"));
        }
        if (input?.fonte) {
          conditions.push(like(systemLogs.fonte, `%${input.fonte}%`));
        }
        const query = db.select().from(systemLogs).orderBy(desc(systemLogs.timestamp)).limit(input?.limit ?? 100);
        if (conditions.length > 0) {
          return query.where(and(...conditions));
        }
        return query;
      }),
    add: protectedProcedure
      .input(z.object({
        nivel: z.enum(["info", "warn", "error", "success"]),
        fonte: z.string(),
        mensagem: z.string(),
        detalhes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const now = Date.now();
        await db.insert(systemLogs).values({
          timestamp: now,
          nivel: input.nivel,
          fonte: input.fonte,
          mensagem: input.mensagem,
          detalhes: input.detalhes ?? null,
          createdAt: now,
        });
        return { success: true };
      }),
    clear: protectedProcedure
      .input(z.object({
        fonte: z.string().optional(),
        nivel: z.enum(["info", "warn", "error", "success", "all"]).optional(),
        olderThanDays: z.number().optional().default(30),
      }).optional())
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const cutoff = Date.now() - ((input?.olderThanDays ?? 30) * 24 * 60 * 60 * 1000);
        const conditions = [lte(systemLogs.timestamp, cutoff)];
        if (input?.fonte) conditions.push(like(systemLogs.fonte, `%${input.fonte}%`));
        if (input?.nivel && input.nivel !== "all") {
          conditions.push(eq(systemLogs.nivel, input.nivel as "info" | "warn" | "error" | "success"));
        }
        await db.delete(systemLogs).where(and(...conditions));
        return { success: true };
      }),
    clearAll: protectedProcedure
      .mutation(async () => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(systemLogs);
        return { success: true };
      }),
  }),

  // ─── MELHORIAS / SUGESTÕES ─────────────────────────────────────────────────
  melhorias: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(melhorias).orderBy(desc(melhorias.votos));
    }),

    create: protectedProcedure
      .input(z.object({
        titulo: z.string().min(3),
        descricao: z.string().optional(),
        categoria: z.string().default("sistema"),
        criadoPor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(melhorias).values(input);
        return { id: Number((result as any).insertId) };
      }),

    vote: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(melhorias).set({ votos: sql`${melhorias.votos} + 1` }).where(eq(melhorias.id, input.id));
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["pendente", "em_analise", "aprovada", "implementada"]) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(melhorias).set({ status: input.status }).where(eq(melhorias.id, input.id));
        return { success: true };
      }),
  }),

  // ─── CHANGELOG (sininho de atualizações) ────────────────────────────────────────────────────
  changelog: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(changelog).orderBy(desc(changelog.createdAt)).limit(50);
    }),

    unreadCount: publicProcedure
      .input(z.object({ colaboradorId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { count: 0 };
        const rows = await db.select({ lidoPor: changelog.lidoPor, id: changelog.id }).from(changelog).orderBy(desc(changelog.createdAt)).limit(50);
        const unread = rows.filter(r => {
          const lidos: number[] = JSON.parse(r.lidoPor ?? "[]");
          return !lidos.includes(input.colaboradorId);
        });
        return { count: unread.length };
      }),

    markRead: publicProcedure
      .input(z.object({ id: z.number(), colaboradorId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [row] = await db.select({ lidoPor: changelog.lidoPor }).from(changelog).where(eq(changelog.id, input.id)).limit(1);
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        const lidos: number[] = JSON.parse(row.lidoPor ?? "[]");
        if (!lidos.includes(input.colaboradorId)) {
          lidos.push(input.colaboradorId);
          await db.update(changelog).set({ lidoPor: JSON.stringify(lidos) }).where(eq(changelog.id, input.id));
        }
        return { success: true };
      }),

    markAllRead: publicProcedure
      .input(z.object({ colaboradorId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rows = await db.select({ id: changelog.id, lidoPor: changelog.lidoPor }).from(changelog);
        for (const row of rows) {
          const lidos: number[] = JSON.parse(row.lidoPor ?? "[]");
          if (!lidos.includes(input.colaboradorId)) {
            lidos.push(input.colaboradorId);
            await db.update(changelog).set({ lidoPor: JSON.stringify(lidos) }).where(eq(changelog.id, row.id));
          }
        }
        return { success: true };
      }),

    create: devProcedure
      .input(z.object({
        titulo: z.string().min(3),
        descricao: z.string().min(5),
        tipo: z.enum(["feature", "fix", "improvement", "breaking"]).default("feature"),
        versao: z.string().default("1.0.0"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(changelog).values({
          titulo: input.titulo,
          descricao: input.descricao,
          tipo: input.tipo,
          versao: input.versao,
          autor: "Dev_thales",
          lidoPor: "[]",
          createdAt: Date.now(),
        });
        return { id: Number((result as any).insertId), success: true };
      }),
  }),

  // ─── AGENTES IA (Sophia → Simone | Raena) ─────────────────────────────────────────────────
  agentes: router({
    // Retorna as configs de todos os agentes (para o IAPortal)
    list: devProcedure.query(async () => {
      const agentIds = ["sophia", "simone", "raena"];
      const configs = await Promise.all(
        agentIds.map(async (id) => {
          const cfg = await getAgentConfig(id);
          return { id, ...cfg };
        })
      );
      return configs;
    }),

    // Retorna config de um agente específico
    getConfig: devProcedure
      .input(z.object({ agentId: z.enum(["sophia", "simone", "raena"]) }))
      .query(async ({ input }) => {
        return getAgentConfig(input.agentId);
      }),

    // Orquestração: Sophia analisa a mensagem e decide para quem delegar
    orquestrar: protectedProcedure
      .input(z.object({
        mensagem: z.string().min(1).max(2000),
        historico: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional().default([]),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const sophiaCfg = await getAgentConfig("sophia");

        // Sophia decide para quem delegar
        const sophiaResp = await invokeLLM({
          messages: [
            { role: "system", content: sophiaCfg.systemPrompt },
            ...input.historico.map((h) => ({ role: h.role as "user" | "assistant", content: h.content as string })),
            { role: "user", content: input.mensagem },
          ],
          max_tokens: sophiaCfg.maxTokens,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "delegacao",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  agente: { type: "string", enum: ["sophia", "simone", "raena"] },
                  motivo: { type: "string" },
                  mensagem: { type: "string" },
                },
                required: ["agente", "motivo", "mensagem"],
                additionalProperties: false,
              },
            },
          },
        });

        let delegacao: { agente: string; motivo: string; mensagem: string };
        try {
          const raw = (sophiaResp.choices?.[0]?.message?.content as string) ?? "{}";
          delegacao = JSON.parse(raw);
        } catch {
          delegacao = { agente: "sophia", motivo: "Erro ao parsear JSON", mensagem: (sophiaResp.choices?.[0]?.message?.content as string) ?? "" };
        }

        // Se Sophia delegou para outro agente, executa o agente destino
        if (delegacao.agente !== "sophia") {
          const agenteCfg = await getAgentConfig(delegacao.agente);

          // Contexto adicional para Simone (dados do sistema)
          let contextoPatch = "";
          if (delegacao.agente === "simone") {
            const db = await getDb();
            if (db) {
              const osAtivas = await db
                .select({ id: ordensServico.id, status: ordensServico.status, placa: ordensServico.placa, totalOrcamento: ordensServico.totalOrcamento, mecanicoId: ordensServico.mecanicoId })
                .from(ordensServico)
                .where(ne(ordensServico.status, "Entregue"))
                .limit(20);
              contextoPatch = `\n\nDADOS DO SISTEMA (OS ativas agora):\n${JSON.stringify(osAtivas, null, 2)}`;
            }
          } else if (delegacao.agente === "raena") {
            const { getRaenaContext } = await import("./getRaenaContext");
            const raenaCtx = await getRaenaContext();
            contextoPatch = `\n\n${raenaCtx.context}\n\nFonte dos dados: ${raenaCtx.source === "kommo_api" ? "Kommo API (tempo real)" : raenaCtx.source === "db_cache" ? "Banco local (cache)" : "Indisponível"}`;
          }

          const agenteResp = await invokeLLM({
            messages: [
              { role: "system", content: agenteCfg.systemPrompt + contextoPatch },
              ...input.historico.map((h) => ({ role: h.role as "user" | "assistant", content: h.content as string })),
              { role: "user", content: delegacao.mensagem || input.mensagem },
            ],
            max_tokens: agenteCfg.maxTokens,
          });

          // Incluir metadados de contexto Kommo quando Raena responde
          let kommoContextMeta: { source: string; leadCount: number } | undefined;
          if (delegacao.agente === "raena") {
            const { getRaenaContext } = await import("./getRaenaContext");
            const raenaCtx = await getRaenaContext();
            kommoContextMeta = { source: raenaCtx.source, leadCount: raenaCtx.leadCount };
          }
          return {
            agente: delegacao.agente as "sophia" | "simone" | "raena",
            motivo: delegacao.motivo,
            resposta: agenteResp.choices?.[0]?.message?.content ?? "",
            delegado: true,
            kommoContext: kommoContextMeta,
          };
        }

        // Sophia respondeu diretamente
        return {
          agente: "sophia" as const,
          motivo: delegacao.motivo,
          resposta: delegacao.mensagem,
          delegado: false,
        };
      }),

    // Chat direto com um agente específico (sem orquestração)
    chat: protectedProcedure
      .input(z.object({
        agentId: z.enum(["sophia", "simone", "raena"]),
        mensagem: z.string().min(1).max(2000),
        historico: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional().default([]),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const cfg = await getAgentConfig(input.agentId);

        // Contexto adicional por agente
        let contextoPatch = "";
        if (input.agentId === "simone") {
          const db = await getDb();
          if (db) {
            const osAtivas = await db
              .select({ id: ordensServico.id, status: ordensServico.status, placa: ordensServico.placa, totalOrcamento: ordensServico.totalOrcamento, mecanicoId: ordensServico.mecanicoId })
              .from(ordensServico)
              .where(ne(ordensServico.status, "Entregue"))
              .limit(20);
            contextoPatch = `\n\nDADOS DO SISTEMA (OS ativas agora):\n${JSON.stringify(osAtivas, null, 2)}`;
          }
        } else if (input.agentId === "raena") {
          const { getRaenaContext } = await import("./getRaenaContext");
          const raenaCtx = await getRaenaContext();
          contextoPatch = `\n\n${raenaCtx.context}\n\nFonte dos dados: ${raenaCtx.source === "kommo_api" ? "Kommo API (tempo real)" : raenaCtx.source === "db_cache" ? "Banco local (cache)" : "Indisponível"}`;
        }

        const resp = await invokeLLM({
          messages: [
            { role: "system", content: cfg.systemPrompt + contextoPatch },
            ...input.historico.map((h) => ({ role: h.role as "user" | "assistant", content: h.content as string })),
            { role: "user", content: input.mensagem },
          ],
          max_tokens: cfg.maxTokens,
        });

        return {
          agente: input.agentId,
          resposta: resp.choices?.[0]?.message?.content ?? "",
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;
