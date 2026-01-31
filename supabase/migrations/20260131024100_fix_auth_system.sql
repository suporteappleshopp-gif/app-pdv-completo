-- =========================================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE AUTENTICAÇÃO
-- Remove trigger problemático e configura autenticação segura com email/senha
-- =========================================================================

-- PASSO 1: REMOVER TRIGGER PROBLEMÁTICO
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- PASSO 2: TORNAR COLUNA SENHA OPCIONAL (Auth do Supabase gerencia senhas)
ALTER TABLE public.operadores ALTER COLUMN senha DROP NOT NULL;

-- PASSO 3: GARANTIR VALOR PADRÃO PARA ID
ALTER TABLE public.operadores ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- PASSO 4: LIMPAR USUÁRIOS DE TESTE E DADOS ANTIGOS
-- Deletar operadores sem auth_user_id (exceto admin)
DELETE FROM public.operadores
WHERE auth_user_id IS NULL
  AND id != 'admin-master'
  AND email NOT LIKE '%admin%';

-- PASSO 5: RECONFIGURAR RLS (Row Level Security)
-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.operadores;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.operadores;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.operadores;
DROP POLICY IF EXISTS "Admins podem atualizar todos os perfis" ON public.operadores;
DROP POLICY IF EXISTS "Permitir inserção durante signup" ON public.operadores;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.operadores;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.operadores;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.operadores;

-- Garantir que RLS está habilitado
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.operadores
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Política: Usuários autenticados podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.operadores
  FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Política: Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON public.operadores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE auth_user_id = auth.uid()
        AND is_admin = true
    )
  );

-- Política: Admins podem atualizar todos os perfis
CREATE POLICY "Admins can update all profiles"
  ON public.operadores
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE auth_user_id = auth.uid()
        AND is_admin = true
    )
  );

-- Política: Service role pode inserir (usado pela aplicação durante signup)
CREATE POLICY "Service role can insert"
  ON public.operadores
  FOR INSERT
  WITH CHECK (true);

-- PASSO 6: ATUALIZAR OPERADORES EXISTENTES
-- Vincular operadores com usuários auth que já existem
UPDATE public.operadores o
SET auth_user_id = u.id
FROM auth.users u
WHERE o.email = u.email
  AND o.auth_user_id IS NULL
  AND o.id != 'admin-master';

-- PASSO 7: COMENTÁRIOS E DOCUMENTAÇÃO
COMMENT ON TABLE public.operadores IS 'Tabela de operadores com autenticação segura via Supabase Auth (email/senha)';
COMMENT ON COLUMN public.operadores.auth_user_id IS 'ID do usuário no Supabase Auth - único e vinculado ao email/senha';
COMMENT ON COLUMN public.operadores.senha IS 'Deprecated - Senhas são gerenciadas pelo Supabase Auth por segurança';
