-- CORRIGIR POLÍTICAS RLS QUE CAUSAM RECURSÃO INFINITA

-- PASSO 1: Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Users can view own profile" ON public.operadores;
DROP POLICY IF EXISTS "Users can update own profile" ON public.operadores;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.operadores;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.operadores;
DROP POLICY IF EXISTS "Service role can insert" ON public.operadores;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.operadores;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.operadores;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.operadores;
DROP POLICY IF EXISTS "Admins podem atualizar todos os perfis" ON public.operadores;
DROP POLICY IF EXISTS "Permitir inserção durante signup" ON public.operadores;

-- PASSO 2: DESABILITAR RLS temporariamente para service role
ALTER TABLE public.operadores DISABLE ROW LEVEL SECURITY;

-- PASSO 3: Reabilitar RLS
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Criar políticas SEM RECURSÃO

-- Política simples: SELECT próprio perfil
CREATE POLICY "select_own_profile"
  ON public.operadores
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Política simples: UPDATE próprio perfil
CREATE POLICY "update_own_profile"
  ON public.operadores
  FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Política simples: INSERT (permitir todos autenticados - app controla)
CREATE POLICY "insert_authenticated"
  ON public.operadores
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Política simples: DELETE próprio perfil
CREATE POLICY "delete_own_profile"
  ON public.operadores
  FOR DELETE
  USING (auth.uid() = auth_user_id);

-- PASSO 5: Permitir acesso total para service_role (usado pela aplicação)
ALTER TABLE public.operadores FORCE ROW LEVEL SECURITY;

-- Comentário
COMMENT ON TABLE public.operadores IS 'Políticas RLS corrigidas - sem recursão infinita';
