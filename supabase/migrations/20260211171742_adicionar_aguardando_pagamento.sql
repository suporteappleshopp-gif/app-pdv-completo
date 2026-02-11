-- Migration: Adicionar coluna aguardando_pagamento na tabela operadores
-- Esta coluna indica se o operador está aguardando aprovação de pagamento

-- Adicionar a coluna aguardando_pagamento (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'operadores'
    AND column_name = 'aguardando_pagamento'
  ) THEN
    ALTER TABLE operadores
    ADD COLUMN aguardando_pagamento BOOLEAN DEFAULT false;

    -- Atualizar operadores suspensos para aguardando_pagamento = true
    UPDATE operadores
    SET aguardando_pagamento = true
    WHERE suspenso = true;

    RAISE NOTICE 'Coluna aguardando_pagamento adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna aguardando_pagamento já existe';
  END IF;
END $$;
