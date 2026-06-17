-- Drop policies pelo nome exato identificado via pg_policies
-- Estas policies antigas estão bloqueando anon key (roles {public} exigem auth.uid())

-- ITENS_NOTA_FISCAL
DROP POLICY IF EXISTS "itens_nota_delete_proprio" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_insert_proprio" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_select_proprio" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_update_proprio" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_all_anon" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_select_v3" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_insert_v3" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_update_v3" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_delete_v3" ON public.itens_nota_fiscal;

CREATE POLICY "itens_nota_all" ON public.itens_nota_fiscal
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- MOVIMENTACOES_ESTOQUE
DROP POLICY IF EXISTS "mov_estoque_delete_proprio" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_insert_proprio" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_select_proprio" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_update_proprio" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_all_anon" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_select_v3" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_insert_v3" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_update_v3" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_delete_v3" ON public.movimentacoes_estoque;

CREATE POLICY "mov_estoque_all" ON public.movimentacoes_estoque
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- LOJAS
DROP POLICY IF EXISTS "lojas_delete_proprio" ON public.lojas;
DROP POLICY IF EXISTS "lojas_insert_proprio" ON public.lojas;
DROP POLICY IF EXISTS "lojas_select_proprio" ON public.lojas;
DROP POLICY IF EXISTS "lojas_update_proprio" ON public.lojas;
DROP POLICY IF EXISTS "lojas_all_anon" ON public.lojas;
DROP POLICY IF EXISTS "lojas_select_v3" ON public.lojas;
DROP POLICY IF EXISTS "lojas_insert_v3" ON public.lojas;
DROP POLICY IF EXISTS "lojas_update_v3" ON public.lojas;
DROP POLICY IF EXISTS "lojas_delete_v3" ON public.lojas;

CREATE POLICY "lojas_all" ON public.lojas
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
