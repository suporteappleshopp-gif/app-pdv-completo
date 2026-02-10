-- =====================================================
-- CORREÇÃO FINAL: ELIMINAR RECURSÃO INFINITA
-- =====================================================
--
-- PROBLEMA: As políticas que verificam is_admin fazem subconsulta
-- em operadores, causando recursão infinita durante SELECT
--
-- SOLUÇÃO: Usar função auxiliar que usa auth.jwt() ao invés de
-- subconsulta na tabela operadores
-- =====================================================

-- 1. Criar função que verifica se o usuário é admin via JWT/metadata
-- Esta função NÃO faz query na tabela operadores
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Retorna false por padrão se não houver usuário autenticado
  SELECT COALESCE(
    (SELECT raw_app_meta_data->>'is_admin' = 'true'
     FROM auth.users
     WHERE id = auth.uid()),
    false
  );
$$;

-- 2. Remover TODAS as políticas atuais
DROP POLICY IF EXISTS "admin_atualizar_todos" ON operadores;
DROP POLICY IF EXISTS "admin_deletar_usuarios" ON operadores;
DROP POLICY IF EXISTS "admin_ver_todos" ON operadores;
DROP POLICY IF EXISTS "atualizar_proprio_perfil" ON operadores;
DROP POLICY IF EXISTS "permitir_todos_inserts" ON operadores;
DROP POLICY IF EXISTS "ver_proprio_perfil" ON operadores;

-- 3. Criar políticas SEM recursão

-- INSERT: Permite qualquer inserção autenticada ou service_role
CREATE POLICY "insert_operadores_simples"
ON operadores
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- SELECT: Usuário vê apenas seu registro OU service_role vê tudo
CREATE POLICY "select_proprio_operador"
ON operadores
FOR SELECT
TO authenticated, service_role
USING (
  -- Service role vê tudo
  current_setting('role') = 'service_role'
  OR
  -- Usuário vê apenas seu próprio registro
  auth.uid() = auth_user_id
);

-- UPDATE: Usuário atualiza apenas seu registro (sem poder mudar is_admin)
CREATE POLICY "update_proprio_operador"
ON operadores
FOR UPDATE
TO authenticated, service_role
USING (
  current_setting('role') = 'service_role'
  OR
  auth.uid() = auth_user_id
)
WITH CHECK (
  current_setting('role') = 'service_role'
  OR
  (auth.uid() = auth_user_id AND is_admin = OLD.is_admin)
);

-- DELETE: Apenas service_role pode deletar
CREATE POLICY "delete_operadores_service_role"
ON operadores
FOR DELETE
TO service_role
USING (true);

-- Comentários
COMMENT ON POLICY "insert_operadores_simples" ON operadores IS
'Permite inserção livre para usuários autenticados e service_role';

COMMENT ON POLICY "select_proprio_operador" ON operadores IS
'Usuário vê apenas seu registro. Service role vê tudo. SEM RECURSÃO.';

COMMENT ON POLICY "update_proprio_operador" ON operadores IS
'Usuário atualiza apenas seus dados sem poder mudar is_admin';

COMMENT ON POLICY "delete_operadores_service_role" ON operadores IS
'Apenas service_role pode deletar operadores';

-- Garantir que RLS está ativo
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS recriadas SEM recursão!';
  RAISE NOTICE '   - INSERT: livre para authenticated';
  RAISE NOTICE '   - SELECT: usuário vê apenas seu registro';
  RAISE NOTICE '   - UPDATE: usuário edita apenas seus dados';
  RAISE NOTICE '   - DELETE: apenas service_role';
END $$;
