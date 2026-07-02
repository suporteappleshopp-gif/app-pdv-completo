-- Inspecionar e remover TODOS os constraints CHECK da tabela vendas
-- que possam estar bloqueando forma_pagamento
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.vendas'::regclass
      AND contype = 'c'
  LOOP
    RAISE NOTICE 'Removendo constraint: %', r.conname;
    EXECUTE 'ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS "' || r.conname || '"';
  END LOOP;
END $$;
