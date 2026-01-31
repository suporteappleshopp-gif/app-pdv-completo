-- Criar tabela de operadores/usuários com perfis únicos
CREATE TABLE IF NOT EXISTS public.operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT,
  is_admin BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT false,
  suspenso BOOLEAN DEFAULT false,
  aguardando_pagamento BOOLEAN DEFAULT true,
  forma_pagamento TEXT,
  valor_mensal NUMERIC(10,2),
  data_proximo_vencimento TIMESTAMPTZ,
  dias_assinatura INTEGER,
  data_pagamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_operadores_auth_user_id ON public.operadores(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_operadores_email ON public.operadores(email);
CREATE INDEX IF NOT EXISTS idx_operadores_ativo ON public.operadores(ativo);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança: usuários só podem ver e editar seus próprios dados
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.operadores
  FOR SELECT
  USING (auth.uid() = auth_user_id);

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

-- Função para criar operador automaticamente após signup
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar operador automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.operadores;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.operadores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comentários
COMMENT ON TABLE public.operadores IS 'Tabela de operadores/usuários do sistema - cada usuário tem um perfil único sincronizado em tempo real';
COMMENT ON COLUMN public.operadores.auth_user_id IS 'ID do usuário no Supabase Auth - único e imutável';
COMMENT ON COLUMN public.operadores.email IS 'Email único do usuário - não pode haver duplicatas';
