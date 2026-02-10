-- =====================================================
-- 🔧 CORREÇÃO DE POLÍTICAS RLS PARA PERMITIR CADASTRO PÚBLICO
-- =====================================================
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/project/yzjrkcampafzfjwtatfa/editor
-- 2. Vá em "SQL Editor" no menu lateral
-- 3. Cole TODO este código na janela
-- 4. Clique em "Run" ou pressione Ctrl+Enter
-- =====================================================

-- PASSO 1: Remover políticas antigas que bloqueiam INSERT público
DROP POLICY IF EXISTS "allow_select_operadores" ON operadores;
DROP POLICY IF EXISTS "allow_insert_operadores" ON operadores;
DROP POLICY IF EXISTS "allow_update_operadores" ON operadores;
DROP POLICY IF EXISTS "allow_delete_operadores" ON operadores;

-- PASSO 2: Criar políticas PÚBLICAS (sem autenticação necessária)
-- Permitir SELECT para todos
CREATE POLICY "public_select_operadores" ON operadores
  FOR SELECT
  USING (true);

-- Permitir INSERT para todos (CADASTRO PÚBLICO)
CREATE POLICY "public_insert_operadores" ON operadores
  FOR INSERT
  WITH CHECK (true);

-- Permitir UPDATE para todos
CREATE POLICY "public_update_operadores" ON operadores
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Permitir DELETE para todos
CREATE POLICY "public_delete_operadores" ON operadores
  FOR DELETE
  USING (true);

-- PASSO 3: Garantir permissões para usuários anônimos e autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON operadores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON operadores TO authenticated;

-- PASSO 4: Aplicar mesmas políticas em outras tabelas relacionadas
-- Tabela: produtos
DROP POLICY IF EXISTS "allow_all_produtos" ON produtos;
CREATE POLICY "public_all_produtos" ON produtos
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON produtos TO authenticated;

-- Tabela: vendas
DROP POLICY IF EXISTS "allow_all_vendas" ON vendas;
CREATE POLICY "public_all_vendas" ON vendas
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON vendas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON vendas TO authenticated;

-- Tabela: solicitacoes_renovacao
DROP POLICY IF EXISTS "allow_all_solicitacoes" ON solicitacoes_renovacao;
CREATE POLICY "public_all_solicitacoes" ON solicitacoes_renovacao
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON solicitacoes_renovacao TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON solicitacoes_renovacao TO authenticated;

-- Tabela: ganhos_admin
DROP POLICY IF EXISTS "allow_all_ganhos" ON ganhos_admin;
CREATE POLICY "public_all_ganhos" ON ganhos_admin
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON ganhos_admin TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ganhos_admin TO authenticated;

-- =====================================================
-- ✅ PRONTO! Agora o cadastro público deve funcionar
-- =====================================================
