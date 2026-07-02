-- Listar todos os constraints atuais em vendas para diagnóstico
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'public.vendas'::regclass
  LOOP
    RAISE NOTICE 'CONSTRAINT vendas: type=% name=% def=%', r.contype, r.conname, r.def;
  END LOOP;

  -- Se não encontrou nenhum constraint check, registrar
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.vendas'::regclass AND contype = 'c'
  ) THEN
    RAISE NOTICE 'NENHUM constraint CHECK encontrado em vendas';
  END IF;
END $$;
