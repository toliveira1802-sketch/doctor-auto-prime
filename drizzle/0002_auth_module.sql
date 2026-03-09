-- Auth Module Migration
-- Adds new authentication fields to 01_colaboradores table
-- Safe to run multiple times (uses IF NOT EXISTS pattern via ALTER TABLE)

-- Add setor (department) column
ALTER TABLE `01_colaboradores` ADD COLUMN IF NOT EXISTS `setor` varchar(100) NULL;
--> statement-breakpoint

-- Add avatar column
ALTER TABLE `01_colaboradores` ADD COLUMN IF NOT EXISTS `avatar` varchar(500) NULL;
--> statement-breakpoint

-- Add failedAttempts column for login attempt tracking
ALTER TABLE `01_colaboradores` ADD COLUMN IF NOT EXISTS `failedAttempts` int DEFAULT 0;
--> statement-breakpoint

-- Add lockedUntil column for account lockout
ALTER TABLE `01_colaboradores` ADD COLUMN IF NOT EXISTS `lockedUntil` timestamp NULL;
--> statement-breakpoint

-- Add updatedAt column
ALTER TABLE `01_colaboradores` ADD COLUMN IF NOT EXISTS `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
