-- Remove coluna tipo_pagamento (redundante - o correto é forma_pagamento)
-- Adicionada por engano na migration 20260620211557
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'vendas'
    AND column_name = 'tipo_pagamento'
  ) THEN
    ALTER TABLE vendas DROP COLUMN tipo_pagamento;
    RAISE NOTICE 'Coluna tipo_pagamento removida (usa forma_pagamento)';
  END IF;
END $$;

-- Reload do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';