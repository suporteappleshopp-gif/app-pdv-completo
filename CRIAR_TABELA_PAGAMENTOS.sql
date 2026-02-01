-- ============================================================================
-- SCRIPT COMPLETO: Criar tabela historico_pagamentos e corrigir RLS
-- ============================================================================
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Criar tabela historico_pagamentos
CREATE TABLE IF NOT EXISTS historico_pagamentos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  mes_referencia TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento TIMESTAMP WITH TIME ZONE,
  data_pagamento TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado', 'processando')),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  dias_comprados INTEGER NOT NULL,
  tipo_compra TEXT NOT NULL,
  mercadopago_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Relacionamento com operadores
  FOREIGN KEY (usuario_id) REFERENCES operadores(id) ON DELETE CASCADE
);

-- 2. Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_usuario_id ON historico_pagamentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_status ON historico_pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_data_pagamento ON historico_pagamentos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_mercadopago ON historico_pagamentos(mercadopago_payment_id);

-- 3. RLS (Row Level Security)
ALTER TABLE historico_pagamentos ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Usuarios podem ver seus proprios pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "Sistema pode inserir pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "Sistema pode atualizar pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "Usuarios e API podem ver pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "API pode inserir pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "API pode atualizar pagamentos" ON historico_pagamentos;
DROP POLICY IF EXISTS "API pode deletar pagamentos" ON historico_pagamentos;

-- 5. Criar políticas permissivas (permite acesso total via API)
CREATE POLICY "Usuarios e API podem ver pagamentos"
ON historico_pagamentos
FOR SELECT
USING (true);

CREATE POLICY "API pode inserir pagamentos"
ON historico_pagamentos
FOR INSERT
WITH CHECK (true);

CREATE POLICY "API pode atualizar pagamentos"
ON historico_pagamentos
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "API pode deletar pagamentos"
ON historico_pagamentos
FOR DELETE
USING (true);

-- 6. Comentários para documentação
COMMENT ON TABLE historico_pagamentos IS 'Histórico completo de pagamentos dos usuários';
COMMENT ON COLUMN historico_pagamentos.dias_comprados IS 'Quantidade de dias adicionados nesta compra';
COMMENT ON COLUMN historico_pagamentos.tipo_compra IS 'Tipo de compra realizada (renovacao-60, renovacao-180, etc)';
COMMENT ON COLUMN historico_pagamentos.mercadopago_payment_id IS 'ID do pagamento no Mercado Pago para rastreamento';

-- ============================================================================
-- PRONTO! Agora a tabela está criada e o sistema vai funcionar!
-- ============================================================================
