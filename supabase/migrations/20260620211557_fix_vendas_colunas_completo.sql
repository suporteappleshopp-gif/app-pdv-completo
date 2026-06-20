-- FIX DEFINITIVO: Adicionar todas as colunas necessárias em vendas e itens_venda

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS tipo_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS pagamentos JSONB,
  ADD COLUMN IF NOT EXISTS valor_recebido NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS troco NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS operador_nome TEXT,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

ALTER TABLE itens_venda
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

ALTER TABLE itens_venda
  ALTER COLUMN produto_id DROP NOT NULL;

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