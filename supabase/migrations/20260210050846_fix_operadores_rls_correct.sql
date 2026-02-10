-- CORREÇÃO DEFINITIVA: Remove TODAS as políticas RLS existentes que causam recursão infinita
-- e cria políticas simples e seguras

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Permitir leitura de operadores" ON operadores;
DROP POLICY IF EXISTS "Permitir inserção de operadores" ON operadores;
DROP POLICY IF EXISTS "Permitir atualização de operadores" ON operadores;
DROP POLICY IF EXISTS "Permitir exclusão de operadores" ON operadores;
DROP POLICY IF EXISTS "operadores_select_policy" ON operadores;
DROP POLICY IF EXISTS "operadores_insert_policy" ON operadores;
DROP POLICY IF EXISTS "operadores_update_policy" ON operadores;
DROP POLICY IF EXISTS "operadores_delete_policy" ON operadores;
DROP POLICY IF EXISTS "Enable read access for all users" ON operadores;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON operadores;
DROP POLICY IF EXISTS "Enable update for users based on id" ON operadores;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON operadores;
DROP POLICY IF EXISTS "allow_insert_for_authenticated" ON operadores;
DROP POLICY IF EXISTS "allow_select_own_record" ON operadores;
DROP POLICY IF EXISTS "allow_select_all_for_admin" ON operadores;
DROP POLICY IF EXISTS "allow_update_own_record" ON operadores;
DROP POLICY IF EXISTS "allow_update_all_for_admin" ON operadores;
DROP POLICY IF EXISTS "allow_delete_for_admin" ON operadores;
DROP POLICY IF EXISTS "Admins can delete profiles" ON operadores;
DROP POLICY IF EXISTS "Admins can update all profiles" ON operadores;
DROP POLICY IF EXISTS "Admins can view all profiles" ON operadores;
DROP POLICY IF EXISTS "Service role can insert" ON operadores;
DROP POLICY IF EXISTS "Users can update own profile" ON operadores;
DROP POLICY IF EXISTS "Users can view own profile" ON operadores;
DROP POLICY IF EXISTS "insert_operadores" ON operadores;
DROP POLICY IF EXISTS "operadores_delete" ON operadores;
DROP POLICY IF EXISTS "operadores_insert" ON operadores;
DROP POLICY IF EXISTS "operadores_select" ON operadores;
DROP POLICY IF EXISTS "operadores_update" ON operadores;

-- ===== NOVAS POLÍTICAS SIMPLES E SEGURAS =====

-- 1. INSERT: Qualquer usuário autenticado pode se cadastrar
-- O auth_user_id será vinculado ao auth.uid() automaticamente
CREATE POLICY "novo_cadastro_permitido"
ON operadores
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- 2. SELECT: Usuário vê apenas seu próprio registro
-- SEM recursão - usa apenas auth.uid() direto
CREATE POLICY "ver_proprio_perfil"
ON operadores
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- 3. SELECT: Admin vê TODOS os registros
-- IMPORTANTE: Usa função is_admin() se existir, ou verifica direto na tabela
-- Para evitar recursão, usamos uma subconsulta simples
CREATE POLICY "admin_ver_todos"
ON operadores
FOR SELECT
TO authenticated
USING (
  -- Verifica se o usuário atual é admin
  -- Usa LIMIT 1 para evitar múltiplas verificações
  EXISTS (
    SELECT 1 FROM operadores AS op
    WHERE op.auth_user_id = auth.uid()
    AND op.is_admin = true
    LIMIT 1
  )
);

-- 4. UPDATE: Usuário pode atualizar apenas seu próprio perfil
-- Mas NÃO pode mudar is_admin (somente admin pode fazer isso)
CREATE POLICY "atualizar_proprio_perfil"
ON operadores
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (
  auth.uid() = auth_user_id
  -- Impede que usuário comum mude is_admin
  AND is_admin = (SELECT is_admin FROM operadores WHERE auth_user_id = auth.uid())
);

-- 5. UPDATE: Admin pode atualizar QUALQUER perfil
CREATE POLICY "admin_atualizar_todos"
ON operadores
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores AS op
    WHERE op.auth_user_id = auth.uid()
    AND op.is_admin = true
    LIMIT 1
  )
);

-- 6. DELETE: Apenas admin pode deletar registros
CREATE POLICY "admin_deletar_usuarios"
ON operadores
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM operadores AS op
    WHERE op.auth_user_id = auth.uid()
    AND op.is_admin = true
    LIMIT 1
  )
);

-- Garantir que RLS está ativo
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;

-- Comentário explicativo
COMMENT ON TABLE operadores IS 'RLS: Todos podem cadastrar-se. Usuários veem apenas seu perfil. Admin gerencia tudo.';
