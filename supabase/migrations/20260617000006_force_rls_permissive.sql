-- Forçar remoção de TODAS as policies existentes e recriar como permissivas
-- Necessário porque o app PDV usa anon key sem Supabase Auth ativo

-- =============================================
-- ITENS_NOTA_FISCAL
-- =============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'itens_nota_fiscal' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.itens_nota_fiscal';
  END LOOP;
END $$;

ALTER TABLE public.itens_nota_fiscal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itens_nota_all_anon" ON public.itens_nota_fiscal
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =============================================
-- MOVIMENTACOES_ESTOQUE
-- =============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'movimentacoes_estoque' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.movimentacoes_estoque';
  END LOOP;
END $$;

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mov_estoque_all_anon" ON public.movimentacoes_estoque
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =============================================
-- NOTAS_FISCAIS
-- =============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'notas_fiscais' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.notas_fiscais';
  END LOOP;
END $$;

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas_fiscais_all_anon" ON public.notas_fiscais
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =============================================
-- LOJAS
-- =============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'lojas' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.lojas';
  END LOOP;
END $$;

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lojas_all_anon" ON public.lojas
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
