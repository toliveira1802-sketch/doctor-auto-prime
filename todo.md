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
