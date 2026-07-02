-- Remover QUALQUER constraint CHECK restante em vendas que possa bloquear
-- forma_pagamento ou status com valores válidos do sistema PDV
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'public.vendas'::regclass
      AND contype = 'c'
  LOOP
    RAISE NOTICE 'Constraint encontrado: % => %', r.conname, r.def;
    EXECUTE 'ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS "' || r.conname || '"';
  END LOOP;
END $$;

-- Garantir que forma_pagamento aceita qualquer TEXT: dinheiro, credito, debito, pix, outros, etc.
-- Não há constraint de check — o app controla os valores
ALTER TABLE public.vendas ALTER COLUMN forma_pagamento TYPE TEXT;
