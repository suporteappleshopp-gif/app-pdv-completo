-- PASSO 1: Adicionar coluna auth_user_id
ALTER TABLE public.operadores ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- PASSO 2: Criar índice
CREATE INDEX IF NOT EXISTS idx_operadores_auth_user_id ON public.operadores(auth_user_id);

-- PASSO 3: Vincular operadores existentes com usuários auth por email
UPDATE public.operadores o
SET auth_user_id = u.id
FROM auth.users u
WHERE o.email = u.email AND o.auth_user_id IS NULL;

-- PASSO 4: Adicionar constraint UNIQUE e FOREIGN KEY
-- (Primeiro remove se já existir)
ALTER TABLE public.operadores DROP CONSTRAINT IF EXISTS operadores_auth_user_id_fkey;
ALTER TABLE public.operadores DROP CONSTRAINT IF EXISTS operadores_auth_user_id_key;

-- Adicionar constraints
ALTER TABLE public.operadores ADD CONSTRAINT operadores_auth_user_id_key UNIQUE (auth_user_id);
ALTER TABLE public.operadores ADD CONSTRAINT operadores_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- PASSO 5: Criar função para criar operador automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.operadores (auth_user_id, nome, email, ativo, suspenso, aguardando_pagamento)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    false,
    true,
    true
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 6: Criar trigger para criar operador automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASSO 7: Habilitar Row Level Security (RLS) se ainda não estiver
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

-- PASSO 8: Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.operadores;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.operadores;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.operadores;
DROP POLICY IF EXISTS "Admins podem atualizar todos os perfis" ON public.operadores;
DROP POLICY IF EXISTS "Permitir inserção durante signup" ON public.operadores;

-- PASSO 9: Criar políticas de segurança
-- Usuários podem ver seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.operadores
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.operadores
  FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Admins podem ver todos os perfis
CREATE POLICY "Admins podem ver todos os perfis"
  ON public.operadores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE auth_user_id = auth.uid() AND is_admin = true
    )
  );

-- Admins podem atualizar todos os perfis
CREATE POLICY "Admins podem atualizar todos os perfis"
  ON public.operadores
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.operadores
      WHERE auth_user_id = auth.uid() AND is_admin = true
    )
  );

-- Permitir inserção durante signup (trigger irá criar)
CREATE POLICY "Permitir inserção durante signup"
  ON public.operadores
  FOR INSERT
  WITH CHECK (true);

-- PASSO 10: Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 11: Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.operadores;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.operadores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
