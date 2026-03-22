-- Migration: Fix RLS - Isolamento correto por usuário (loja = login)
-- Cada operador/loja só acessa seus próprios dados

-- =============================================
-- LOJAS: user_id TEXT = operadores.id::text
-- =============================================
DROP POLICY IF EXISTS "lojas_all" ON lojas;
DROP POLICY IF EXISTS "lojas_select_proprio" ON lojas;
DROP POLICY IF EXISTS "lojas_insert_proprio" ON lojas;
DROP POLICY IF EXISTS "lojas_update_proprio" ON lojas;
DROP POLICY IF EXISTS "lojas_delete_proprio" ON lojas;

CREATE POLICY "lojas_select_proprio" ON lojas
FOR SELECT USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "lojas_insert_proprio" ON lojas
FOR INSERT WITH CHECK (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "lojas_update_proprio" ON lojas
FOR UPDATE USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "lojas_delete_proprio" ON lojas
FOR DELETE USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

-- =============================================
-- MOVIMENTACOES_ESTOQUE: user_id TEXT
-- =============================================
DROP POLICY IF EXISTS "mov_estoque_all" ON movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_select_proprio" ON movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_insert_proprio" ON movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_update_proprio" ON movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_delete_proprio" ON movimentacoes_estoque;

CREATE POLICY "mov_estoque_select_proprio" ON movimentacoes_estoque
FOR SELECT USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "mov_estoque_insert_proprio" ON movimentacoes_estoque
FOR INSERT WITH CHECK (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "mov_estoque_update_proprio" ON movimentacoes_estoque
FOR UPDATE USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "mov_estoque_delete_proprio" ON movimentacoes_estoque
FOR DELETE USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

-- =============================================
-- NOTAS_FISCAIS: user_id TEXT
-- =============================================
DROP POLICY IF EXISTS "notas_all" ON notas_fiscais;
DROP POLICY IF EXISTS "notas_select_proprio" ON notas_fiscais;
DROP POLICY IF EXISTS "notas_insert_proprio" ON notas_fiscais;
DROP POLICY IF EXISTS "notas_update_proprio" ON notas_fiscais;
DROP POLICY IF EXISTS "notas_delete_proprio" ON notas_fiscais;

CREATE POLICY "notas_select_proprio" ON notas_fiscais
FOR SELECT USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "notas_insert_proprio" ON notas_fiscais
FOR INSERT WITH CHECK (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "notas_update_proprio" ON notas_fiscais
FOR UPDATE USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "notas_delete_proprio" ON notas_fiscais
FOR DELETE USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

-- =============================================
-- ITENS_NOTA_FISCAL: user_id TEXT
-- =============================================
DROP POLICY IF EXISTS "itens_nota_all" ON itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_select_proprio" ON itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_insert_proprio" ON itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_update_proprio" ON itens_nota_fiscal;
DROP POLICY IF EXISTS "itens_nota_delete_proprio" ON itens_nota_fiscal;

CREATE POLICY "itens_nota_select_proprio" ON itens_nota_fiscal
FOR SELECT USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "itens_nota_insert_proprio" ON itens_nota_fiscal
FOR INSERT WITH CHECK (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "itens_nota_update_proprio" ON itens_nota_fiscal
FOR UPDATE USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "itens_nota_delete_proprio" ON itens_nota_fiscal
FOR DELETE USING (
  user_id = (SELECT id::text FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

-- =============================================
-- PRODUTOS: user_id UUID = operadores.id
-- =============================================
DROP POLICY IF EXISTS "produtos_all" ON produtos;
DROP POLICY IF EXISTS "public_all_produtos" ON produtos;
DROP POLICY IF EXISTS "produtos_select_proprio" ON produtos;
DROP POLICY IF EXISTS "produtos_insert_proprio" ON produtos;
DROP POLICY IF EXISTS "produtos_update_proprio" ON produtos;
DROP POLICY IF EXISTS "produtos_delete_proprio" ON produtos;

CREATE POLICY "produtos_select_proprio" ON produtos
FOR SELECT USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "produtos_insert_proprio" ON produtos
FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
);

CREATE POLICY "produtos_update_proprio" ON produtos
FOR UPDATE USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "produtos_delete_proprio" ON produtos
FOR DELETE USING (
  user_id = (SELECT id FROM operadores WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
);
