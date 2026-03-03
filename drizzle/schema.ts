import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
  time,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Clientes ────────────────────────────────────────────────────────────────
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull(),
  telefone: varchar("telefone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  cpfCnpj: varchar("cpf_cnpj", { length: 20 }),
  endereco: text("endereco"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

// ─── Veículos ─────────────────────────────────────────────────────────────────
export const veiculos = mysqlTable("veiculos", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("cliente_id").references(() => clientes.id),
  placa: varchar("placa", { length: 10 }).notNull(),
  marca: varchar("marca", { length: 60 }),
  modelo: varchar("modelo", { length: 100 }),
  ano: varchar("ano", { length: 10 }),
  cor: varchar("cor", { length: 40 }),
  km: int("km"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Veiculo = typeof veiculos.$inferSelect;
export type InsertVeiculo = typeof veiculos.$inferInsert;

// ─── Mecânicos ────────────────────────────────────────────────────────────────
export const mecanicos = mysqlTable("mecanicos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  emoji: varchar("emoji", { length: 10 }).default("🔧"),
  especialidade: varchar("especialidade", { length: 150 }),
  metaSemanal: decimal("meta_semanal", { precision: 12, scale: 2 }).default("15000.00"),
  metaMensal: decimal("meta_mensal", { precision: 12, scale: 2 }).default("60000.00"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Mecanico = typeof mecanicos.$inferSelect;
export type InsertMecanico = typeof mecanicos.$inferInsert;

// ─── Ordens de Serviço ────────────────────────────────────────────────────────
export const ordensServico = mysqlTable("ordens_servico", {
  id: int("id").autoincrement().primaryKey(),
  numero: varchar("numero", { length: 20 }).notNull(),
  clienteId: int("cliente_id").references(() => clientes.id),
  veiculoId: int("veiculo_id").references(() => veiculos.id),
  mecanicoId: int("mecanico_id").references(() => mecanicos.id),
  consultorNome: varchar("consultor_nome", { length: 100 }),
  status: mysqlEnum("status", [
    "Diagnóstico",
    "Orçamento",
    "Aguardando Aprovação",
    "Aguardando Peças",
    "Em Execução",
    "Pronto",
    "Entregue",
    "Cancelada",
  ]).default("Diagnóstico").notNull(),
  tipoServico: mysqlEnum("tipo_servico", ["Rápido", "Médio", "Demorado", "Projeto"]).default("Médio"),
  descricaoProblema: text("descricao_problema"),
  servicosRealizados: text("servicos_realizados"),
  valorOrcamento: decimal("valor_orcamento", { precision: 12, scale: 2 }),
  valorAprovado: decimal("valor_aprovado", { precision: 12, scale: 2 }),
  valorFinal: decimal("valor_final", { precision: 12, scale: 2 }),
  dataEntrada: date("data_entrada"),
  dataPrevisaoEntrega: date("data_previsao_entrega"),
  dataEntrega: date("data_entrega"),
  observacoes: text("observacoes"),
  kmEntrada: int("km_entrada"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrdemServico = typeof ordensServico.$inferSelect;
export type InsertOrdemServico = typeof ordensServico.$inferInsert;

// ─── Histórico de Status da OS ────────────────────────────────────────────────
export const osHistorico = mysqlTable("os_historico", {
  id: int("id").autoincrement().primaryKey(),
  osId: int("os_id").references(() => ordensServico.id).notNull(),
  statusAnterior: varchar("status_anterior", { length: 60 }),
  statusNovo: varchar("status_novo", { length: 60 }).notNull(),
  observacao: text("observacao"),
  usuarioNome: varchar("usuario_nome", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OsHistorico = typeof osHistorico.$inferSelect;

// ─── Agendamentos ─────────────────────────────────────────────────────────────
export const agendamentos = mysqlTable("agendamentos", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("cliente_id").references(() => clientes.id),
  veiculoId: int("veiculo_id").references(() => veiculos.id),
  mecanicoId: int("mecanico_id").references(() => mecanicos.id),
  data: date("data").notNull(),
  hora: time("hora").notNull(),
  motivoVisita: varchar("motivo_visita", { length: 300 }),
  status: mysqlEnum("status", ["Confirmado", "Pendente", "Cancelado", "Concluído"]).default("Pendente"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agendamento = typeof agendamentos.$inferSelect;
export type InsertAgendamento = typeof agendamentos.$inferInsert;

// ─── CRM Interações ───────────────────────────────────────────────────────────
export const crmInteracoes = mysqlTable("crm_interacoes", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("cliente_id").references(() => clientes.id).notNull(),
  tipo: mysqlEnum("tipo", ["Ligação", "WhatsApp", "Email", "Visita", "Outro"]).default("Outro"),
  descricao: text("descricao").notNull(),
  usuarioNome: varchar("usuario_nome", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrmInteracao = typeof crmInteracoes.$inferSelect;

// ─── Metas Financeiras ────────────────────────────────────────────────────────
export const metasFinanceiras = mysqlTable("metas_financeiras", {
  id: int("id").autoincrement().primaryKey(),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  metaMensal: decimal("meta_mensal", { precision: 12, scale: 2 }).default("200000.00"),
  diasUteis: int("dias_uteis").default(22),
  diasTrabalhados: int("dias_trabalhados").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MetaFinanceira = typeof metasFinanceiras.$inferSelect;
