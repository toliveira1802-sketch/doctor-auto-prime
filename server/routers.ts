import { COOKIE_NAME } from "@shared/const";
import { and, desc, eq, gte, like, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  agendamentos,
  clientes,
  colaboradores,
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
} from "../drizzle/schema";
import { getDb } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

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
    list: protectedProcedure
      .input(z.object({ empresaId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const q = db.select().from(colaboradores).where(eq(colaboradores.ativo, true));
        return q;
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
        const result = await db.insert(clientes).values({
          ...input,
          empresaId: input.empresaId ?? 1,
          dataNascimento: input.dataNascimento ? new Date(input.dataNascimento) : undefined,
        });
        return { id: Number((result as any).insertId) };
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
        return { id: Number((result as any).insertId), placa: input.placa, kmAtual: input.kmAtual ?? 0, marca: input.marca, modelo: input.modelo, ano: input.ano };
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

        // Generate OS number: DAP-YYYYMM-XXXX
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
      .input(z.object({ chave: z.string(), valor: z.string(), descricao: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(systemConfig)
          .values({ chave: input.chave, valor: input.valor, descricao: input.descricao })
          .onDuplicateKeyUpdate({ set: { valor: input.valor } });
        return { success: true };
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
});
export type AppRouter = typeof appRouter;
