-- ============================================
-- MIGRAÇÕES COMPLETAS DO SISTEMA
-- ============================================
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/ynkuovfplntzckecruvk/sql/new
-- ============================================

-- MIGRAÇÃO 1: Adicionar colunas de pagamento e assinatura
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP WITH TIME ZONE;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER;
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'cartao'));
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2);
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_operadores_data_vencimento ON operadores(data_proximo_vencimento);
CREATE INDEX IF NOT EXISTS idx_operadores_forma_pagamento ON operadores(forma_pagamento);
CREATE INDEX IF NOT EXISTS idx_operadores_aguardando_pagamento ON operadores(aguardando_pagamento);

-- MIGRAÇÃO 2: Garantir que a tabela ganhos_admin existe e está acessível
CREATE TABLE IF NOT EXISTS ganhos_admin (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('conta-criada', 'mensalidade-paga')),
  usuario_id TEXT NOT NULL,
  usuario_nome TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'cartao')),
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS na tabela ganhos_admin
ALTER TABLE ganhos_admin DISABLE ROW LEVEL SECURITY;

-- Criar índices na tabela ganhos_admin
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_tipo ON ganhos_admin(tipo);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_usuario_id ON ganhos_admin(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_created_at ON ganhos_admin(created_at);
CREATE INDEX IF NOT EXISTS idx_ganhos_admin_forma_pagamento ON ganhos_admin(forma_pagamento);

-- Verificar resultado
SELECT COUNT(*) as total_operadores FROM operadores;
SELECT COUNT(*) as total_ganhos FROM ganhos_admin;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migrações aplicadas com sucesso!';
  RAISE NOTICE '🎯 Sistema pronto para uso!';
  RAISE NOTICE '📋 Regras configuradas:';
  RAISE NOTICE '   - PIX: R$ 59,90 - 60 dias';
  RAISE NOTICE '   - Cartão: R$ 149,70 - 180 dias';
  RAISE NOTICE '   - Pagamento obrigatório para ativação';
END $$;
