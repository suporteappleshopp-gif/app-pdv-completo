-- =========================================================================
-- ADICIONAR COLUNAS PARA APROVAÇÃO DO ADMIN NO HISTÓRICO
-- Permite registrar quem aprovou e quando
-- =========================================================================

-- Adicionar colunas para aprovação do admin
ALTER TABLE historico_pagamentos
ADD COLUMN IF NOT EXISTS observacao_admin TEXT,
ADD COLUMN IF NOT EXISTS aprovado_por TEXT,
ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMP WITH TIME ZONE;

-- Comentários para documentação
COMMENT ON COLUMN historico_pagamentos.observacao_admin IS 'Observação do admin ao aprovar/recusar a solicitação';
COMMENT ON COLUMN historico_pagamentos.aprovado_por IS 'ID do admin que aprovou';
COMMENT ON COLUMN historico_pagamentos.data_aprovacao IS 'Data e hora da aprovação';

-- =========================================================================
-- FIM DA MIGRAÇÃO
-- =========================================================================
