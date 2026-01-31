-- Adicionar colunas de pagamento e assinatura na tabela operadores
-- Esta migração adiciona todas as colunas necessárias para o sistema de assinaturas

-- Adicionar coluna de data de próximo vencimento
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_proximo_vencimento TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna de dias de assinatura
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS dias_assinatura INTEGER;

-- Adicionar coluna de forma de pagamento
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'cartao'));

-- Adicionar coluna de valor mensal
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2);

-- Adicionar coluna de data de pagamento
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_operadores_data_vencimento ON operadores(data_proximo_vencimento);
CREATE INDEX IF NOT EXISTS idx_operadores_forma_pagamento ON operadores(forma_pagamento);
CREATE INDEX IF NOT EXISTS idx_operadores_aguardando_pagamento ON operadores(aguardando_pagamento);

-- Comentários para documentação
COMMENT ON COLUMN operadores.data_proximo_vencimento IS 'Data de vencimento da assinatura do usuário';
COMMENT ON COLUMN operadores.dias_assinatura IS 'Quantidade de dias da assinatura (60 para PIX, 180 para Cartão)';
COMMENT ON COLUMN operadores.forma_pagamento IS 'Forma de pagamento escolhida: pix (R$ 59,90 - 60 dias) ou cartao (R$ 149,70 - 180 dias)';
COMMENT ON COLUMN operadores.valor_mensal IS 'Valor da assinatura paga pelo usuário';
COMMENT ON COLUMN operadores.data_pagamento IS 'Data em que o pagamento foi confirmado';
