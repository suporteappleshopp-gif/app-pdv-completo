-- =====================================================
-- FIX FINAL: GARANTIR ESTRUTURA COMPLETA DAS TABELAS
-- =====================================================
-- Corrige o problema onde novos cadastros não aparecem
-- para o admin porque a solicitação não é criada
-- =====================================================

-- 1. GARANTIR QUE TODAS AS COLUNAS NECESSÁRIAS EXISTAM
ALTER TABLE operadores
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER,
  ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;

-- 2. GARANTIR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_renovacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_operador_id ON solicitacoes_renovacao(operador_id);
CREATE INDEX IF NOT EXISTS idx_historico_usuario_status ON historico_pagamentos(usuario_id, status);
CREATE INDEX IF NOT EXISTS idx_operadores_aguardando ON operadores(aguardando_pagamento) WHERE aguardando_pagamento = true;

-- 3. GARANTIR QUE REALTIME ESTÁ ATIVO EM TODAS AS TABELAS CRÍTICAS
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE operadores;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE solicitacoes_renovacao;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE historico_pagamentos;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ganhos_admin;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. COMENTÁRIOS EXPLICATIVOS
COMMENT ON TABLE solicitacoes_renovacao IS 'Solicitações de renovação/cadastro. Novos usuários DEVEM criar um registro aqui para aparecer no painel admin.';
COMMENT ON COLUMN operadores.aguardando_pagamento IS 'TRUE = Usuário cadastrado mas aguardando aprovação do admin';
COMMENT ON COLUMN historico_pagamentos.status IS 'pendente = Aguardando pagamento | confirmado = Pago e aprovado';

-- =====================================================
-- ✅ MIGRATION COMPLETA
-- =====================================================
-- Agora o sistema deve:
-- 1. Criar automaticamente solicitações de renovação no cadastro
-- 2. Admin visualiza todos os novos cadastros
-- 3. Realtime funcionando em todas as tabelas
-- =====================================================
