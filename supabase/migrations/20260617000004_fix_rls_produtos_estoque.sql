-- Corrigir RLS da tabela produtos para funcionar com o sistema de autenticação do app
-- O app usa Supabase Auth e passa o user_id do operador nas queries
-- A policy deve aceitar tanto autenticados (via auth.uid()) quanto verificar por user_id direto

-- Remover policies antigas que podem estar causando conflito
DROP POLICY IF EXISTS "produtos_insert_proprio" ON public.produtos;
DROP POLICY IF EXISTS "produtos_select_proprio" ON public.produtos;
DROP POLICY IF EXISTS "produtos_update_proprio" ON public.produtos;
DROP POLICY IF EXISTS "produtos_delete_proprio" ON public.produtos;
DROP POLICY IF EXISTS "Operadores podem ver seus produtos" ON public.produtos;
DROP POLICY IF EXISTS "Operadores podem inserir produtos" ON public.produtos;
DROP POLICY IF EXISTS "Operadores podem atualizar seus produtos" ON public.produtos;
DROP POLICY IF EXISTS "Operadores podem deletar seus produtos" ON public.produtos;
DROP POLICY IF EXISTS "public_all_produtos" ON public.produtos;
DROP POLICY IF EXISTS "produtos_all" ON public.produtos;

-- Habilitar RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Policy permissiva: usuário autenticado pode ver/manipular seus próprios produtos
-- Aceita tanto auth.uid() via Supabase Auth quanto acesso direto por user_id
CREATE POLICY "produtos_select_v2" ON public.produtos
FOR SELECT TO authenticated
USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "produtos_insert_v2" ON public.produtos
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "produtos_update_v2" ON public.produtos
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "produtos_delete_v2" ON public.produtos
FOR DELETE TO authenticated
USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

-- Também fazer o mesmo para lojas, notas_fiscais, itens_nota_fiscal, movimentacoes_estoque
-- (garantir que as policies existam corretamente)

-- LOJAS
DROP POLICY IF EXISTS "lojas_select_proprio" ON public.lojas;
DROP POLICY IF EXISTS "lojas_insert_proprio" ON public.lojas;
DROP POLICY IF EXISTS "lojas_update_proprio" ON public.lojas;
DROP POLICY IF EXISTS "lojas_delete_proprio" ON public.lojas;

CREATE POLICY "lojas_select_v2" ON public.lojas
FOR SELECT TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "lojas_insert_v2" ON public.lojas
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "lojas_update_v2" ON public.lojas
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "lojas_delete_v2" ON public.lojas
FOR DELETE TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

-- NOTAS_FISCAIS
DROP POLICY IF EXISTS "notas_select_proprio" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_insert_proprio" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_update_proprio" ON public.notas_fiscais;
DROP POLICY IF EXISTS "notas_delete_proprio" ON public.notas_fiscais;

CREATE POLICY "notas_select_v2" ON public.notas_fiscais
FOR SELECT TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "notas_insert_v2" ON public.notas_fiscais
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "notas_update_v2" ON public.notas_fiscais
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "notas_delete_v2" ON public.notas_fiscais
FOR DELETE TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

-- ITENS_NOTA_FISCAL
DROP POLICY IF EXISTS "itens_nota_select_proprio" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_insert_proprio" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_update_proprio" ON public.itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_delete_proprio" ON public.itens_nota_fiscal;

CREATE POLICY "itens_nota_select_v2" ON public.itens_nota_fiscal
FOR SELECT TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "itens_nota_insert_v2" ON public.itens_nota_fiscal
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "itens_nota_update_v2" ON public.itens_nota_fiscal
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "itens_nota_delete_v2" ON public.itens_nota_fiscal
FOR DELETE TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

-- MOVIMENTACOES_ESTOQUE
DROP POLICY IF EXISTS "mov_estoque_select_proprio" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_insert_proprio" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_update_proprio" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_delete_proprio" ON public.movimentacoes_estoque;

CREATE POLICY "mov_select_v2" ON public.movimentacoes_estoque
FOR SELECT TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "mov_insert_v2" ON public.movimentacoes_estoque
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "mov_update_v2" ON public.movimentacoes_estoque
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "mov_delete_v2" ON public.movimentacoes_estoque
FOR DELETE TO authenticated
USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);
