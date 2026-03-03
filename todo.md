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
