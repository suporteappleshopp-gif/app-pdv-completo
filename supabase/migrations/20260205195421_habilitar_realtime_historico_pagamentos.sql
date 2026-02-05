-- ============================================
-- HABILITAR REALTIME PARA HISTÓRICO DE PAGAMENTOS
-- ============================================
-- Garante que mudanças em historico_pagamentos sejam
-- detectadas em tempo real pelo usuário
-- ============================================

-- 1. Habilitar Realtime para historico_pagamentos
ALTER PUBLICATION supabase_realtime ADD TABLE historico_pagamentos;

-- 2. Habilitar Realtime para solicitacoes_renovacao (caso não esteja)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE solicitacoes_renovacao;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'solicitacoes_renovacao já estava no realtime';
END $$;

-- 3. Comentário
COMMENT ON TABLE historico_pagamentos IS 'Histórico de pagamentos - com realtime habilitado para atualizações instantâneas';

-- 4. Verificação
DO $$
BEGIN
    RAISE NOTICE '✅ Realtime habilitado para historico_pagamentos e solicitacoes_renovacao';
END $$;
