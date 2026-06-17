-- Migration de diagnóstico: garantir colunas necessárias na tabela produtos
-- Adicionar colunas que podem estar faltando com segurança

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_medio NUMERIC(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_custo_compra NUMERIC(15,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS venda_por_kg BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS loja_id UUID,
  ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT;
