import {
  boolean,
  date,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── USERS (Manus OAuth) ─────────────────────────────────────────────────────
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

// ─── EMPRESAS ────────────────────────────────────────────────────────────────
export const empresas = mysqlTable("empresas", {
  id: int("id").autoincrement().primaryKey(),
  razaoSocial: varchar("razaoSocial", { length: 255 }),
  nomeEmpresa: varchar("nomeEmpresa", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  telefone: varchar("telefone", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── NIVEIS_ACESSO ───────────────────────────────────────────────────────────
export const niveisAcesso = mysqlTable("niveis_acesso", {
  id: int("id").autoincrement().primaryKey(),
  tipoUsuario: varchar("tipoUsuario", { length: 100 }).notNull(),
  nivelAcesso: int("nivelAcesso").notNull(),
  permissoes: text("permissoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── COLABORADORES ───────────────────────────────────────────────────────────
export const colaboradores = mysqlTable("colaboradores", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId"),
  nome: varchar("nome", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 100 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  cpf: varchar("cpf", { length: 14 }),
  senha: varchar("senha", { length: 255 }),
  primeiroAcesso: boolean("primeiroAcesso").default(true),
  nivelAcessoId: int("nivelAcessoId"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── MECANICOS ───────────────────────────────────────────────────────────────
export const mecanicos = mysqlTable("mecanicos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId"),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  cpf: varchar("cpf", { length: 14 }),
  grauConhecimento: varchar("grauConhecimento", { length: 50 }),
  especialidade: varchar("especialidade", { length: 255 }),
  qtdePositivos: int("qtdePositivos").default(0),
  qtdeNegativos: int("qtdeNegativos").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── RECURSOS ────────────────────────────────────────────────────────────────
export const recursos = mysqlTable("recursos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId"),
  nomeRecurso: varchar("nomeRecurso", { length: 255 }).notNull(),
  ultimaManutencao: date("ultimaManutencao"),
  horasUtilizadasMes: int("horasUtilizadasMes").default(0),
  valorProduzidoMes: int("valorProduzidoMes").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── CLIENTES ────────────────────────────────────────────────────────────────
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId"),
  nomeCompleto: varchar("nomeCompleto", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  dataNascimento: date("dataNascimento"),
  endereco: varchar("endereco", { length: 500 }),
  cep: varchar("cep", { length: 10 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  origemCadastro: varchar("origemCadastro", { length: 100 }),
  senha: varchar("senha", { length: 255 }),
  primeiroAcesso: boolean("primeiroAcesso").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── VEICULOS ────────────────────────────────────────────────────────────────
export const veiculos = mysqlTable("veiculos", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId").notNull(),
  placa: varchar("placa", { length: 10 }).notNull(),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 255 }),
  versao: varchar("versao", { length: 255 }),
  ano: int("ano"),
  combustivel: varchar("combustivel", { length: 50 }),
  ultimoKm: int("ultimoKm"),
  kmAtual: int("kmAtual"),
  origemContato: varchar("origemContato", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── LISTA_STATUS ────────────────────────────────────────────────────────────
export const listaStatus = mysqlTable("lista_status", {
  id: int("id").autoincrement().primaryKey(),
  status: varchar("status", { length: 100 }).notNull(),
  ordem: int("ordem"),
  cor: varchar("cor", { length: 20 }),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── SERVICOS_CATALOGO ───────────────────────────────────────────────────────
export const servicosCatalogo = mysqlTable("servicos_catalogo", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 50 }),
  valorBase: decimal("valorBase", { precision: 10, scale: 2 }),
  tempoEstimado: int("tempoEstimado"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── ORDENS_SERVICO ──────────────────────────────────────────────────────────
export const ordensServico = mysqlTable("ordens_servico", {
  id: int("id").autoincrement().primaryKey(),
  numeroOs: varchar("numeroOs", { length: 20 }),
  dataEntrada: timestamp("dataEntrada"),
  dataSaida: timestamp("dataSaida"),
  clienteId: int("clienteId"),
  veiculoId: int("veiculoId"),
  placa: varchar("placa", { length: 10 }),
  km: int("km"),
  status: varchar("status", { length: 50 }),
  colaboradorId: int("colaboradorId"),
  mecanicoId: int("mecanicoId"),
  recursoId: int("recursoId"),
  veioDePromocao: boolean("veioDePromocao").default(false),
  motivoVisita: varchar("motivoVisita", { length: 255 }),
  totalOrcamento: decimal("totalOrcamento", { precision: 10, scale: 2 }),
  valorTotalOs: decimal("valorTotalOs", { precision: 10, scale: 2 }),
  primeiraVez: boolean("primeiraVez").default(false),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── ORDENS_SERVICO_ITENS ────────────────────────────────────────────────────
export const ordensServicoItens = mysqlTable("ordens_servico_itens", {
  id: int("id").autoincrement().primaryKey(),
  ordemServicoId: int("ordemServicoId").notNull(),
  tipo: varchar("tipo", { length: 50 }),
  descricao: varchar("descricao", { length: 500 }),
  quantidade: int("quantidade").default(1),
  valorUnitario: decimal("valorUnitario", { precision: 10, scale: 2 }),
  valorTotal: decimal("valorTotal", { precision: 10, scale: 2 }),
  aprovado: boolean("aprovado").default(false),
  executado: boolean("executado").default(false),
  mecanicoId: int("mecanicoId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── ORDENS_SERVICO_HISTORICO ────────────────────────────────────────────────
export const ordensServicoHistorico = mysqlTable("ordens_servico_historico", {
  id: int("id").autoincrement().primaryKey(),
  ordemServicoId: int("ordemServicoId").notNull(),
  statusAnterior: varchar("statusAnterior", { length: 50 }),
  statusNovo: varchar("statusNovo", { length: 50 }),
  colaboradorId: int("colaboradorId"),
  observacao: text("observacao"),
  dataAlteracao: timestamp("dataAlteracao").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── AGENDAMENTOS ────────────────────────────────────────────────────────────
export const agendamentos = mysqlTable("agendamentos", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId"),
  veiculoId: int("veiculoId"),
  dataAgendamento: date("dataAgendamento").notNull(),
  horaAgendamento: varchar("horaAgendamento", { length: 10 }),
  motivoVisita: varchar("motivoVisita", { length: 255 }),
  status: varchar("status", { length: 50 }).default("agendado"),
  colaboradorId: int("colaboradorId"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── FATURAMENTO ─────────────────────────────────────────────────────────────
export const faturamento = mysqlTable("faturamento", {
  id: int("id").autoincrement().primaryKey(),
  ordemServicoId: int("ordemServicoId"),
  clienteId: int("clienteId"),
  dataEntrega: date("dataEntrega"),
  valor: decimal("valor", { precision: 10, scale: 2 }),
  formaPagamento: varchar("formaPagamento", { length: 100 }),
  parcelas: int("parcelas").default(1),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── PENDENCIAS ──────────────────────────────────────────────────────────────
export const pendencias = mysqlTable("pendencias", {
  id: int("id").autoincrement().primaryKey(),
  nomePendencia: varchar("nomePendencia", { length: 255 }).notNull(),
  responsavelId: int("responsavelId").notNull(),
  criadorId: int("criadorId").notNull(),
  status: mysqlEnum("status", ["pendente", "feita", "feita_ressalvas", "nao_feita"]).default("pendente").notNull(),
  dataCriacao: timestamp("dataCriacao").defaultNow().notNull(),
  dataAtualizacao: timestamp("dataAtualizacao").defaultNow().onUpdateNow().notNull(),
  observacoes: text("observacoes"),
  empresaId: int("empresaId"),
});

// ─── CRM ─────────────────────────────────────────────────────────────────────
export const crm = mysqlTable("crm", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId").notNull(),
  marcaCarro: varchar("marcaCarro", { length: 100 }),
  modeloCarro: varchar("modeloCarro", { length: 255 }),
  tipoServico1: varchar("tipoServico1", { length: 100 }),
  tipoServico2: varchar("tipoServico2", { length: 100 }),
  tipoServico3: varchar("tipoServico3", { length: 100 }),
  ultimaQuilometragem: int("ultimaQuilometragem"),
  ultimaPassagem: timestamp("ultimaPassagem"),
  totalPassagens: int("totalPassagens").default(0),
  totalGasto: decimal("totalGasto", { precision: 10, scale: 2 }).default("0"),
  comoConheceu: varchar("comoConheceu", { length: 255 }),
  nivelFidelidade: varchar("nivelFidelidade", { length: 50 }),
  pontosFidelidade: int("pontosFidelidade").default(0),
  cashbackDisponivel: decimal("cashbackDisponivel", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── ANALISE_PROMOCOES ───────────────────────────────────────────────────────
export const analisePromocoes = mysqlTable("analise_promocoes", {
  id: int("id").autoincrement().primaryKey(),
  dataPromocao: date("dataPromocao"),
  nomePromocao: varchar("nomePromocao", { length: 255 }),
  clienteId: int("clienteId"),
  veioPelaPromocao: boolean("veioPelaPromocao").default(false),
  clienteRetornou: boolean("clienteRetornou").default(false),
  quantasVezesRetornou: int("quantasVezesRetornou").default(0),
  totalGasto: decimal("totalGasto", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── METAS_FINANCEIRAS (extra — controle de metas mensais) ───────────────────
export const metasFinanceiras = mysqlTable("metas_financeiras", {
  id: int("id").autoincrement().primaryKey(),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  metaMensal: decimal("meta_mensal", { precision: 12, scale: 2 }).notNull(),
  diasUteis: int("dias_uteis"),
  diasTrabalhados: int("dias_trabalhados"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type Empresa = typeof empresas.$inferSelect;
export type Colaborador = typeof colaboradores.$inferSelect;
export type Mecanico = typeof mecanicos.$inferSelect;
export type Recurso = typeof recursos.$inferSelect;
export type Cliente = typeof clientes.$inferSelect;
export type Veiculo = typeof veiculos.$inferSelect;
export type OrdemServico = typeof ordensServico.$inferSelect;
export type OrdemServicoItem = typeof ordensServicoItens.$inferSelect;
export type OrdemServicoHistorico = typeof ordensServicoHistorico.$inferSelect;
export type Agendamento = typeof agendamentos.$inferSelect;
export type Faturamento = typeof faturamento.$inferSelect;
export type ServicoCatalogo = typeof servicosCatalogo.$inferSelect;
export type Pendencia = typeof pendencias.$inferSelect;
export type CRM = typeof crm.$inferSelect;
export type MetaFinanceira = typeof metasFinanceiras.$inferSelect;
