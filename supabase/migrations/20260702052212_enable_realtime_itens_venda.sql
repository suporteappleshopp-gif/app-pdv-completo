-- Habilitar Realtime para a tabela itens_venda
ALTER TABLE public.itens_venda REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'itens_venda'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_venda;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;