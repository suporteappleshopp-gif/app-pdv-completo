-- Corrigir RLS para tabelas de estoque: permitir acesso com anon key
-- O app PDV usa anon key para todas as operações (sem Supabase Auth ativo)
-- As tabelas de estoque precisam aceitar tanto anon quanto authenticated

-- ITENS_NOTA_FISCAL: dropar policies que bloqueiam anon
DROP POLICY IF EXISTS "itens_nota_select_v2" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_insert_v2" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_update_v2" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_delete_v2" ON public.itens_nota_fiscal;

CREATE POLICY "itens_nota_select_v3" ON public.itens_nota_fiscal
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "itens_nota_insert_v3" ON public.itens_nota_fiscal
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "itens_nota_update_v3" ON public.itens_nota_fiscal
FOR UPDATE TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "itens_nota_delete_v3" ON public.itens_nota_fiscal
FOR DELETE TO anon, authenticated
USING (true);

-- NOTAS_FISCAIS: permitir anon também
DROP POLICY IF EXISTS "notas_select_v2" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_insert_v2" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_update_v2" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_delete_v2" ON public.notas_fiscais;

CREATE POLICY "notas_select_v3" ON public.notas_fiscais
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "notas_insert_v3" ON public.notas_fiscais
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "notas_update_v3" ON public.notas_fiscais
FOR UPDATE TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "notas_delete_v3" ON public.notas_fiscais
FOR DELETE TO anon, authenticated
USING (true);

-- MOVIMENTACOES_ESTOQUE: permitir anon também
DROP POLICY IF EXISTS "mov_select_v2" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_insert_v2" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_update_v2" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_delete_v2" ON public.movimentacoes_estoque;

CREATE POLICY "mov_select_v3" ON public.movimentacoes_estoque
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "mov_insert_v3" ON public.movimentacoes_estoque
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "mov_update_v3" ON public.movimentacoes_estoque
FOR UPDATE TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "mov_delete_v3" ON public.movimentacoes_estoque
FOR DELETE TO anon, authenticated
USING (true);

-- LOJAS: permitir anon também
DROP POLICY IF EXISTS "lojas_select_v2" ON public.lojas;
DROP POLICY IF EXISTS "lojas_insert_v2" ON public.lojas;
DROP POLICY IF EXISTS "lojas_update_v2" ON public.lojas;
DROP POLICY IF EXISTS "lojas_delete_v2" ON public.lojas;

CREATE POLICY "lojas_select_v3" ON public.lojas
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "lojas_insert_v3" ON public.lojas
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "lojas_update_v3" ON public.lojas
FOR UPDATE TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "lojas_delete_v3" ON public.lojas
FOR DELETE TO anon, authenticated
USING (true);

-- PRODUTOS: garantir que anon também pode operar (manter compatibilidade)
DROP POLICY IF EXISTS "produtos_select_v2" ON public.produtos;
DROP POLICY IF EXISTS "produtos_insert_v2" ON public.produtos;
DROP POLICY IF EXISTS "produtos_update_v2" ON public.produtos;
DROP POLICY IF EXISTS "produtos_delete_v2" ON public.produtos;

CREATE POLICY "produtos_select_v3" ON public.produtos
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "produtos_insert_v3" ON public.produtos
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "produtos_update_v3" ON public.produtos
FOR UPDATE TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "produtos_delete_v3" ON public.produtos
FOR DELETE TO anon, authenticated
USING (true);
