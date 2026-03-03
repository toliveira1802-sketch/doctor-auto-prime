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
  ordensServico,
  osHistorico,
  agendamentos,
  crmInteracoes,
  metasFinanceiras,
} from "../drizzle/schema";
import { eq, desc, and, gte, lte, sql, like, or } from "drizzle-orm";

// ─── Status helpers ───────────────────────────────────────────────────────────
const OS_STATUS = [
  "Diagnóstico",
  "Orçamento",
  "Aguardando Aprovação",
  "Aguardando Peças",
  "Em Execução",
  "Pronto",
  "Entregue",
  "Cancelada",
] as const;

type OsStatus = (typeof OS_STATUS)[number];

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

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: router({
    kpis: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;

      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const todayStr = now.toISOString().split("T")[0];
      const firstOfMonthStr = firstOfMonth.toISOString().split("T")[0];

      const [veiculosNoPatio] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ordensServico)
        .where(
          and(
            sql`status NOT IN ('Entregue', 'Cancelada')`
          )
        );

      const [agendamentosHoje] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agendamentos)
        .where(eq(agendamentos.data, todayStr as unknown as Date));

      const [faturamentoMes] = await db
        .select({ total: sql<number>`COALESCE(SUM(valor_final), 0)` })
        .from(ordensServico)
        .where(
          and(
            eq(ordensServico.status, "Entregue"),
            gte(ordensServico.dataEntrega, firstOfMonthStr as unknown as Date)
          )
        );

      const [ticketMedio] = await db
        .select({ avg: sql<number>`COALESCE(AVG(valor_final), 0)` })
        .from(ordensServico)
        .where(
          and(
            eq(ordensServico.status, "Entregue"),
            gte(ordensServico.dataEntrega, firstOfMonthStr as unknown as Date)
          )
        );

      const [entreguesMes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ordensServico)
        .where(
          and(
            eq(ordensServico.status, "Entregue"),
            gte(ordensServico.dataEntrega, firstOfMonthStr as unknown as Date)
          )
        );

      const meta = await db
        .select()
        .from(metasFinanceiras)
        .where(
          and(
            eq(metasFinanceiras.mes, now.getMonth() + 1),
            eq(metasFinanceiras.ano, now.getFullYear())
          )
        )
        .limit(1);

      return {
        veiculosNoPatio: Number(veiculosNoPatio?.count ?? 0),
        agendamentosHoje: Number(agendamentosHoje?.count ?? 0),
        faturamentoMes: Number(faturamentoMes?.total ?? 0),
        ticketMedio: Number(ticketMedio?.avg ?? 0),
        entreguesMes: Number(entreguesMes?.count ?? 0),
        metaMensal: Number(meta[0]?.metaMensal ?? 200000),
        diasUteis: meta[0]?.diasUteis ?? 22,
        diasTrabalhados: meta[0]?.diasTrabalhados ?? 0,
      };
    }),

    operacional: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const counts = await db
        .select({
          status: ordensServico.status,
          count: sql<number>`count(*)`,
        })
        .from(ordensServico)
        .where(sql`status NOT IN ('Entregue', 'Cancelada')`)
        .groupBy(ordensServico.status);

      return counts;
    }),

    financeiro: protectedProcedure
      .input(z.object({ mes: z.string().optional(), consultor: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const now = new Date();
        // Parse mes param (YYYY-MM) or default to current month
        let year = now.getFullYear();
        let month = now.getMonth();
        if (input.mes) {
          const parts = input.mes.split("-");
          year = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1;
        }
        const firstOfMonthStr = new Date(year, month, 1).toISOString().split("T")[0];
        const firstOfNextMonthStr = new Date(year, month + 1, 1).toISOString().split("T")[0];

        const baseConditions = [
          eq(ordensServico.status, "Entregue"),
          gte(ordensServico.dataEntrega, firstOfMonthStr as unknown as Date),
          sql`data_entrega < ${firstOfNextMonthStr}`,
        ];
        if (input.consultor && input.consultor !== "todos") {
          baseConditions.push(eq(ordensServico.consultorNome, input.consultor));
        }

        const [faturadoRow] = await db
          .select({ total: sql<number>`COALESCE(SUM(valor_final), 0)`, count: sql<number>`count(*)`, avg: sql<number>`COALESCE(AVG(valor_final), 0)` })
          .from(ordensServico)
          .where(and(...baseConditions));

        // Previous month for growth calc
        const prevFirstStr = new Date(year, month - 1, 1).toISOString().split("T")[0];
        const prevLastStr = firstOfMonthStr;
        const [prevRow] = await db
          .select({ total: sql<number>`COALESCE(SUM(valor_final), 0)` })
          .from(ordensServico)
          .where(and(
            eq(ordensServico.status, "Entregue"),
            gte(ordensServico.dataEntrega, prevFirstStr as unknown as Date),
            sql`data_entrega < ${prevLastStr}`,
          ));

        const faturamentoMes = Number(faturadoRow?.total ?? 0);
        const prevFaturamento = Number(prevRow?.total ?? 0);
        const crescimento = prevFaturamento > 0 ? ((faturamentoMes - prevFaturamento) / prevFaturamento) * 100 : 0;

        // Monthly trend (last 6 months)
        const faturamentoMensal: { mes: string; valor: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(year, month - i, 1);
          const s = d.toISOString().split("T")[0];
          const e = new Date(year, month - i + 1, 1).toISOString().split("T")[0];
          const [row] = await db
            .select({ total: sql<number>`COALESCE(SUM(valor_final), 0)` })
            .from(ordensServico)
            .where(and(
              eq(ordensServico.status, "Entregue"),
              gte(ordensServico.dataEntrega, s as unknown as Date),
              sql`data_entrega < ${e}`,
            ));
          faturamentoMensal.push({
            mes: d.toLocaleDateString("pt-BR", { month: "short" }),
            valor: Number(row?.total ?? 0),
          });
        }

        // By tipo
        const tipoRows = await db
          .select({ tipo: ordensServico.tipoServico, valor: sql<number>`COALESCE(SUM(valor_final), 0)` })
          .from(ordensServico)
          .where(and(...baseConditions))
          .groupBy(ordensServico.tipoServico);

        const porTipo = tipoRows
          .filter((r) => r.tipo)
          .map((r) => ({ tipo: r.tipo ?? "Outros", valor: Number(r.valor) }));

        // Top OS
        const topOsRows = await db
          .select({
            id: ordensServico.id,
            numero: ordensServico.numero,
            valor: sql<number>`COALESCE(valor_final, 0)`,
            placa: veiculos.placa,
            modelo: veiculos.modelo,
          })
          .from(ordensServico)
          .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
          .where(and(...baseConditions))
          .orderBy(sql`valor_final DESC`)
          .limit(5);

        const topOs = topOsRows.map((r) => ({
          id: r.id,
          numero: r.numero,
          valor: Number(r.valor),
          veiculo: r.placa ? `${r.placa} ${r.modelo ?? ""}`.trim() : null,
        }));

        return {
          faturamentoMes,
          ticketMedio: Number(faturadoRow?.avg ?? 0),
          osEntregues: Number(faturadoRow?.count ?? 0),
          crescimento,
          faturamentoMensal,
          porTipo,
          topOs,
        };
      }),

    produtividade: protectedProcedure
      .input(z.object({ periodo: z.enum(["semana", "mes"]).default("mes") }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const now = new Date();
        let startDate: string;

        if (input.periodo === "semana") {
          const dayOfWeek = now.getDay();
          const monday = new Date(now);
          monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          startDate = monday.toISOString().split("T")[0];
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0];
        }

        const mecs = await db.select().from(mecanicos).where(eq(mecanicos.ativo, true));

        const results = await Promise.all(
          mecs.map(async (mec) => {
            const [stats] = await db
              .select({
                total: sql<number>`COALESCE(SUM(valor_final), 0)`,
                count: sql<number>`count(*)`,
              })
              .from(ordensServico)
              .where(
                and(
                  eq(ordensServico.mecanicoId, mec.id),
                  eq(ordensServico.status, "Entregue"),
                  gte(ordensServico.dataEntrega, startDate as unknown as Date)
                )
              );

            return {
              ...mec,
              produzido: Number(stats?.total ?? 0),
              carros: Number(stats?.count ?? 0),
              meta: input.periodo === "semana" ? Number(mec.metaSemanal) : Number(mec.metaMensal),
            };
          })
        );

        return results.sort((a, b) => b.produzido - a.produzido);
      }),
  }),

  // ─── Ordens de Serviço ──────────────────────────────────────────────────────
  os: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          consultor: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0 };

        const conditions = [];
        if (input.status && input.status !== "todos") {
          conditions.push(eq(ordensServico.status, input.status as OsStatus));
        }
        if (input.consultor && input.consultor !== "todos") {
          conditions.push(eq(ordensServico.consultorNome, input.consultor));
        }

        const query = db
          .select({
            os: ordensServico,
            cliente: { nome: clientes.nome, telefone: clientes.telefone },
            veiculo: { placa: veiculos.placa, modelo: veiculos.modelo, marca: veiculos.marca },
            mecanico: { nome: mecanicos.nome, emoji: mecanicos.emoji },
          })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
          .leftJoin(mecanicos, eq(ordensServico.mecanicoId, mecanicos.id))
          .orderBy(desc(ordensServico.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        if (conditions.length > 0) {
          const items = await query.where(and(...conditions));
          return { items, total: items.length };
        }

        const items = await query;
        return { items, total: items.length };
      }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const [os] = await db
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
          .where(eq(ordensServico.id, input.id));

        if (!os) return null;

        const historico = await db
          .select()
          .from(osHistorico)
          .where(eq(osHistorico.osId, input.id))
          .orderBy(desc(osHistorico.createdAt));

        return { ...os, historico };
      }),

    create: protectedProcedure
      .input(
        z.object({
          clienteId: z.number().optional(),
          veiculoId: z.number().optional(),
          mecanicoId: z.number().optional(),
          consultorNome: z.string().optional(),
          tipoServico: z.enum(["Rápido", "Médio", "Demorado", "Projeto"]).optional(),
          descricaoProblema: z.string().optional(),
          valorOrcamento: z.number().optional(),
          dataEntrada: z.string().optional(),
          dataPrevisaoEntrega: z.string().optional(),
          observacoes: z.string().optional(),
          kmEntrada: z.number().optional(),
          // Quick client creation
          clienteNome: z.string().optional(),
          clienteTelefone: z.string().optional(),
          // Quick vehicle creation
          placa: z.string().optional(),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          ano: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        let clienteId = input.clienteId;
        let veiculoId = input.veiculoId;

        // Quick client creation
        if (!clienteId && input.clienteNome) {
          const [newCliente] = await db
            .insert(clientes)
            .values({ nome: input.clienteNome, telefone: input.clienteTelefone })
            .$returningId();
          clienteId = newCliente.id;
        }

        // Quick vehicle creation
        if (!veiculoId && input.placa) {
          const [newVeiculo] = await db
            .insert(veiculos)
            .values({
              clienteId,
              placa: input.placa.toUpperCase(),
              marca: input.marca,
              modelo: input.modelo,
              ano: input.ano,
            })
            .$returningId();
          veiculoId = newVeiculo.id;
        }

        // Generate OS number
        const [lastOs] = await db
          .select({ id: ordensServico.id })
          .from(ordensServico)
          .orderBy(desc(ordensServico.id))
          .limit(1);
        const nextNum = (lastOs?.id ?? 0) + 1;
        const numero = `OS-${new Date().getFullYear()}-${String(nextNum).padStart(3, "0")}`;

        const [newOs] = await db
          .insert(ordensServico)
          .values({
            numero,
            clienteId,
            veiculoId,
            mecanicoId: input.mecanicoId,
            consultorNome: input.consultorNome,
            tipoServico: input.tipoServico,
            descricaoProblema: input.descricaoProblema,
            valorOrcamento: input.valorOrcamento?.toString(),
            dataEntrada: input.dataEntrada as unknown as Date,
            dataPrevisaoEntrega: input.dataPrevisaoEntrega as unknown as Date,
            observacoes: input.observacoes,
            kmEntrada: input.kmEntrada,
            status: "Diagnóstico",
          })
          .$returningId();

        // Log history
        await db.insert(osHistorico).values({
          osId: newOs.id,
          statusNovo: "Diagnóstico",
          observacao: "OS criada",
          usuarioNome: ctx.user?.name ?? "Sistema",
        });

        return { id: newOs.id, numero };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum([
            "Diagnóstico",
            "Orçamento",
            "Aguardando Aprovação",
            "Aguardando Peças",
            "Em Execução",
            "Pronto",
            "Entregue",
            "Cancelada",
          ]),
          observacao: z.string().optional(),
          valorFinal: z.number().optional(),
          dataEntrega: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const [current] = await db
          .select({ status: ordensServico.status })
          .from(ordensServico)
          .where(eq(ordensServico.id, input.id));

        const updateData: Record<string, unknown> = { status: input.status };
        if (input.valorFinal !== undefined) updateData.valorFinal = input.valorFinal.toString();
        if (input.dataEntrega) updateData.dataEntrega = input.dataEntrega;
        if (input.status === "Entregue" && !input.dataEntrega) {
          updateData.dataEntrega = new Date().toISOString().split("T")[0];
        }

        await db
          .update(ordensServico)
          .set(updateData)
          .where(eq(ordensServico.id, input.id));

        await db.insert(osHistorico).values({
          osId: input.id,
          statusAnterior: current?.status,
          statusNovo: input.status,
          observacao: input.observacao,
          usuarioNome: ctx.user?.name ?? "Sistema",
        });

        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          mecanicoId: z.number().optional(),
          consultorNome: z.string().optional(),
          tipoServico: z.enum(["Rápido", "Médio", "Demorado", "Projeto"]).optional(),
          descricaoProblema: z.string().optional(),
          servicosRealizados: z.string().optional(),
          valorOrcamento: z.number().optional(),
          valorAprovado: z.number().optional(),
          valorFinal: z.number().optional(),
          dataPrevisaoEntrega: z.string().optional(),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.mecanicoId !== undefined) updateData.mecanicoId = rest.mecanicoId;
        if (rest.consultorNome !== undefined) updateData.consultorNome = rest.consultorNome;
        if (rest.tipoServico !== undefined) updateData.tipoServico = rest.tipoServico;
        if (rest.descricaoProblema !== undefined) updateData.descricaoProblema = rest.descricaoProblema;
        if (rest.servicosRealizados !== undefined) updateData.servicosRealizados = rest.servicosRealizados;
        if (rest.valorOrcamento !== undefined) updateData.valorOrcamento = rest.valorOrcamento.toString();
        if (rest.valorAprovado !== undefined) updateData.valorAprovado = rest.valorAprovado.toString();
        if (rest.valorFinal !== undefined) updateData.valorFinal = rest.valorFinal.toString();
        if (rest.dataPrevisaoEntrega !== undefined) updateData.dataPrevisaoEntrega = rest.dataPrevisaoEntrega;
        if (rest.observacoes !== undefined) updateData.observacoes = rest.observacoes;

        await db.update(ordensServico).set(updateData).where(eq(ordensServico.id, id));
        return { success: true };
      }),

    patio: protectedProcedure
      .input(z.object({ consultor: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions = [sql`os.status NOT IN ('Entregue', 'Cancelada')`];
        if (input.consultor && input.consultor !== "todos") {
          conditions.push(eq(ordensServico.consultorNome, input.consultor));
        }

        const items = await db
          .select({
            os: ordensServico,
            cliente: { nome: clientes.nome, telefone: clientes.telefone },
            veiculo: { placa: veiculos.placa, modelo: veiculos.modelo, marca: veiculos.marca, cor: veiculos.cor },
            mecanico: { nome: mecanicos.nome, emoji: mecanicos.emoji },
          })
          .from(ordensServico)
          .leftJoin(clientes, eq(ordensServico.clienteId, clientes.id))
          .leftJoin(veiculos, eq(ordensServico.veiculoId, veiculos.id))
          .leftJoin(mecanicos, eq(ordensServico.mecanicoId, mecanicos.id))
          .where(and(...conditions))
          .orderBy(ordensServico.dataPrevisaoEntrega);

        return items;
      }),
  }),

  // ─── Clientes ───────────────────────────────────────────────────────────────
  clientes: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        if (input.search) {
          return db
            .select()
            .from(clientes)
            .where(
              or(
                like(clientes.nome, `%${input.search}%`),
                like(clientes.telefone, `%${input.search}%`),
                like(clientes.email, `%${input.search}%`)
              )
            )
            .limit(input.limit)
            .orderBy(clientes.nome);
        }

        return db.select().from(clientes).limit(input.limit).orderBy(clientes.nome);
      }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const [cliente] = await db.select().from(clientes).where(eq(clientes.id, input.id));
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
          .limit(10);

        const interacoes = await db
          .select()
          .from(crmInteracoes)
          .where(eq(crmInteracoes.clienteId, input.id))
          .orderBy(desc(crmInteracoes.createdAt))
          .limit(20);

        return { cliente, veiculos: veiculosCliente, os: osCliente, interacoes };
      }),

    create: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(2),
          telefone: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          cpfCnpj: z.string().optional(),
          endereco: z.string().optional(),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [r] = await db.insert(clientes).values(input).$returningId();
        return r;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().min(2).optional(),
          telefone: z.string().optional(),
          email: z.string().optional(),
          cpfCnpj: z.string().optional(),
          endereco: z.string().optional(),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { id, ...data } = input;
        await db.update(clientes).set(data).where(eq(clientes.id, id));
        return { success: true };
      }),

    addInteracao: protectedProcedure
      .input(
        z.object({
          clienteId: z.number(),
          tipo: z.enum(["Ligação", "WhatsApp", "Email", "Visita", "Outro"]),
          descricao: z.string().min(3),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(crmInteracoes).values({
          ...input,
          usuarioNome: ctx.user?.name ?? "Sistema",
        });
        return { success: true };
      }),
  }),

  // ─── Veículos ───────────────────────────────────────────────────────────────
  veiculos: router({
    list: protectedProcedure
      .input(z.object({ clienteId: z.number().optional(), search: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        if (input.clienteId) {
          return db.select().from(veiculos).where(eq(veiculos.clienteId, input.clienteId));
        }
        if (input.search) {
          return db
            .select()
            .from(veiculos)
            .where(
              or(
                like(veiculos.placa, `%${input.search}%`),
                like(veiculos.modelo, `%${input.search}%`)
              )
            )
            .limit(20);
        }
        return db.select().from(veiculos).limit(50);
      }),

    create: protectedProcedure
      .input(
        z.object({
          clienteId: z.number().optional(),
          placa: z.string().min(6),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          ano: z.string().optional(),
          cor: z.string().optional(),
          km: z.number().optional(),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [r] = await db
          .insert(veiculos)
          .values({ ...input, placa: input.placa.toUpperCase() })
          .$returningId();
        return r;
      }),
  }),

  // ─── Mecânicos ──────────────────────────────────────────────────────────────
  mecanicos: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(mecanicos).where(eq(mecanicos.ativo, true)).orderBy(mecanicos.nome);
    }),
  }),

  // ─── Agendamentos ───────────────────────────────────────────────────────────
  agendamentos: router({
    list: protectedProcedure
      .input(z.object({ data: z.string().optional(), mecanicoId: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions = [];
        if (input.data) {
          conditions.push(eq(agendamentos.data, input.data as unknown as Date));
        }
        if (input.mecanicoId) {
          conditions.push(eq(agendamentos.mecanicoId, input.mecanicoId));
        }

        const query = db
          .select({
            ag: agendamentos,
            cliente: { nome: clientes.nome, telefone: clientes.telefone },
            veiculo: { placa: veiculos.placa, modelo: veiculos.modelo },
            mecanico: { nome: mecanicos.nome, emoji: mecanicos.emoji },
          })
          .from(agendamentos)
          .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
          .leftJoin(veiculos, eq(agendamentos.veiculoId, veiculos.id))
          .leftJoin(mecanicos, eq(agendamentos.mecanicoId, mecanicos.id))
          .orderBy(agendamentos.hora);

        if (conditions.length > 0) {
          return query.where(and(...conditions));
        }
        return query;
      }),

    create: protectedProcedure
      .input(
        z.object({
          clienteId: z.number().optional(),
          veiculoId: z.number().optional(),
          mecanicoId: z.number().optional(),
          data: z.string(),
          hora: z.string(),
          motivoVisita: z.string().optional(),
          status: z.enum(["Confirmado", "Pendente", "Cancelado", "Concluído"]).default("Pendente"),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { data: dataStr, hora: horaStr, ...rest } = input;
        const [r] = await db
          .insert(agendamentos)
          .values({
            ...rest,
            data: dataStr as unknown as Date,
            hora: horaStr,
          })
          .$returningId();
        return r;
      }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["Confirmado", "Pendente", "Cancelado", "Concluído"]) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.update(agendamentos).set({ status: input.status }).where(eq(agendamentos.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Metas ──────────────────────────────────────────────────────────────────
  metas: router({
    get: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;
      const now = new Date();
      const [meta] = await db
        .select()
        .from(metasFinanceiras)
        .where(
          and(
            eq(metasFinanceiras.mes, now.getMonth() + 1),
            eq(metasFinanceiras.ano, now.getFullYear())
          )
        )
        .limit(1);
      return meta ?? null;
    }),

    update: protectedProcedure
      .input(
        z.object({
          metaMensal: z.number(),
          diasUteis: z.number(),
          diasTrabalhados: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const now = new Date();
        const mes = now.getMonth() + 1;
        const ano = now.getFullYear();

        const existing = await db
          .select({ id: metasFinanceiras.id })
          .from(metasFinanceiras)
          .where(and(eq(metasFinanceiras.mes, mes), eq(metasFinanceiras.ano, ano)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(metasFinanceiras)
            .set({
              metaMensal: input.metaMensal.toString(),
              diasUteis: input.diasUteis,
              diasTrabalhados: input.diasTrabalhados,
            })
            .where(eq(metasFinanceiras.id, existing[0].id));
        } else {
          await db.insert(metasFinanceiras).values({
            mes,
            ano,
            metaMensal: input.metaMensal.toString(),
            diasUteis: input.diasUteis,
            diasTrabalhados: input.diasTrabalhados,
          });
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
