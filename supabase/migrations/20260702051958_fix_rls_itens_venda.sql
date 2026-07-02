-- Corrigir RLS da tabela itens_venda
-- O app PDV usa anon key sem Supabase Auth, então precisa de policy permissiva

-- Remover TODAS as policies existentes em itens_venda
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'itens_venda' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.itens_venda';
  END LOOP;
END $$;

-- Garantir que RLS está habilitado
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

-- Criar policy permissiva para anon e authenticated
CREATE POLICY "itens_venda_all" ON public.itens_venda
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Garantir coluna codigo_barras existe (adicionada depois da criação original)
ALTER TABLE public.itens_venda ADD COLUMN IF NOT EXISTS codigo_barras TEXT;