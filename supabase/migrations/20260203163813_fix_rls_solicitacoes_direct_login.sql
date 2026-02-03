-- =========================================================================
-- CORRIGIR RLS PARA PERMITIR ACESSO DIRETO (SEM SUPABASE AUTH)
-- Permite que usuários acessem solicitações mesmo sem auth.uid()
-- =========================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuarios podem ver suas solicitacoes" ON public.solicitacoes_renovacao;
DROP POLICY IF EXISTS "Admins podem ver todas solicitacoes" ON public.solicitacoes_renovacao;
DROP POLICY IF EXISTS "Usuarios podem criar solicitacoes" ON public.solicitacoes_renovacao;
DROP POLICY IF EXISTS "Admins podem atualizar solicitacoes" ON public.solicitacoes_renovacao;

-- =========================================================================
-- POLÍTICAS RLS CORRIGIDAS - Aceita login direto e via Auth
-- =========================================================================

-- Política 1: Permitir SELECT para todos (sem restrição de RLS)
-- O controle de acesso será feito na aplicação
CREATE POLICY "Permitir leitura de solicitacoes"
  ON public.solicitacoes_renovacao
  FOR SELECT
  USING (true);

-- Política 2: Permitir INSERT para todos
CREATE POLICY "Permitir criacao de solicitacoes"
  ON public.solicitacoes_renovacao
  FOR INSERT
  WITH CHECK (true);

-- Política 3: Permitir UPDATE para todos (admins controlam na aplicação)
CREATE POLICY "Permitir atualizacao de solicitacoes"
  ON public.solicitacoes_renovacao
  FOR UPDATE
  USING (true);

-- =========================================================================
-- FIM DA MIGRAÇÃO
-- =========================================================================
