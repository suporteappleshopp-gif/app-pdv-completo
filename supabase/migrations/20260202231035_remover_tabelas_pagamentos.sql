-- Migration: Remover tabelas e colunas relacionadas a pagamentos via API
-- Remove tabelas de histórico de pagamentos e logs de webhook
-- Remove colunas de pagamento dos operadores que não serão mais usadas

-- 1. Remover tabelas de pagamentos
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS historico_pagamentos CASCADE;
DROP TABLE IF EXISTS solicitacoes_renovacao CASCADE;

-- 2. Remover colunas relacionadas a pagamentos dos operadores
-- Mantendo apenas as colunas essenciais para controle de assinatura manual
ALTER TABLE operadores
  DROP COLUMN IF EXISTS aguardando_pagamento CASCADE,
  DROP COLUMN IF EXISTS payment_preference_id CASCADE,
  DROP COLUMN IF EXISTS payment_id CASCADE,
  DROP COLUMN IF EXISTS payment_status CASCADE,
  DROP COLUMN IF EXISTS payment_method CASCADE;

-- 3. Comentário de documentação
COMMENT ON TABLE operadores IS 'Tabela de operadores do sistema. Pagamentos são gerenciados manualmente via links do Mercado Pago.';
