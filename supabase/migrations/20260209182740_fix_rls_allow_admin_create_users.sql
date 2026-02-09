-- ============================================
-- CORRIGIR RLS: Permitir inserção de operadores
-- ============================================

-- Remover política antiga de inserção se existir
DROP POLICY IF EXISTS "Permitir inserção de novos operadores" ON operadores;
DROP POLICY IF EXISTS "Permitir inserção durante signup" ON operadores;
DROP POLICY IF EXISTS "Admins podem inserir operadores" ON operadores;

-- Criar política que permite inserção SEMPRE
-- Isso é necessário para:
-- 1. Admin criar usuários via painel (sem auth)
-- 2. Trigger criar operador automaticamente após signup no Auth
-- 3. Auto-cadastro de usuários
CREATE POLICY "Permitir todas inserções operadores"
  ON operadores
  FOR INSERT
  WITH CHECK (true);

-- Garantir que admins podem fazer tudo
DROP POLICY IF EXISTS "insert_operadores_admin" ON operadores;
CREATE POLICY "insert_operadores_admin"
  ON operadores
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL -- Permite sem auth (para admin criar diretamente)
    OR EXISTS (SELECT 1 FROM operadores WHERE auth_user_id = auth.uid() AND is_admin = true)
  );
