-- Adicionar campo para identificar solicitações de renovação pendentes
-- Usado para o admin aprovar/recusar compras de dias

-- Adicionar campo para observação do admin
ALTER TABLE historico_pagamentos
ADD COLUMN IF NOT EXISTS observacao_admin TEXT,
ADD COLUMN IF NOT EXISTS aprovado_por TEXT,
ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMP WITH TIME ZONE;

-- Criar índice para facilitar busca de pendentes
CREATE INDEX IF NOT EXISTS idx_historico_pagamentos_pendentes
ON historico_pagamentos(status)
WHERE status = 'pendente';

-- Comentários para documentação
COMMENT ON COLUMN historico_pagamentos.observacao_admin IS 'Observação do admin ao aprovar/recusar a solicitação';
COMMENT ON COLUMN historico_pagamentos.aprovado_por IS 'ID ou nome do admin que aprovou';
COMMENT ON COLUMN historico_pagamentos.data_aprovacao IS 'Data e hora da aprovação/recusa';
