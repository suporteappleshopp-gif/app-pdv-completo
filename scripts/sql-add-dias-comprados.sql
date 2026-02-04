-- =========================================================================
-- ADICIONAR COLUNA dias_comprados NA TABELA ganhos_admin
-- Execute este SQL no Supabase SQL Editor
-- =========================================================================

-- Adicionar coluna dias_comprados
ALTER TABLE ganhos_admin
ADD COLUMN IF NOT EXISTS dias_comprados INTEGER;

-- Atualizar registros existentes baseado na forma de pagamento
UPDATE ganhos_admin
SET dias_comprados = CASE
  WHEN forma_pagamento = 'pix' AND tipo = 'mensalidade-paga' THEN 60
  WHEN forma_pagamento = 'cartao' AND tipo = 'mensalidade-paga' THEN 180
  ELSE NULL
END
WHERE dias_comprados IS NULL;

-- Comentário para documentação
COMMENT ON COLUMN ganhos_admin.dias_comprados IS 'Quantidade de dias comprados nesta renovação (60 para PIX, 100 ou 180 para cartão)';

SELECT 'Migration aplicada com sucesso!' as status;
