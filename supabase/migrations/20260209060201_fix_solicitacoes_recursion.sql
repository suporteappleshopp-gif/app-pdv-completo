-- =========================================================================
-- CORREÇÃO: Recursão Infinita nas Políticas RLS de Solicitações de Renovação
-- Data: 2026-02-09
-- Problema: Políticas causam recursão ao consultar tabela operadores
-- Solução: Usar auth.uid() diretamente evitando subconsultas recursivas
-- =========================================================================

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "Usuarios podem ver suas solicitacoes" ON public.solicitacoes_renovacao;
DROP POLICY IF EXISTS "Admins podem ver todas solicitacoes" ON public.solicitacoes_renovacao;
DROP POLICY IF EXISTS "Usuarios podem criar solicitacoes" ON public.solicitacoes_renovacao;
DROP POLICY IF EXISTS "Admins podem atualizar solicitacoes" ON public.solicitacoes_renovacao;

-- Política 1: Usuários podem ver apenas suas próprias solicitações (SEM RECURSÃO)
CREATE POLICY "Usuarios podem ver suas solicitacoes"
  ON public.solicitacoes_renovacao
  FOR SELECT
  USING (
    operador_id IN (
      SELECT id FROM public.operadores
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Política 2: Admins podem ver todas as solicitações (SEM RECURSÃO)
CREATE POLICY "Admins podem ver todas solicitacoes"
  ON public.solicitacoes_renovacao
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM public.operadores
      WHERE is_admin = true
      LIMIT 1
    )
  );

-- Política 3: Usuários podem criar suas próprias solicitações (SEM RECURSÃO)
CREATE POLICY "Usuarios podem criar solicitacoes"
  ON public.solicitacoes_renovacao
  FOR INSERT
  WITH CHECK (
    operador_id IN (
      SELECT id FROM public.operadores
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Política 4: Apenas admins podem atualizar solicitações (SEM RECURSÃO)
CREATE POLICY "Admins podem atualizar solicitacoes"
  ON public.solicitacoes_renovacao
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM public.operadores
      WHERE is_admin = true
      LIMIT 1
    )
  );

-- Comentários
COMMENT ON POLICY "Usuarios podem ver suas solicitacoes" ON public.solicitacoes_renovacao IS 'Permite usuários verem apenas suas solicitações sem recursão';
COMMENT ON POLICY "Admins podem ver todas solicitacoes" ON public.solicitacoes_renovacao IS 'Permite admins verem todas solicitações sem recursão';
COMMENT ON POLICY "Usuarios podem criar solicitacoes" ON public.solicitacoes_renovacao IS 'Permite usuários criarem solicitações sem recursão';
COMMENT ON POLICY "Admins podem atualizar solicitacoes" ON public.solicitacoes_renovacao IS 'Permite admins atualizarem solicitações sem recursão';
