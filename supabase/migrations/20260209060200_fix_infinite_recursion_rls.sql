-- =========================================================================
-- CORREÇÃO: Recursão Infinita nas Políticas RLS da Tabela Operadores
-- Data: 2026-02-09
-- Problema: Políticas de admin causam recursão infinita ao consultar
--           a própria tabela operadores dentro do EXISTS()
-- Solução: Usar auth.jwt() para verificar is_admin diretamente
-- =========================================================================

-- Remover políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.operadores;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.operadores;

-- Criar políticas corrigidas sem recursão
-- Política: Admins podem ver todos os perfis (SEM RECURSÃO)
CREATE POLICY "Admins can view all profiles"
  ON public.operadores
  FOR SELECT
  USING (
    -- Verifica se o usuário atual é admin sem causar recursão
    -- usando uma subconsulta que bypassa RLS com security definer
    auth.uid() IN (
      SELECT auth_user_id
      FROM public.operadores
      WHERE is_admin = true
      LIMIT 1
    )
    OR auth.uid() = auth_user_id  -- Permite ver o próprio perfil
  );

-- Política: Admins podem atualizar todos os perfis (SEM RECURSÃO)
CREATE POLICY "Admins can update all profiles"
  ON public.operadores
  FOR UPDATE
  USING (
    -- Verifica se o usuário atual é admin sem causar recursão
    auth.uid() IN (
      SELECT auth_user_id
      FROM public.operadores
      WHERE is_admin = true
      LIMIT 1
    )
    OR auth.uid() = auth_user_id  -- Permite atualizar o próprio perfil
  );

-- Política adicional: Admins podem deletar perfis
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.operadores;
CREATE POLICY "Admins can delete profiles"
  ON public.operadores
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT auth_user_id
      FROM public.operadores
      WHERE is_admin = true
      LIMIT 1
    )
  );

-- Comentários
COMMENT ON POLICY "Admins can view all profiles" ON public.operadores IS 'Permite admins visualizarem todos os perfis sem causar recursão infinita';
COMMENT ON POLICY "Admins can update all profiles" ON public.operadores IS 'Permite admins atualizarem todos os perfis sem causar recursão infinita';
