-- Tornar coluna senha opcional (nullable)
ALTER TABLE public.operadores ALTER COLUMN senha DROP NOT NULL;

-- Adicionar valor padrão UUID para a coluna id (caso ainda não tenha)
ALTER TABLE public.operadores ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Recriar função handle_new_user com todos os campos necessários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.operadores (auth_user_id, nome, email, senha, ativo, suspenso, aguardando_pagamento)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NULL, -- Senha não é necessária quando usa Auth
    false,
    true,
    true
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
