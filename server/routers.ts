import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  clientes,
  veiculos,
  mecanicos,
  colaboradores,
  ordensServico,
  ordensServicoItens,
  ordensServicoHistorico,
  agendamentos,
  faturamento,
  servicosCatalogo,
  listaStatus,
  crm,
  metasFinanceiras,
  recursos,
} from "../drizzle/schema";
import { eq, desc, and, gte, lte, sql, like, or, ne } from "drizzle-orm";

// ─── App Router ───────────────────────────────────────────────────────────────
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

  // ─── Dashboard KPIs ────────────────────────────────────────────────────────
  dashboard: router({
    kpis: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Veículos no pátio (não entregues, não cancelados)
      const [patioCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ordensServico)
        .where(sql`${ordensServico.status} NOT IN ('Entregue', 'Cancelada')`);

      // Agendamentos hoje
      const [agCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agendamentos)
        .where(sql`DATE(${agendamentos.dataAgendamento}) = ${todayStr}`);

      // Faturamento do mês
      const [fatMes] = await db
        .select({ total: sql<number>`COALESCE(SUM(valor), 0)`, count: sql<number>`count(*)` })
        .from(faturamento)
        .where(gte(faturamento.createdAt, firstOfMonth));

      // Entregas do mês
      const [entregues] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ordensServico)
        .where(and(eq(ordensServico.status, "Entregue"), gte(ordensServico.updatedAt, firstOfMonth)));

      // Meta do mês
      const [meta] = await db
        .select()
        .from(metasFinanceiras)
        .where(
          and(
            eq(metasFinanceiras.mes, today.getMonth() + 1),
            eq(metasFinanceiras.ano, today.getFullYear())
          )
        )
        .limit(1);

      // Status counts para o gráfico do pátio
      const statusCounts = await db
        .select({ status: ordensServico.status, count: sql<number>`count(*)` })
        .from(ordensServico)
        .where(sql`${ordensServico.status} NOT IN ('Entregue', 'Cancelada')`)
        .groupBy(ordensServico.status);

      return {
        veiculosNoPatio: Number(patioCount?.count ?? 0),
        agendamentosHoje: Number(agCount?.count ?? 0),
        faturamentoMes: Number(fatMes?.total ?? 0),
        entreguesMes: Number(entregues?.count ?? 0),
        metaMensal: meta ? Number(meta.metaMensal ?? 200000) : 200000,
        statusCounts: statusCounts.map((s) => ({
          status: s.status,
          count: Number(s.count),
        })),
      };
    }),

    financeiro: protectedProcedure
      .input(z.object({ mes: z.string().optional(), consultor: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const now = new Date();
        let mes = now.getMonth() + 1;
        let ano = now.getFullYear();
        if (input?.mes) {
          const parts = input.mes.split("-");
          ano = parseInt(parts[0]);
          mes = parseInt(parts[1]);
        }
        const firstOfMonth = new Date(ano, mes - 1, 1);
        const lastOfMonth = new Date(ano, mes, 0, 23, 59, 59);

        const [fatMes] = await db
          .select({ total: sql<number>`COALESCE(SUM(valor), 0)`, count: sql<number>`count(*)` })
          .from(faturamento)
          .where(and(gte(faturamento.createdAt, firstOfMonth), lte(faturamento.createdAt, lastOfMonth)));

        const fatMensal = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(ano, mes - 1 - i, 1);
          const dEnd = new Date(ano, mes - i, 0, 23, 59, 59);
          const [row] = await db
            .select({ total: sql<number>`COALESCE(SUM(valor), 0)`, count: sql<number>`count(*)` })
            .from(faturamento)
            .where(and(gte(faturamento.createdAt, d), lte(faturamento.createdAt, dEnd)));
          fatMensal.push({
            mes: d.toLocaleString("pt-BR", { month: "short" }),
            total: Number(row?.total ?? 0),
            count: Number(row?.count ?? 0),
          });
        }

        const [meta] = await db
          .select()
          .from(metasFinanceiras)
          .where(and(eq(metasFinanceiras.mes, mes), eq(metasFinanceiras.ano, ano)))
          .limit(1);

        const totalFat = Number(fatMes?.total ?? 0);
        const totalOS = Number(fatMes?.count ?? 0);
        const metaValor = meta ? Number(meta.metaMensal ?? 200000) : 200000;

        const topOS = await db
          .select({ os: ordensServico, cliente: clientes })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .where(
            and(
              eq(ordensServico.status, "Entregue"),
              gte(ordensServico.updatedAt, firstOfMonth),
              lte(ordensServico.updatedAt, lastOfMonth)
            )
          )
          .orderBy(desc(ordensServico.valorTotalOs))
          .limit(5);

        const mixServicos = await db
          .select({ motivoVisita: ordensServico.motivoVisita, count: sql<number>`count(*)` })
          .from(ordensServico)
          .where(gte(ordensServico.createdAt, firstOfMonth))
          .groupBy(ordensServico.motivoVisita)
          .orderBy(desc(sql`count(*)`))
          .limit(8);

        const crescimento =
          fatMensal.length >= 2 && fatMensal[fatMensal.length - 2].total > 0
            ? ((totalFat - fatMensal[fatMensal.length - 2].total) /
                fatMensal[fatMensal.length - 2].total) *
              100
            : 0;

        return {
          faturamentoMes: totalFat,
          totalOS,
          ticketMedio: totalOS > 0 ? totalFat / totalOS : 0,
          metaMensal: metaValor,
          percentualMeta: metaValor > 0 ? (totalFat / metaValor) * 100 : 0,
          fatMensal,
          topOS,
          mixServicos,
          crescimento,
        };
      }),

    produtividade: protectedProcedure
      .input(z.object({ periodo: z.enum(["semana", "mes"]).default("mes") }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const now = new Date();
        const periodo = input?.periodo ?? "mes";
        let startDate: Date;
        if (periodo === "semana") {
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const osPorMecanico = await db
          .select({
            mecanicoId: ordensServico.mecanicoId,
            count: sql<number>`count(*)`,
            valorTotal: sql<number>`COALESCE(SUM(CAST(valor_total_os AS DECIMAL(10,2))), 0)`,
          })
          .from(ordensServico)
          .where(and(ne(ordensServico.status, "Cancelada"), gte(ordensServico.createdAt, startDate)))
          .groupBy(ordensServico.mecanicoId);

        const mecanicosList = await db.select().from(mecanicos).where(eq(mecanicos.ativo, true));

        return mecanicosList
          .map((m) => {
            const stats = osPorMecanico.find((o) => o.mecanicoId === m.id);
            return {
              id: m.id,
              nome: m.nome,
              especialidade: m.especialidade,
              carros: Number(stats?.count ?? 0),
              produzido: Number(stats?.valorTotal ?? 0),
              meta: 30000,
            };
          })
          .sort((a, b) => b.produzido - a.produzido);
      }),
  }),

  // ─── Clientes ──────────────────────────────────────────────────────────────
  clientes: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const lim = input?.limit ?? 100;
        if (input?.search) {
          return db
            .select()
            .from(clientes)
            .where(
              or(
                like(clientes.nomeCompleto, `%${input.search}%`),
                like(clientes.telefone, `%${input.search}%`),
                like(clientes.cpf, `%${input.search}%`)
              )
            )
            .orderBy(desc(clientes.createdAt))
            .limit(lim);
        }
        return db.select().from(clientes).orderBy(desc(clientes.createdAt)).limit(lim);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [cliente] = await db
          .select()
          .from(clientes)
          .where(eq(clientes.id, input.id))
          .limit(1);
        return cliente ?? null;
      }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const [cliente] = await db
          .select()
          .from(clientes)
          .where(eq(clientes.id, input.id))
          .limit(1);
        if (!cliente) return null;
        const veiculosCliente = await db
          .select()
          .from(veiculos)
          .where(eq(veiculos.clienteId, input.id));
        const osCliente = await db
          .select()
          .from(ordensServico)
          .where(eq(ordensServico.clienteId, input.id))
          .orderBy(desc(ordensServico.createdAt))
          .limit(20);
        const [crmData] = await db
          .select()
          .from(crm)
          .where(eq(crm.clienteId, input.id))
          .limit(1);
        return { cliente, veiculos: veiculosCliente, os: osCliente, crm: crmData ?? null };
      }),

    create: protectedProcedure
      .input(
        z.object({
          nomeCompleto: z.string(),
          cpf: z.string().optional(),
          email: z.string().optional(),
          telefone: z.string().optional(),
          dataNascimento: z.string().optional(),
          endereco: z.string().optional(),
          cep: z.string().optional(),
          cidade: z.string().optional(),
          estado: z.string().optional(),
          origemCadastro: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [result] = await db.insert(clientes).values({
          nomeCompleto: input.nomeCompleto,
          cpf: input.cpf || null,
          email: input.email || null,
          telefone: input.telefone || null,
          dataNascimento: input.dataNascimento
            ? (input.dataNascimento as unknown as Date)
            : null,
          endereco: input.endereco || null,
          cep: input.cep || null,
          cidade: input.cidade || null,
          estado: input.estado || null,
          origemCadastro: input.origemCadastro || null,
        });
        return { id: (result as unknown as { insertId: number }).insertId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nomeCompleto: z.string().optional(),
          cpf: z.string().optional(),
          email: z.string().optional(),
          telefone: z.string().optional(),
          endereco: z.string().optional(),
          cep: z.string().optional(),
          cidade: z.string().optional(),
          estado: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        Object.entries(data).forEach(([k, v]) => {
          if (v !== undefined) updateData[k] = v;
        });
        await db.update(clientes).set(updateData).where(eq(clientes.id, id));
        return { success: true };
      }),
  }),

  // ─── Veículos ──────────────────────────────────────────────────────────────
  veiculos: router({
    list: protectedProcedure
      .input(z.object({ clienteId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        if (input?.clienteId) {
          return db
            .select()
            .from(veiculos)
            .where(eq(veiculos.clienteId, input.clienteId))
            .orderBy(desc(veiculos.createdAt));
        }
        return db.select().from(veiculos).orderBy(desc(veiculos.createdAt)).limit(100);
      }),

    create: protectedProcedure
      .input(
        z.object({
          clienteId: z.number(),
          placa: z.string(),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          versao: z.string().optional(),
          ano: z.number().optional(),
          combustivel: z.string().optional(),
          kmAtual: z.number().optional(),
          origemContato: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [result] = await db.insert(veiculos).values({
          clienteId: input.clienteId,
          placa: input.placa.toUpperCase(),
          marca: input.marca || null,
          modelo: input.modelo || null,
          versao: input.versao || null,
          ano: input.ano || null,
          combustivel: input.combustivel || null,
          kmAtual: input.kmAtual || null,
          origemContato: input.origemContato || null,
        });
        return { id: (result as unknown as { insertId: number }).insertId };
      }),
  }),

  // ─── Mecânicos ─────────────────────────────────────────────────────────────
  mecanicos: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(mecanicos).where(eq(mecanicos.ativo, true)).orderBy(mecanicos.nome);
    }),
  }),

  // ─── Colaboradores ─────────────────────────────────────────────────────────
  colaboradores: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(colaboradores)
        .where(eq(colaboradores.ativo, true))
        .orderBy(colaboradores.nome);
    }),
  }),

  // ─── Recursos ──────────────────────────────────────────────────────────────
  recursos: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(recursos)
        .where(eq(recursos.ativo, true))
        .orderBy(recursos.nomeRecurso);
    }),
  }),

  // ─── Serviços Catálogo ─────────────────────────────────────────────────────
  servicos: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(servicosCatalogo)
        .where(eq(servicosCatalogo.ativo, true))
        .orderBy(servicosCatalogo.nome);
    }),
  }),

  // ─── Lista Status ──────────────────────────────────────────────────────────
  status: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(listaStatus)
        .where(eq(listaStatus.ativo, true))
        .orderBy(listaStatus.ordem);
    }),
  }),

  // ─── Ordens de Serviço ─────────────────────────────────────────────────────
  os: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            colaboradorId: z.number().optional(),
            search: z.string().optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0 };

        const conditions = [];
        if (input?.status) conditions.push(eq(ordensServico.status, input.status));
        if (input?.colaboradorId)
          conditions.push(eq(ordensServico.colaboradorId, input.colaboradorId));
        if (input?.search) {
          conditions.push(
            or(
              like(ordensServico.placa, `%${input.search}%`),
              like(ordensServico.numeroOs, `%${input.search}%`),
              like(ordensServico.motivoVisita, `%${input.search}%`)
            )
          );
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(ordensServico)
          .where(where);

        const items = await db
          .select({
            os: ordensServico,
            cliente: clientes,
            veiculo: veiculos,
            mecanico: mecanicos,
          })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
          .leftJoin(mecanicos, eq(ordensServico.mecanicoId, mecanicos.id))
          .where(where)
          .orderBy(desc(ordensServico.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);

        return { items, total: Number(countResult?.count ?? 0) };
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const [row] = await db
          .select({
            os: ordensServico,
            cliente: clientes,
            veiculo: veiculos,
          })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
          .where(eq(ordensServico.id, input.id))
          .limit(1);

        if (!row) return null;

        const itens = await db
          .select()
          .from(ordensServicoItens)
          .where(eq(ordensServicoItens.ordemServicoId, input.id))
          .orderBy(ordensServicoItens.createdAt);

        const historico = await db
          .select()
          .from(ordensServicoHistorico)
          .where(eq(ordensServicoHistorico.ordemServicoId, input.id))
          .orderBy(desc(ordensServicoHistorico.dataAlteracao));

        const mecanicoData = row.os.mecanicoId
          ? await db
              .select()
              .from(mecanicos)
              .where(eq(mecanicos.id, row.os.mecanicoId))
              .limit(1)
          : [];

        const colaboradorData = row.os.colaboradorId
          ? await db
              .select()
              .from(colaboradores)
              .where(eq(colaboradores.id, row.os.colaboradorId))
              .limit(1)
          : [];

        return {
          ...row,
          itens,
          historico,
          mecanico: mecanicoData[0] ?? null,
          colaborador: colaboradorData[0] ?? null,
        };
      }),

    patio: protectedProcedure
      .input(z.object({ consultor: z.string().optional() }).optional())
      .query(async () => {
        const db = await getDb();
        if (!db) return [];

        return db
          .select({
            os: ordensServico,
            cliente: clientes,
            veiculo: veiculos,
            mecanico: mecanicos,
          })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
          .leftJoin(mecanicos, eq(ordensServico.mecanicoId, mecanicos.id))
          .where(sql`${ordensServico.status} NOT IN ('Entregue', 'Cancelada')`)
          .orderBy(ordensServico.createdAt);
      }),

    create: protectedProcedure
      .input(
        z.object({
          clienteId: z.number(),
          veiculoId: z.number(),
          placa: z.string(),
          km: z.number().optional(),
          status: z.string().default("Diagnóstico"),
          colaboradorId: z.number().optional(),
          mecanicoId: z.number().optional(),
          recursoId: z.number().optional(),
          motivoVisita: z.string().optional(),
          observacoes: z.string().optional(),
          veioDePromocao: z.boolean().default(false),
          primeiraVez: z.boolean().default(false),
          totalOrcamento: z.number().optional(),
          itens: z
            .array(
              z.object({
                tipo: z.string(),
                descricao: z.string(),
                quantidade: z.number().default(1),
                valorUnitario: z.number(),
                valorTotal: z.number(),
                mecanicoId: z.number().optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        // Generate OS number: DAP-YYYYMM-XXXX
        const now = new Date();
        const [countRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(ordensServico);
        const seq = String(Number(countRow?.count ?? 0) + 1).padStart(4, "0");
        const numeroOs = `DAP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${seq}`;

        const [result] = await db.insert(ordensServico).values({
          numeroOs,
          dataEntrada: now,
          clienteId: input.clienteId,
          veiculoId: input.veiculoId,
          placa: input.placa.toUpperCase(),
          km: input.km || null,
          status: input.status,
          colaboradorId: input.colaboradorId || null,
          mecanicoId: input.mecanicoId || null,
          recursoId: input.recursoId || null,
          motivoVisita: input.motivoVisita || null,
          observacoes: input.observacoes || null,
          veioDePromocao: input.veioDePromocao,
          primeiraVez: input.primeiraVez,
          totalOrcamento: input.totalOrcamento ? String(input.totalOrcamento) : null,
        });

        const osId = (result as unknown as { insertId: number }).insertId;

        if (input.itens && input.itens.length > 0) {
          await db.insert(ordensServicoItens).values(
            input.itens.map((item) => ({
              ordemServicoId: osId,
              tipo: item.tipo,
              descricao: item.descricao,
              quantidade: item.quantidade,
              valorUnitario: String(item.valorUnitario),
              valorTotal: String(item.valorTotal),
              mecanicoId: item.mecanicoId || null,
            }))
          );
        }

        await db.insert(ordensServicoHistorico).values({
          ordemServicoId: osId,
          statusAnterior: null,
          statusNovo: input.status,
          observacao: "OS criada",
          dataAlteracao: now,
        });

        return { id: osId, numeroOs };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.string(),
          observacao: z.string().optional(),
          colaboradorId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [current] = await db
          .select({ status: ordensServico.status })
          .from(ordensServico)
          .where(eq(ordensServico.id, input.id))
          .limit(1);

        const updates: Record<string, unknown> = { status: input.status };
        if (input.status === "Entregue") {
          updates.dataSaida = new Date();
        }

        await db.update(ordensServico).set(updates).where(eq(ordensServico.id, input.id));

        await db.insert(ordensServicoHistorico).values({
          ordemServicoId: input.id,
          statusAnterior: current?.status ?? null,
          statusNovo: input.status,
          colaboradorId: input.colaboradorId || null,
          observacao: input.observacao || null,
          dataAlteracao: new Date(),
        });

        if (input.status === "Entregue") {
          const [os] = await db
            .select()
            .from(ordensServico)
            .where(eq(ordensServico.id, input.id))
            .limit(1);
          if (os?.valorTotalOs) {
            await db.insert(faturamento).values({
              ordemServicoId: input.id,
              clienteId: os.clienteId,
              dataEntrega: new Date().toISOString().split("T")[0] as unknown as Date,
              valor: os.valorTotalOs,
            });
          }
        }

        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          mecanicoId: z.number().optional().nullable(),
          colaboradorId: z.number().optional().nullable(),
          recursoId: z.number().optional().nullable(),
          motivoVisita: z.string().optional(),
          observacoes: z.string().optional(),
          km: z.number().optional(),
          totalOrcamento: z.number().optional(),
          valorTotalOs: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.mecanicoId !== undefined) updateData.mecanicoId = data.mecanicoId;
        if (data.colaboradorId !== undefined) updateData.colaboradorId = data.colaboradorId;
        if (data.recursoId !== undefined) updateData.recursoId = data.recursoId;
        if (data.motivoVisita !== undefined) updateData.motivoVisita = data.motivoVisita;
        if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
        if (data.km !== undefined) updateData.km = data.km;
        if (data.totalOrcamento !== undefined)
          updateData.totalOrcamento = String(data.totalOrcamento);
        if (data.valorTotalOs !== undefined) updateData.valorTotalOs = String(data.valorTotalOs);
        await db.update(ordensServico).set(updateData).where(eq(ordensServico.id, id));
        return { success: true };
      }),

    addItem: protectedProcedure
      .input(
        z.object({
          ordemServicoId: z.number(),
          tipo: z.string(),
          descricao: z.string(),
          quantidade: z.number().default(1),
          valorUnitario: z.number(),
          valorTotal: z.number(),
          mecanicoId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [result] = await db.insert(ordensServicoItens).values({
          ordemServicoId: input.ordemServicoId,
          tipo: input.tipo,
          descricao: input.descricao,
          quantidade: input.quantidade,
          valorUnitario: String(input.valorUnitario),
          valorTotal: String(input.valorTotal),
          mecanicoId: input.mecanicoId || null,
        });
        return { id: (result as unknown as { insertId: number }).insertId };
      }),
  }),

  // ─── Agendamentos ──────────────────────────────────────────────────────────
  agendamentos: router({
    list: protectedProcedure
      .input(
        z
          .object({
            data: z.string().optional(),
            colaboradorId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions: ReturnType<typeof sql>[] = [];
        if (input?.data) {
          conditions.push(sql`DATE(${agendamentos.dataAgendamento}) = ${input.data}`);
        }
        if (input?.colaboradorId)
          conditions.push(eq(agendamentos.colaboradorId, input.colaboradorId));

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        return db
          .select({
            ag: agendamentos,
            cliente: clientes,
            veiculo: veiculos,
          })
          .from(agendamentos)
          .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
          .leftJoin(veiculos, eq(agendamentos.veiculoId, veiculos.id))
          .where(where)
          .orderBy(agendamentos.dataAgendamento, agendamentos.horaAgendamento);
      }),

    create: protectedProcedure
      .input(
        z.object({
          clienteId: z.number().optional(),
          veiculoId: z.number().optional(),
          dataAgendamento: z.string(),
          horaAgendamento: z.string().optional(),
          motivoVisita: z.string().optional(),
          status: z.string().default("agendado"),
          colaboradorId: z.number().optional(),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [result] = await db.insert(agendamentos).values({
          clienteId: input.clienteId || null,
          veiculoId: input.veiculoId || null,
          dataAgendamento: input.dataAgendamento as unknown as Date,
          horaAgendamento: input.horaAgendamento || null,
          motivoVisita: input.motivoVisita || null,
          status: input.status,
          colaboradorId: input.colaboradorId || null,
          observacoes: input.observacoes || null,
        });
        return { id: (result as unknown as { insertId: number }).insertId };
      }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db
          .update(agendamentos)
          .set({ status: input.status })
          .where(eq(agendamentos.id, input.id));
        return { success: true };
      }),
  }),

  // ─── CRM ───────────────────────────────────────────────────────────────────
  crm: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const lim = input?.limit ?? 100;
        if (input?.search) {
          return db
            .select({ cliente: clientes, crmData: crm })
            .from(clientes)
            .leftJoin(crm, eq(clientes.id, crm.clienteId))
            .where(
              or(
                like(clientes.nomeCompleto, `%${input.search}%`),
                like(clientes.telefone, `%${input.search}%`)
              )
            )
            .orderBy(desc(clientes.createdAt))
            .limit(lim);
        }

        return db
          .select({ cliente: clientes, crmData: crm })
          .from(clientes)
          .leftJoin(crm, eq(clientes.id, crm.clienteId))
          .orderBy(desc(clientes.createdAt))
          .limit(lim);
      }),

    upsert: protectedProcedure
      .input(
        z.object({
          clienteId: z.number(),
          comoConheceu: z.string().optional(),
          nivelFidelidade: z.string().optional(),
          tipoServico1: z.string().optional(),
          tipoServico2: z.string().optional(),
          tipoServico3: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const existing = await db
          .select()
          .from(crm)
          .where(eq(crm.clienteId, input.clienteId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(crm)
            .set({
              comoConheceu: input.comoConheceu || null,
              nivelFidelidade: input.nivelFidelidade || null,
              tipoServico1: input.tipoServico1 || null,
              tipoServico2: input.tipoServico2 || null,
              tipoServico3: input.tipoServico3 || null,
            })
            .where(eq(crm.clienteId, input.clienteId));
        } else {
          await db.insert(crm).values({
            clienteId: input.clienteId,
            comoConheceu: input.comoConheceu || null,
            nivelFidelidade: input.nivelFidelidade || null,
            tipoServico1: input.tipoServico1 || null,
            tipoServico2: input.tipoServico2 || null,
            tipoServico3: input.tipoServico3 || null,
          });
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
