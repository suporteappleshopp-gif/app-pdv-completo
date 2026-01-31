-- Adicionar valor padrão UUID para a coluna id da tabela operadores
ALTER TABLE public.operadores ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Corrigir função handle_new_user para não depender de campos que podem não existir
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
