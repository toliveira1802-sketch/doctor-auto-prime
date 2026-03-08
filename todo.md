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

## Lead Scoring Dashboard (QG das IAs)

- [x] Schema: tabela lead_scores (leadId, score, tier, breakdown JSON, scoredAt, consultorId)
- [x] Engine de scoring: 7 dimensões (valor, temperatura, engajamento, veículo, serviço, recência, completude de dados)
- [x] Router: leadScoring.scoreLeads — pontuar leads em lote e salvar no banco
- [x] Router: leadScoring.list — listar scores salvos com ranking e histórico
- [x] Dashboard Lead Scoring no QG das IAs: KPIs, gráfico de temperatura (pizza), gráfico de tier (barras), radar de engajamento, ranking de leads
- [x] Badges de tier: S (90+), A (75-89), B (55-74), C (35-54), D (<35)
- [x] Filtro por consultor e tier
- [x] Alerta automático para leads S-Tier (notificação owner)

## Lead Score History (Evolução Temporal)

- [x] Schema: tabela 22_lead_score_history (id, leadId, score, tier, temperature, scoredAt)
- [x] SQL migration: criar tabela 22_lead_score_history
- [x] Router: leadScoring.history — buscar snapshots históricos por leadId
- [x] Atualizar scoreLeads: salvar snapshot em lead_score_history a cada pontuação
- [x] Gráfico de linha histórico no card expandido do ScoreRow (LineChart recharts)
- [x] Tooltip com data, score, tier e delta (variação vs anterior)
- [x] Indicador de tendência: seta para cima/baixo com variação percentual

## Integração Kommo API — Leads Reais

- [ ] Auditar kommo.ts: verificar se OAuth token refresh está funcionando
- [ ] Verificar credenciais KOMMO_CLIENT_ID, KOMMO_CLIENT_SECRET, KOMMO_DOMAIN no env
- [ ] Corrigir/completar endpoint de busca de leads reais (GET /api/v4/leads)
- [ ] Mapear campos Kommo → modelo LeadScore (nome, valor, temperatura, tags, responsável)
- [ ] Testar pipeline: buscar leads → scoring IA → salvar em lead_scores + lead_score_history
- [ ] Exibir leads reais no QG das IAs com score e tier
- [ ] Página de status da conexão Kommo com botão de reconectar

## Melhorias no Sidebar (Todos os Perfis)

- [x] Adicionar "Melhorias" ao PERFIL_ACESSO: visível para consultor, admin, gestor
- [x] Adicionar item "Melhorias" no grupo POMBAL do sidebar (após QG das IAs)

## Logins com Senha (João, Pedro, Sophia)

- [ ] Adicionar colunas username, senha_hash, primeiro_acesso na tabela colaboradores
- [ ] Setar doctor_joao/123456, doctor_pedro/123456, doctor_sophia/123456 no banco
- [ ] Marcar primeiroAcesso=true para Sophia
- [ ] Tela de login: modo seleção rápida (sem senha) + modo login com usuário+senha
- [ ] Rota POST /api/auth/local-login aceitar username+senha além de colaboradorId
- [ ] Tela /trocar-senha: obrigatória no primeiro acesso antes de acessar o sistema
- [ ] Rota POST /api/auth/change-password para atualizar senha e limpar primeiroAcesso

## Login — Seleção de Perfil (sem expor funcionários)

- [ ] Reescrever Login.tsx: 4 cards de perfil (Consultor, Gestão, Administrador, Mecânico)
- [ ] Servidor: aceitar { perfil } em vez de { colaboradorId } e criar sessão pelo perfil

## Login Individual com Senha (Doctor_Nome)

- [ ] Corrigir bug: clique no perfil Consultor não redireciona
- [ ] Tela de login: username + senha (Doctor_Sophia, Doctor_Pedro, Doctor_Joao)
- [ ] Fluxo de troca obrigatória de senha no primeiro acesso
- [ ] Credenciais: Doctor_Sophia/123456 (Sophia com PH), Doctor_Pedro/123456, Doctor_Joao/123456

## Academia Doctor Auto (Roadmap v3)

- [ ] Schema: tabelas academia_modulos, academia_licoes, academia_quiz_perguntas, academia_progresso
- [ ] SQL migration: criar tabelas e popular com conteúdo inicial (3 módulos)
- [ ] Módulo 1: "De onde vêm os dados" — fontes (Trello, OS, Kommo, Pátio, Financeiro)
- [ ] Módulo 2: "Como funcionam as campanhas" — ciclo lead → OS → reativação → fidelização
- [ ] Módulo 3: "O sistema na prática" — como usar cada tela do dia a dia
- [ ] Quiz interativo por módulo (5 perguntas cada, múltipla escolha)
- [ ] Barra de progresso por colaborador (% de módulos concluídos)
- [ ] Badge de conclusão por módulo (visual na tela de perfil)
- [ ] Página /admin/academia visível para todos os perfis
- [ ] Link "Academia" no sidebar grupo POMBAL com ícone de graduação

## Login — Senha por Perfil

- [ ] Ao clicar no quadrado de perfil, exibir campo de senha simples
- [ ] Senha por perfil: Consultor=1234, Administrador=1234, Gestão=1234, Mecânico=1234
- [ ] Rota /api/auth/local-login-perfil valida senha por nivelAcessoId

## Bug Fix: Fluxo Nova OS Step 2 → Step 3

- [x] Corrigir clientes.create para retornar objeto completo (não só {id})
- [x] Corrigir veiculos.create para retornar objeto completo com clienteId
- [x] Garantir que veiculoSelecionado seja setado corretamente após criar novo veículo
- [x] Corrigir SelectItem value="" no campo Campanha do Step 3 (causava crash ao avançar)
- [x] Testar fluxo completo: cliente existente + veículo existente → Step 3 abre sem crash

## Bug Fix: clienteId chegando como NaN no fluxo Nova OS

- [x] Auditar clientes.list no servidor — validar que clienteId NaN não executa query
- [x] Auditar veiculos.list no servidor — validar que clienteId NaN não executa query
- [x] Auditar os.create no servidor — guard isNaN(clienteId) e isNaN(veiculoId) adicionado
- [x] Auditar frontend AdminNovaOS — handleCriarOS com guards isNaN em todos os ids
- [x] Corrigir parseInt sem radix em AdminOSDetalhes (colaboradorId, mecanicoId)
- [x] Testar TypeScript — sem erros após correções

## Remover Login Obrigatório do Site

- [x] Remover guard de autenticação do DashboardLayout (não redirecionar para login)
- [x] Remover redirect para /login no App.tsx nas rotas /admin e /gestao
- [x] Manter o sistema de sessão funcionando para quem quiser logar
- [x] Testar acesso direto sem login — dashboard abre sem autenticação

## Feature: OS Ultimate (Gestão)

- [x] Criar página GestaoOSUltimate.tsx com painel gerencial completo
- [x] KPIs: total OS abertas, em execução, aguardando aprovação, prontas, ticket médio, faturamento mês
- [x] Funil de status visual (Diagnóstico → Orçamento → Aprovado → Em Execução → Pronto → Entregue)
- [x] Tabela completa de OS com filtros por status, consultor, mecânico
- [x] Ranking de mecânicos com qtde OS, valor gerado e placas ao clicar
- [x] Alertas: OS paradas há mais de 48h, orçamentos sem aprovação há mais de 24h
- [x] Mix de serviços: Rápido / Médio / Demorado / Projeto com valores e metas
- [x] Filtro por consultor (Pedro, João, Thales)
- [x] Registrar rota /gestao/os-ultimate no App.tsx
- [x] Adicionar item "OS Ultimate" no menu GESTÃO do DashboardLayout

## Feature: Filtro de Período na OS Ultimate

- [x] Adicionar seletor de mês/ano no topo da OS Ultimate (padrão = mês vigente)
- [x] Filtrar KPIs pelo período selecionado (dataEntrada >= início do mês)
- [x] Filtrar funil de status pelo período
- [x] Filtrar ranking de mecânicos pelo período
- [x] Filtrar tabela de OS pelo período
- [x] Faturamento mês: usar dataSaida dentro do período para OS Entregues

## Feature: Integração Kommo via Webhook

- [ ] Criar tabela kommo_leads no banco (id, leadId, nome, status, etapa, consultor, telefone, veiculo, origem, createdAt, updatedAt)
- [ ] Criar endpoint POST /api/kommo/webhook para receber eventos do Kommo
- [ ] Parsear payload do Kommo: leads[add], leads[update], leads[status], contacts[add]
- [ ] Salvar/atualizar lead no banco a cada evento recebido
- [ ] Criar procedure trpc leads.list com filtro de período e consultor
- [ ] Criar procedure trpc leads.stats para taxa de conversão lead → OS
- [ ] Criar tela GestaoLeads.tsx com tabela de leads, KPIs e funil de conversão
- [ ] Adicionar item "Leads CRM" no menu GESTÃO do DashboardLayout
- [ ] Registrar rota /gestao/leads no App.tsx
- [ ] Testar endpoint com payload simulado do Kommo
- [ ] Entregar URL do webhook para configurar no Kommo

## Feature: Página DevAPIs (aba DEV)
- [ ] Criar página DevAPIs com cards de integração
- [ ] Cards: Kommo (webhook), Trello, WhatsApp, Telegram, Google Sheets, OpenAI
- [ ] Status de conexão em tempo real para cada API
- [ ] Instruções de configuração por card (URL webhook, como obter token, etc.)
- [ ] Registrar rota /dev/apis no App.tsx e menu DEV

## Feature: Sistema de Logs no Painel DEV
- [x] Criar tabela 23_system_logs no banco (id, timestamp, nivel, fonte, mensagem, detalhes, userId)
- [x] Atualizar schema drizzle para incluir systemLogs
- [x] Criar procedures tRPC: logs.list (filtros nivel/fonte/limit), logs.add, logs.clearAll
- [x] Adicionar aba Logs no Painel DEV com tabela, filtros, auto-refresh (5s) e expandir detalhes
- [x] Instrumentar webhook Kommo para gravar logs de sucesso/erro automaticamente
- [x] Testar: webhook disparado → 2 logs gravados no banco confirmados

## Feature: Visibilidade por Role no Painel DEV

- [ ] Criar estrutura de configs visibility.{role}.{secao} no banco (consultor, gestor, admin, mecanico)
- [ ] Atualizar aba Visibilidade no Painel DEV: grid roles x seções com toggles individuais
- [ ] Seções controladas: POMBAL, GESTÃO, DEV, e itens individuais do sidebar
- [ ] Aplicar flags de visibilidade por role no DashboardLayout em tempo real
- [ ] Salvar e ler configs do banco via procedure config.getAll

## Feature: Sistema de 5 Roles (Dev, Gestão, Consultor, Mecânico, Cliente)

- [x] Procedure auth.devLogin: validar login Dev_thales + senha T060925@ e retornar token de sessão
- [x] Procedure auth.setRole: salvar role ativo no localStorage/cookie do frontend
- [x] Contexto RoleContext no frontend com role ativo e funções switchRole/devLogin
- [x] Tela de seleção de perfil (/selecionar-perfil) com 5 cards de role
- [x] Login Dev com modal de senha protegida (login: Dev_thales, senha: T060925@)
- [x] DashboardLayout: filtrar itens do sidebar por role ativo (via RoleContext)
- [x] Consultor: ver apenas POMBAL
- [x] Gestão: ver POMBAL + GESTÃO (sem DEV)
- [x] Mecânico: ver apenas POMBAL simplificado
- [x] Dev: ver tudo (POMBAL + GESTÃO + DEV)
- [x] Cliente: card na tela de seleção (portal separado em breve)
- [x] Painel DEV: aba Controle de Acesso com credenciais, matriz de visibilidade e permissões por role
- [x] Indicador de role ativo no rodapé do sidebar (badge colorido + botão Trocar Perfil)
