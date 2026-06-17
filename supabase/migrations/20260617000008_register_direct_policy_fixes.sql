-- Registro: policies antigas foram removidas diretamente via pg (estavam fora do controle de migrations)
-- e substituídas por policies permissivas para anon + authenticated
-- Garantir estado final consistente

-- ITENS_NOTA_FISCAL: garantir policy permissiva existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'itens_nota_fiscal' AND policyname = 'itens_nota_all') THEN
    EXECUTE 'CREATE POLICY "itens_nota_all" ON public.itens_nota_fiscal FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- LOJAS: garantir policy permissiva existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lojas' AND policyname = 'lojas_all') THEN
    EXECUTE 'CREATE POLICY "lojas_all" ON public.lojas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- MOVIMENTACOES_ESTOQUE: garantir policy permissiva existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'movimentacoes_estoque' AND policyname = 'mov_estoque_all') THEN
    EXECUTE 'CREATE POLICY "mov_estoque_all" ON public.movimentacoes_estoque FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;
