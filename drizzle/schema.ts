import {
  bigint,
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

// ─── AUTH / USERS ────────────────────────────────────────────────────────────
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

// ─── 00_EMPRESAS ─────────────────────────────────────────────────────────────
export const empresas = mysqlTable("00_empresas", {
  id: int("id").autoincrement().primaryKey(),
  razaoSocial: varchar("razaoSocial", { length: 200 }).notNull(),
  nomeEmpresa: varchar("nomeEmpresa", { length: 200 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  telefone: varchar("telefone", { length: 20 }),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type Empresa = typeof empresas.$inferSelect;

// ─── 01_COLABORADORES ────────────────────────────────────────────────────────
export const colaboradores = mysqlTable("01_colaboradores", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 200 }).notNull(),
  cargo: varchar("cargo", { length: 100 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  cpf: varchar("cpf", { length: 20 }),
  senha: varchar("senha", { length: 255 }).default("123456"),
  primeiroAcesso: boolean("primeiroAcesso").default(true),
  nivelAcessoId: int("nivelAcessoId").default(1),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type Colaborador = typeof colaboradores.$inferSelect;

// ─── 02_NIVEL_DE_ACESSO ──────────────────────────────────────────────────────
export const nivelDeAcesso = mysqlTable("02_nivelDeAcesso", {
  id: int("id").autoincrement().primaryKey(),
  tipoUsuario: varchar("tipoUsuario", { length: 100 }).notNull(),
  nivelAcesso: int("nivelAcesso").default(1),
  permissoes: text("permissoes"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── 03_MECANICOS ────────────────────────────────────────────────────────────
export const mecanicos = mysqlTable("03_mecanicos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nome: varchar("nome", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  cpf: varchar("cpf", { length: 20 }),
  grauConhecimento: varchar("grauConhecimento", { length: 50 }),
  especialidade: varchar("especialidade", { length: 100 }),
  qtdePositivos: int("qtdePositivos").default(0),
  qtdeNegativos: int("qtdeNegativos").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type Mecanico = typeof mecanicos.$inferSelect;

// ─── 04_LISTA_STATUS ─────────────────────────────────────────────────────────
export const listaStatus = mysqlTable("04_lista_status", {
  id: int("id").autoincrement().primaryKey(),
  status: varchar("status", { length: 100 }).notNull(),
  ordem: int("ordem").notNull(),
  cor: varchar("cor", { length: 20 }),
  ativo: boolean("ativo").default(true),
});

// ─── 05_PENDENCIAS ───────────────────────────────────────────────────────────
export const pendencias = mysqlTable("05_pendencias", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId"),
  colaboradorId: int("colaboradorId"),
  titulo: varchar("titulo", { length: 300 }).notNull(),
  descricao: text("descricao"),
  status: varchar("status", { length: 50 }).default("Pendente"),
  prioridade: varchar("prioridade", { length: 20 }).default("media"),
  osId: int("osId"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type Pendencia = typeof pendencias.$inferSelect;

// ─── 06_RECURSOS ─────────────────────────────────────────────────────────────
export const recursos = mysqlTable("06_recursos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull(),
  nomeRecurso: varchar("nomeRecurso", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 50 }).default("Elevador"),
  ocupado: boolean("ocupado").default(false),
  osId: int("osId"),
  ultimaManutencao: date("ultimaManutencao"),
  horasUtilizadasMes: decimal("horasUtilizadasMes", { precision: 10, scale: 2 }).default("0"),
  valorProduzidoMes: decimal("valorProduzidoMes", { precision: 10, scale: 2 }).default("0"),
  ativo: boolean("ativo").default(true),
});
export type Recurso = typeof recursos.$inferSelect;

// ─── 07_CLIENTES ─────────────────────────────────────────────────────────────
export const clientes = mysqlTable("07_clientes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").default(1),
  nomeCompleto: varchar("nomeCompleto", { length: 300 }).notNull(),
  cpf: varchar("cpf", { length: 20 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  dataNascimento: date("dataNascimento"),
  endereco: varchar("endereco", { length: 500 }),
  cep: varchar("cep", { length: 10 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  origemCadastro: varchar("origemCadastro", { length: 100 }).default("Sistema"),
  nivelFidelidade: varchar("nivelFidelidade", { length: 20 }).default("Bronze"),
  totalOsRealizadas: int("totalOsRealizadas").default(0),
  totalGasto: decimal("totalGasto", { precision: 12, scale: 2 }).default("0"),
  senha: varchar("senha", { length: 255 }),
  primeiroAcesso: boolean("primeiroAcesso").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

// ─── 08_VEICULOS ─────────────────────────────────────────────────────────────
export const veiculos = mysqlTable("08_veiculos", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId").notNull(),
  placa: varchar("placa", { length: 10 }).notNull(),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 200 }),
  versao: varchar("versao", { length: 200 }),
  ano: int("ano"),
  combustivel: varchar("combustivel", { length: 50 }),
  ultimoKm: int("ultimoKm").default(0),
  kmAtual: int("kmAtual").default(0),
  ultimaRevisaoKm: int("ultimaRevisaoKm"),
  ultimaRevisaoData: date("ultimaRevisaoData"),
  origemContato: varchar("origemContato", { length: 100 }),
  cor: varchar("cor", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type Veiculo = typeof veiculos.$inferSelect;
export type InsertVeiculo = typeof veiculos.$inferInsert;

// ─── 09_ORDENS_SERVICO ───────────────────────────────────────────────────────
export const ordensServico = mysqlTable("09_ordens_servico", {
  id: int("id").autoincrement().primaryKey(),
  numeroOs: varchar("numeroOs", { length: 50 }),
  dataEntrada: timestamp("dataEntrada").defaultNow(),
  dataSaida: timestamp("dataSaida"),
  clienteId: int("clienteId").notNull(),
  veiculoId: int("veiculoId").notNull(),
  placa: varchar("placa", { length: 10 }),
  km: int("km").default(0),
  status: varchar("status", { length: 100 }).default("Diagnóstico"),
  colaboradorId: int("colaboradorId"),
  mecanicoId: int("mecanicoId"),
  recursoId: int("recursoId"),
  veioDePromocao: boolean("veioDePromocao").default(false),
  motivoVisita: text("motivoVisita"),
  diagnostico: text("diagnostico"),
  totalOrcamento: decimal("totalOrcamento", { precision: 10, scale: 2 }).default("0"),
  valorTotalOs: decimal("valorTotalOs", { precision: 10, scale: 2 }).default("0"),
  primeiraVez: boolean("primeiraVez").default(false),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type OrdemServico = typeof ordensServico.$inferSelect;
export type InsertOrdemServico = typeof ordensServico.$inferInsert;

// ─── 10_ORDENS_SERVICO_HISTORICO ─────────────────────────────────────────────
export const osHistorico = mysqlTable("10_ordens_servico_historico", {
  id: int("id").autoincrement().primaryKey(),
  ordemServicoId: int("ordemServicoId").notNull(),
  statusAnterior: varchar("statusAnterior", { length: 100 }),
  statusNovo: varchar("statusNovo", { length: 100 }),
  colaboradorId: int("colaboradorId"),
  observacao: text("observacao"),
  dataAlteracao: timestamp("dataAlteracao").defaultNow(),
});

// ─── 11_ORDENS_SERVICO_ITENS ─────────────────────────────────────────────────
export const osItens = mysqlTable("11_ordens_servico_itens", {
  id: int("id").autoincrement().primaryKey(),
  ordemServicoId: int("ordemServicoId").notNull(),
  tipo: varchar("tipo", { length: 50 }).default("servico"),
  descricao: varchar("descricao", { length: 500 }).notNull(),
  quantidade: decimal("quantidade", { precision: 10, scale: 2 }).default("1"),
  valorUnitario: decimal("valorUnitario", { precision: 10, scale: 2 }).default("0"),
  valorTotal: decimal("valorTotal", { precision: 10, scale: 2 }).default("0"),
  aprovado: boolean("aprovado"),
  executado: boolean("executado").default(false),
  mecanicoId: int("mecanicoId"),
  prioridade: varchar("prioridade", { length: 20 }).default("amarelo"),
  valorCusto: decimal("valorCusto", { precision: 10, scale: 2 }).default("0"),
  margemAplicada: decimal("margemAplicada", { precision: 5, scale: 2 }).default("40"),
  status: varchar("status", { length: 30 }).default("pendente"),
  motivoRecusa: text("motivoRecusa"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type OsItem = typeof osItens.$inferSelect;
export type InsertOsItem = typeof osItens.$inferInsert;

// ─── 12_AGENDAMENTOS ─────────────────────────────────────────────────────────
export const agendamentos = mysqlTable("12_agendamentos", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId"),
  veiculoId: int("veiculoId"),
  dataAgendamento: date("dataAgendamento").notNull(),
  horaAgendamento: varchar("horaAgendamento", { length: 10 }).notNull(),
  motivoVisita: text("motivoVisita"),
  status: varchar("status", { length: 50 }).default("Agendado"),
  colaboradorId: int("colaboradorId"),
  observacoes: text("observacoes"),
  origem: varchar("origem", { length: 50 }).default("Sistema"),
  osId: int("osId"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type Agendamento = typeof agendamentos.$inferSelect;

// ─── 95_FATURAMENTO ──────────────────────────────────────────────────────────
export const faturamento = mysqlTable("95_faturamento", {
  id: int("id").autoincrement().primaryKey(),
  ordemServicoId: int("ordemServicoId"),
  clienteId: int("clienteId"),
  dataEntrega: timestamp("dataEntrega"),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  formaPagamento: varchar("formaPagamento", { length: 50 }),
  parcelas: int("parcelas").default(1),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type Faturamento = typeof faturamento.$inferSelect;

// ─── 97_ANALISE_PROMOCOES ────────────────────────────────────────────────────
export const analisePromocoes = mysqlTable("97_analise_promocoes", {
  id: int("id").autoincrement().primaryKey(),
  dataPromocao: date("dataPromocao"),
  nomePromocao: varchar("nomePromocao", { length: 200 }),
  clienteId: int("clienteId"),
  veioPelaPromocao: boolean("veioPelaPromocao").default(false),
  clienteRetornou: boolean("clienteRetornou").default(false),
  quantasVezesRetornou: int("quantasVezesRetornou").default(0),
  totalGasto: decimal("totalGasto", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── 98_SERVICOS_CATALOGO ────────────────────────────────────────────────────
export const servicosCatalogo = mysqlTable("98_servicos_catalogo", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 50 }).default("servico"),
  categoria: varchar("categoria", { length: 100 }),
  valorBase: decimal("valorBase", { precision: 10, scale: 2 }).default("0"),
  tempoEstimado: int("tempoEstimado").default(60),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type ServicoCatalogo = typeof servicosCatalogo.$inferSelect;

// ─── 99_CRM ──────────────────────────────────────────────────────────────────
export const crm = mysqlTable("99_crm", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId").notNull(),
  marcaCarro: varchar("marcaCarro", { length: 100 }),
  modeloCarro: varchar("modeloCarro", { length: 200 }),
  tipoServico1: varchar("tipoServico1", { length: 100 }),
  tipoServico2: varchar("tipoServico2", { length: 100 }),
  tipoServico3: varchar("tipoServico3", { length: 100 }),
  ultimaQuilometragem: int("ultimaQuilometragem").default(0),
  ultimaPassagem: date("ultimaPassagem"),
  totalPassagens: int("totalPassagens").default(0),
  totalGasto: decimal("totalGasto", { precision: 10, scale: 2 }).default("0"),
  comoConheceu: varchar("comoConheceu", { length: 200 }),
  nivelFidelidade: varchar("nivelFidelidade", { length: 50 }).default("Bronze"),
  pontosFidelidade: int("pontosFidelidade").default(0),
  cashbackDisponivel: decimal("cashbackDisponivel", { precision: 10, scale: 2 }).default("0"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type CrmRecord = typeof crm.$inferSelect;

// ─── SYSTEM_CONFIG ───────────────────────────────────────────────────────────
export const osAnexos = mysqlTable("14_os_anexos", {
  id:               int("id").primaryKey().autoincrement(),
  ordemServicoId:   int("ordem_servico_id").notNull(),
  url:              varchar("url", { length: 1000 }).notNull(),
  fileKey:          varchar("file_key", { length: 500 }).notNull(),
  tipo:             varchar("tipo", { length: 20 }).notNull().default("imagem"), // imagem | video
  nomeArquivo:      varchar("nome_arquivo", { length: 255 }),
  tamanhoBytes:     int("tamanho_bytes"),
  descricao:        varchar("descricao", { length: 500 }),
  createdAt:        timestamp("created_at").defaultNow(),
});

export const mecanicoFeedback = mysqlTable("13_mecanico_feedback", {
  id: int("id").autoincrement().primaryKey(),
  mecanicoId: int("mecanicoId").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'positivo' | 'negativo'
  comentario: text("comentario"),
  dataFeedback: date("dataFeedback").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type MecanicoFeedback = typeof mecanicoFeedback.$inferSelect;
export type InsertMecanicoFeedback = typeof mecanicoFeedback.$inferInsert;

export const systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  chave: varchar("chave", { length: 200 }).notNull().unique(),
  valor: text("valor"),
  descricao: varchar("descricao", { length: 500 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type SystemConfig = typeof systemConfig.$inferSelect;

// ─── 15_KOMMO_TOKENS ────────────────────────────────────────────────────────────
export const kommoTokens = mysqlTable("15_kommo_tokens", {
  id: int("id").autoincrement().primaryKey(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  tokenType: varchar("tokenType", { length: 50 }).default("Bearer"),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  baseDomain: varchar("baseDomain", { length: 200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type KommoToken = typeof kommoTokens.$inferSelect;

// ─── 16_KOMMO_LEADS ────────────────────────────────────────────────────────────
export const kommoLeads = mysqlTable("16_kommo_leads", {
  id: int("id").autoincrement().primaryKey(),
  kommoLeadId: int("kommoLeadId").notNull().unique(),
  nome: varchar("nome", { length: 300 }),
  telefone: varchar("telefone", { length: 30 }),
  status: varchar("status", { length: 100 }).default("novo"),
  pipeline: varchar("pipeline", { length: 100 }),
  origemCanal: varchar("origemCanal", { length: 100 }),
  tipoServico: varchar("tipoServico", { length: 100 }),
  placa: varchar("placa", { length: 15 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 200 }),
  temperatura: varchar("temperatura", { length: 20 }).default("morno"), // quente | morno | frio
  clienteId: int("clienteId"),
  agendamentoId: int("agendamentoId"),
  ultimaMensagem: text("ultimaMensagem"),
  ultimaInteracao: timestamp("ultimaInteracao"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type KommoLead = typeof kommoLeads.$inferSelect;

// ─── 17_MELHORIAS ─────────────────────────────────────────────────────────────
export const melhorias = mysqlTable("17_melhorias", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 300 }).notNull(),
  descricao: text("descricao"),
  categoria: varchar("categoria", { length: 100 }).default("sistema"),
  status: varchar("status", { length: 50 }).default("pendente"),
  votos: int("votos").default(0),
  criadoPor: varchar("criadoPor", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type Melhoria = typeof melhorias.$inferSelect;
export type InsertMelhoria = typeof melhorias.$inferInsert;

// ─── 18_TRELLO_SYNC_LOG ───────────────────────────────────────────────────────
export const trelloSyncLog = mysqlTable("18_trello_sync_log", {
  id: int("id").autoincrement().primaryKey(),
  executadoEm: timestamp("executadoEm").defaultNow(),
  totalCards: int("totalCards").default(0),
  totalEntregue: int("totalEntregue").default(0),
  totalFevereiro: int("totalFevereiro").default(0),
  faturamentoTotal: decimal("faturamentoTotal", { precision: 12, scale: 2 }).default("0"),
  ticketMedio: decimal("ticketMedio", { precision: 10, scale: 2 }).default("0"),
  margemMedia: decimal("margemMedia", { precision: 5, scale: 2 }).default("0"),
  status: varchar("status", { length: 50 }).default("sucesso"),
  erro: text("erro"),
  excelUrl: varchar("excelUrl", { length: 1000 }),
  excelKey: varchar("excelKey", { length: 500 }),
});
export type TrelloSyncLog = typeof trelloSyncLog.$inferSelect;

// ─── 19_TRELLO_CARD_OVERRIDES ─────────────────────────────────────────────────
// Armazena edições manuais dos campos dos cards do Trello
export const trelloCardOverrides = mysqlTable("19_trello_card_overrides", {
  id: int("id").autoincrement().primaryKey(),
  cardId: varchar("cardId", { length: 100 }).notNull().unique(),
  nomeCliente: varchar("nomeCliente", { length: 255 }),
  telefone: varchar("telefone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  placa: varchar("placa", { length: 20 }),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  categoria: varchar("categoria", { length: 100 }),
  mecanico: varchar("mecanico", { length: 100 }),
  responsavel: varchar("responsavel", { length: 100 }),
  valorAprovado: varchar("valorAprovado", { length: 50 }),
  valorCusto: varchar("valorCusto", { length: 50 }),
  km: varchar("km", { length: 20 }),
  dataEntrada: varchar("dataEntrada", { length: 50 }),
  previsaoEntrega: varchar("previsaoEntrega", { length: 50 }),
  diagnostico: text("diagnostico"),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow(),
});
export type TrelloCardOverride = typeof trelloCardOverrides.$inferSelect;

// ─── 20_OFICINA_VAGAS ─────────────────────────────────────────────────────────
// Vagas físicas da oficina (elevadores, boxes, rampas) para o Mapa da Oficina
export const oficinaVagas = mysqlTable("20_oficina_vagas", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 50 }).default("elevador"),
  colStart: int("colStart").notNull(),
  rowStart: int("rowStart").notNull(),
  colSpan: int("colSpan").default(1),
  rowSpan: int("rowSpan").default(1),
  osId: int("osId"),
  ativo: boolean("ativo").default(true),
});
export type OficinaVaga = typeof oficinaVagas.$inferSelect;
