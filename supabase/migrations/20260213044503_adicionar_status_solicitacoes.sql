-- =====================================================
-- FIX URGENTE: Adicionar coluna status em solicitacoes_renovacao
-- =====================================================

-- Adicionar coluna status se não existir
ALTER TABLE solicitacoes_renovacao
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado'));

-- Adicionar outras colunas que podem estar faltando
ALTER TABLE operadores
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER,
  ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;

-- Garantir índices
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_renovacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador_id ON solicitacoes_renovacao(operador_id);
CREATE INDEX IF NOT EXISTS idx_historico_usuario_status ON historico_pagamentos(usuario_id, status);
CREATE INDEX IF NOT EXISTS idx_operadores_aguardando ON operadores(aguardando_pagamento) WHERE aguardando_pagamento = true;

-- ✅ PRONTO!
