# Doctor Auto Prime - TODO

## Wave 1: Admin Panel

- [x] Database schema: clientes, veiculos, mecanicos, ordens_servico, agendamentos, os_historico, crm_interacoes, metas_financeiras
- [x] Design system: dark theme, color tokens, typography (OKLCH)
- [x] DashboardLayout with sidebar navigation (grouped: Principal, Operacional, Gestão)
- [x] Dashboard principal: KPIs (veículos no pátio, agendamentos hoje, faturamento mês, ticket médio)
- [x] Dashboard Operacional: distribuição de status no pátio
- [x] Dashboard Financeiro: faturamento mensal, mix de serviços, top OS, termômetro de meta
- [x] Dashboard Produtividade: ranking de mecânicos, metas semanais/mensais
- [x] Pátio Kanban: drag-and-drop entre etapas (Diagnóstico, Orçamento, Aguardando Aprovação, Aguardando Peças, Em Execução, Pronto)
- [x] Nova OS: fluxo completo (cliente rápido / cliente existente, criação rápida de veículo)
- [x] Lista de Ordens de Serviço com filtros (status, consultor, busca)
- [x] Detalhe da OS com histórico de status e timeline
- [x] Agenda de Mecânicos (visualização por horário, agendamento rápido)
- [x] CRM: lista de clientes, histórico de interações, busca
- [x] Detalhe do Cliente: perfil, veículos, histórico de OS, interações CRM
- [x] Cadastro de Clientes (inline no fluxo Nova OS)
- [x] Cadastro de Veículos (inline no fluxo Nova OS)
- [x] Mecânicos seed com dados reais (Thales, Marcos, Rodrigo, Mauricio, Elias, Vitor)
- [x] Auth com role-based access (admin/user) via Manus OAuth
- [x] Vitest tests: 11 testes passando (auth + OS + financial logic)
- [x] Filtro por consultor (João, Pedro) nos dashboards
- [x] Termômetro de meta mensal (R$200.000 padrão)

## Wave 1.5: Admin + Gestão Pages (Concluído)

- [x] AdminFinanceiro: faturamento mensal, ticket médio, histórico 6 meses, mix de serviços
- [x] AdminProdutividade: ranking de mecânicos, gráfico de barras, indicadores de qualidade
- [x] AdminConfiguracoes: metas financeiras, metas por consultor, dados da empresa
- [x] GestaoVisaoGeral: painel estratégico com KPIs consolidados e histórico
- [x] GestaoOperacional: OS ativas em tempo real, prontas para entrega, aguardando aprovação
- [x] GestaoFinanceiro: análise financeira com faturamento vs meta e mix de serviços
- [x] GestaoProdutividade: ranking completo com score de qualidade por período
- [x] GestaoColaboradores: equipe administrativa com perfis
- [x] GestaoMecanicos: equipe técnica com grau, especialidade e score
- [x] GestaoMetas: configuração e acompanhamento de metas com barra de progresso
- [x] GestaoRelatorios: relatórios gerenciais consolidados por período
- [x] DashboardLayout atualizado: grupos Admin + Gestão + Dev
- [x] App.tsx: rotas /admin/* e /gestao/* completas
- [x] Dev navigator atualizado com todas as rotas

## Seed de Dados Reais (Concluído)

- [x] Mecânicos reais inseridos: Thales Oliveira (Especialista), Marcos Silva (Senior), Rodrigo Santos (Senior), Mauricio Costa (Pleno), Elias Ferreira (Pleno), Vitor Lima (Junior)
- [x] Colaboradores atualizados com cargos reais: Thales (Sócio/Diretor), Sofia (Gestão/Admin), Francisco (Gestão/Financeiro), Márcia (Coordenação), Pedro (Consultor Vendas), João (Consultor Vendas), Rony (Consultor Técnico), Antônio (Consultor Técnico), Simone (Coordenação)
- [x] Metas configuradas: meta_mensal=R$200k, ticket_medio=R$3.500, meta_os_mes=80, meta_os_semana=20, meta_os_dia=4, meta_nps=80, meta_reativacao=30
- [x] Metas por consultor: Pedro=R$80k, João=R$80k, Rony=R$40k, Antônio=R$40k
- [x] GestaoMetas: pré-carrega valores do banco nos inputs de metas por colaborador
- [x] GestaoColaboradores: cores de badge para todos os novos cargos

## Wave 2: Atendimento Kommo + IA (próxima onda)

- [ ] Integração Kommo CRM via API
- [ ] Bot de atendimento WhatsApp
- [ ] Agente IA para triagem de leads
- [ ] Automação de follow-up

## Wave 3: IA no Sistema (futura)

- [ ] Análise preditiva de OS
- [ ] Sugestão automática de serviços
- [ ] Coleta de dados externos

## Wave 4: Portal do Cliente (futura)

- [ ] Portal cliente com histórico de OS
- [ ] Aprovação de orçamento online
- [ ] Notificações de status em tempo real

## Dashboard Central de Gestão (futura)

- [ ] Central de controle com todas as 4 ondas monitoradas
- [ ] Relatório automático (sugestão recorrente)

## Schema Rebuild (TABELAS_SISTEMA.csv)

- [ ] Rebuild Drizzle schema: 15 tabelas oficiais (empresas, colaboradores, mecanicos, recursos, clientes, veiculos, ordens_servico, ordens_servico_itens, ordens_servico_historico, agendamentos, faturamento, servicos_catalogo, pendencias, crm, lista_status, niveis_acesso, analise_promocoes)
- [ ] Migrar banco e popular dados de referência (status, niveis_acesso, servicos_catalogo, mecanicos reais)
- [ ] Reescrever routers tRPC para novo schema
- [ ] Corrigir fluxo Nova OS: todos os campos obrigatórios, criação inline de cliente/veículo
- [ ] Atualizar Pátio, OsList, OsDetail, CRM, Financeiro, Produtividade para novo schema

## Nova OS - Ajustes CRM (Em andamento)

- [x] Aba 1: E-mail obrigatório com validação de formato
- [x] Aba 1: CPF obrigatório com validação de formato
- [x] Aba 1: Origem do Cadastro como rastreamento de campanha (dropdown de campanhas ativas)
- [x] Aba Veículo: KM atual obrigatório (bloqueia avanço sem preenchimento)
- [x] Aba Veículo: campo Última Revisão (data + km)
- [x] Schema: adicionar ultimaRevisaoKm e ultimaRevisaoData em veículos
- [x] Etiqueta de para-brisa: incluir Última Revisão nos dados gerados

## Anexos de Mídia na OS (Em andamento)

- [x] Schema: tabela os_anexos (id, ordemServicoId, url, fileKey, tipo, nomeArquivo, tamanho, createdAt)
- [x] SQL migration: criar tabela os_anexos
- [x] Router: osAnexos.upload (base64 → Buffer → S3), osAnexos.list, osAnexos.delete
- [x] Componente OSAnexos: drag-and-drop, preview de imagens, player de vídeo, lightbox
- [x] Integrar OSAnexos no AdminOSDetalhes como seção colapsável "Fotos & Vídeos do Veículo"

## Relatório de Campanhas (Em andamento)

- [ ] Router: relatorios.campanhas — cruza origem do cliente com OS fechadas e faturamento
- [ ] Página AdminRelatorioCampanhas: barras por canal, ticket médio, funil clientes → OS → faturamento
- [ ] Rota /admin/relatorios/campanhas e link no sidebar

## Dashboard Gestão Campanhas (Em andamento)

- [ ] Router relatorios.campanhas: cruza origemCadastro × OS fechadas × faturamento × ticket médio
- [ ] Página GestaoCampanhas: KPIs por canal, gráfico barras, tabela detalhada, filtro período
- [ ] Rota /gestao/campanhas e item no sidebar Gestão

## Wave 2: Gestão + Trello Migration (Concluído)

- [x] Tabela melhorias (17_melhorias): criada no banco com campos titulo, descricao, status, votos, categoria, criadoPor
- [x] Tabela trello_sync_log (18_trello_sync_log): criada para histórico de sincronizações
- [x] trelloService.ts: serviço completo para buscar cards Trello, calcular stats e gerar XLSX
- [x] Router trello: fetchEntregues, gerarPlanilha (S3 upload), historico, boardStatus
- [x] Router melhorias: list, create, vote, updateStatus
- [x] TrelloMigracao.tsx: página completa com board status, cards table, stats, download Excel
- [x] GestaoMelhorias.tsx: board de sugestões com votos, status, categorias e criação inline
- [x] GestaoCampanhas.tsx: ROI por canal, funil de conversão, insights automáticos
- [x] GestaoRH.tsx: equipe mecânicos com score, ranking performance, colaboradores admin
- [x] GestaoOperacoes.tsx: distribuição OS por status, carga por mecânico, agendamentos hoje, OS em atraso
- [x] GestaoTecnologia.tsx: status integrações, stack tecnológico, roadmap expansão 2026-2028
- [x] DashboardLayout: adicionados Trello, Melhorias, Campanhas, RH, Operações, Tecnologia no sidebar
- [x] App.tsx: rotas /admin/trello-migracao, /gestao/melhorias, /gestao/campanhas, /gestao/rh, /gestao/operacoes, /gestao/tecnologia

## Gerenciamento de Usuários (Concluído)

- [x] Procedures tRPC: colaboradores.list (com filtro inativo), niveisAcesso, create, update, delete (soft), resetSenha
- [x] Página AdminUsuarios: tabela com busca, filtro de inativos, badge de nível de acesso
- [x] Modal Criar Usuário: nome, cargo, email, telefone, nível de acesso (senha inicial 123456)
- [x] Modal Editar Usuário: todos os campos + campo de nova senha opcional
- [x] Modal Desativar Usuário: soft delete (ativo=false), com confirmação
- [x] Modal Resetar Senha: redefine para 123456 + marca primeiroAcesso=true
- [x] Reativar Usuário: opção no dropdown de ações para usuários inativos
- [x] Rota /admin/usuarios registrada no App.tsx
- [x] Link "Usuários" adicionado ao submenu Sistema no DashboardLayout (acesso: admin)
- [x] Vitest: 10 testes para colaboradores.crud passando

## Kanban Pátio - Novas Colunas

- [x] Adicionar status "Teste" (após Em Execução) no schema/enum e banco
- [x] Adicionar status "Agendado" e "Cancelado" como colunas finais no Kanban
- [x] Atualizar lista de status no Pátio Kanban na ordem correta
- [x] Atualizar filtros e dashboards para incluir os novos status

## Mapa da Oficina (Segunda Visão do Pátio)

- [x] Schema: tabela oficina_vagas (id, nome, tipo, posicaoX, posicaoY, largura, altura, osId FK)
- [x] SQL migration: criar tabela oficina_vagas e popular com as 14 vagas da imagem
- [x] Router: vagas.list (com OS alocada), vagas.alocar (associar OS a vaga), vagas.liberar
- [x] Componente MapaOficina: layout CSS grid fiel à imagem com cores por status
- [x] Toggle Kanban/Mapa na página AdminPatio
- [x] Vagas mostram placa + status da OS em tempo real

## Preparação para Lançamento

- [ ] Ocultar seção Gestão do sidebar (visível apenas para owner/dev)
- [ ] Ocultar seção Dev do sidebar (visível apenas para owner/dev)
- [ ] Publicar sistema no domínio docautoprime-s6kxius3.manus.space

## Integração Kommo + IA — Análise de Leads

- [ ] Ocultar GESTÃO e Dev do sidebar (visível só para owner)
- [ ] Página /admin/kommo-leads: listar leads do Kommo com score IA
- [ ] Router: kommo.leads.list — buscar leads via API Kommo
- [ ] Router: kommo.leads.analisar — invocar LLM para classificar lead (quente/morno/frio + resumo)
- [ ] Router: kommo.leads.distribuir — atribuir lead a consultor e notificar
- [ ] Salvar classificações na tabela crm/leads do banco
- [ ] Link "Leads Kommo" no sidebar (seção POMBAL)

## QG das IAs

- [x] Página /admin/ia-qg: painel central com cards de todos os agentes IA
- [x] Card Agente Ana: qualificação de leads Kommo (quente/morno/frio)
- [x] Card Reativação: campanha de clientes inativos 90d+
- [x] Card Análise de Leads: varrer leads Kommo e distribuir para consultores
- [x] Router: kommo.leads.list — buscar leads via API Kommo com filtros
- [x] Router: kommo.leads.analisarLote — IA classifica todos os leads pendentes
- [x] Router: kommo.leads.distribuir — atribuir lead a consultor + notificar
- [x] Link "QG das IAs" no sidebar POMBAL com ícone de IA

## Lead Scoring System (QG das IAs)

- [ ] Schema: tabela lead_scores (leadId, score, breakdown JSON, tier, scoredAt)
- [ ] Engine de scoring: 7 dimensões (valor, temperatura, engajamento, veículo, serviço, recência, completude)
- [ ] Router: kommo.scoreLeads — pontuar leads em lote
- [ ] Router: kommo.getScores — listar scores salvos com ranking
- [ ] Aba "Lead Scoring" no QG das IAs com ranking visual e breakdown por dimensão
- [ ] Badges de tier: S-Tier (90+), A (75-89), B (55-74), C (35-54), D (<35)
- [ ] Filtros por tier, consultor, período
- [ ] Alertas automáticos para S-Tier (notificação owner)

## Login sem senha (modo teste)

- [x] Remover campo senha do frontend Login.tsx
- [x] Remover validação de senha na rota /api/auth/local-login
- [x] Login por seleção de nome/perfil apenas (sem senha)
