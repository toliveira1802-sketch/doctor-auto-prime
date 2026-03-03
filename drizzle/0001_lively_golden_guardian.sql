CREATE TABLE `agendamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cliente_id` int,
	`veiculo_id` int,
	`mecanico_id` int,
	`data` date NOT NULL,
	`hora` time NOT NULL,
	`motivo_visita` varchar(300),
	`status` enum('Confirmado','Pendente','Cancelado','Concluído') DEFAULT 'Pendente',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agendamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(200) NOT NULL,
	`telefone` varchar(30),
	`email` varchar(320),
	`cpf_cnpj` varchar(20),
	`endereco` text,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_interacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cliente_id` int NOT NULL,
	`tipo` enum('Ligação','WhatsApp','Email','Visita','Outro') DEFAULT 'Outro',
	`descricao` text NOT NULL,
	`usuario_nome` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_interacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mecanicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`emoji` varchar(10) DEFAULT '🔧',
	`especialidade` varchar(150),
	`meta_semanal` decimal(12,2) DEFAULT '15000.00',
	`meta_mensal` decimal(12,2) DEFAULT '60000.00',
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mecanicos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metas_financeiras` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`meta_mensal` decimal(12,2) DEFAULT '200000.00',
	`dias_uteis` int DEFAULT 22,
	`dias_trabalhados` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metas_financeiras_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ordens_servico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(20) NOT NULL,
	`cliente_id` int,
	`veiculo_id` int,
	`mecanico_id` int,
	`consultor_nome` varchar(100),
	`status` enum('Diagnóstico','Orçamento','Aguardando Aprovação','Aguardando Peças','Em Execução','Pronto','Entregue','Cancelada') NOT NULL DEFAULT 'Diagnóstico',
	`tipo_servico` enum('Rápido','Médio','Demorado','Projeto') DEFAULT 'Médio',
	`descricao_problema` text,
	`servicos_realizados` text,
	`valor_orcamento` decimal(12,2),
	`valor_aprovado` decimal(12,2),
	`valor_final` decimal(12,2),
	`data_entrada` date,
	`data_previsao_entrega` date,
	`data_entrega` date,
	`observacoes` text,
	`km_entrada` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ordens_servico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `os_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`os_id` int NOT NULL,
	`status_anterior` varchar(60),
	`status_novo` varchar(60) NOT NULL,
	`observacao` text,
	`usuario_nome` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `os_historico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `veiculos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cliente_id` int,
	`placa` varchar(10) NOT NULL,
	`marca` varchar(60),
	`modelo` varchar(100),
	`ano` varchar(10),
	`cor` varchar(40),
	`km` int,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `veiculos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_cliente_id_clientes_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_veiculo_id_veiculos_id_fk` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_mecanico_id_mecanicos_id_fk` FOREIGN KEY (`mecanico_id`) REFERENCES `mecanicos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crm_interacoes` ADD CONSTRAINT `crm_interacoes_cliente_id_clientes_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_cliente_id_clientes_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_veiculo_id_veiculos_id_fk` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_mecanico_id_mecanicos_id_fk` FOREIGN KEY (`mecanico_id`) REFERENCES `mecanicos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `os_historico` ADD CONSTRAINT `os_historico_os_id_ordens_servico_id_fk` FOREIGN KEY (`os_id`) REFERENCES `ordens_servico`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `veiculos` ADD CONSTRAINT `veiculos_cliente_id_clientes_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;