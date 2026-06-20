-- =====================================================
-- FIX: Corrigir schema de vendas e itens_venda
-- Problemas encontrados nos logs de erro:
-- 1. Coluna 'pagamentos' não existe em vendas
-- 2. Coluna 'codigo_barras' não existe em itens_venda
-- 3. produto_id é NOT NULL mas código envia null
-- 4. codigo_barras ausente no itens_venda
-- =====================================================

-- 1. Adicionar coluna 'pagamentos' em vendas (JSONB para múltiplas formas)
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS pagamentos JSONB,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS valor_recebido NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS troco NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS operador_nome TEXT;

-- 2. Tornar produto_id nullable em itens_venda (produtos vendidos por KG podem não ter UUID válido)
ALTER TABLE itens_venda
  ALTER COLUMN produto_id DROP NOT NULL;

-- 3. Adicionar coluna codigo_barras em itens_venda
ALTER TABLE itens_venda
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

-- 4. Garantir que vendas.tipo_pagamento aceite todos os tipos
-- (já existe no schema original, mas garantir que não tenha constraint bloqueante)
-- Não adiciona constraint pois a coluna já existe sem ela

-- 5. Garantir que a publicação realtime inclua as tabelas
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
